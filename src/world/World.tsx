"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AreaId, TeleportTarget, WorldHandle, Zone } from "./engine";
import type { CV, District, DistrictId, Exhibit, ExhibitStatus } from "@/content/types";
import { STATUS_LABEL } from "@/content/types";
import "./world.css";

type Panel = { kind: "exhibit"; exhibit: Exhibit } | { kind: "cv" } | { kind: "contact" } | { kind: "pitch" } | { kind: "map" } | null;

type Props = {
  exhibits: Exhibit[];
  districts: District[];
  cv: CV;
  /** maps "/work/x.jpg" to wherever the file is served from */
  resolveAsset?: (path: string) => string;
  /** link to the printable CV page; hidden when empty */
  cvHref?: string;
};

const isCoarse = () => typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches;
const INTRO_KEY = "joelverse-intro-seen";

export default function World({ exhibits, districts, cv, resolveAsset, cvHref = "/cv" }: Props) {
  const asset = useCallback((p: string) => (resolveAsset ? resolveAsset(p) : p), [resolveAsset]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const bigMapRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<WorldHandle | null>(null);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [loaderGone, setLoaderGone] = useState(false);
  const [zone, setZone] = useState<Zone | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [portfolio, setPortfolio] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [touch, setTouchMode] = useState(false);
  const [intro, setIntro] = useState(false);
  const [webglError, setWebglError] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<Panel>(null);
  panelRef.current = panel;

  const districtById = useMemo(() => Object.fromEntries(districts.map((d) => [d.id, d])) as Record<DistrictId, District>, [districts]);
  const skillTools = useMemo(() => cv.skills[0]?.items.map((t) => t.replace("Adobe ", "")) ?? [], [cv.skills]);

  const showToast = useCallback((t: string) => {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const openZone = useCallback(
    (z: Zone) => {
      if (z.type === "exhibit") {
        const e = exhibits.find((x) => x.slug === z.slug);
        if (e) setPanel({ kind: "exhibit", exhibit: e });
      } else setPanel({ kind: z.type });
    },
    [exhibits],
  );

  const onDistrict = useCallback(
    (a: AreaId | null) => {
      if (!a || a === "start" || a === "pitch") return;
      const d = districtById[a];
      if (d) showToast(`Entering ${d.name}`);
    },
    [districtById, showToast],
  );

  /* mount the 3D world -------------------------------------------- */
  useEffect(() => {
    const prefsFrame = requestAnimationFrame(() => {
      setTouchMode(isCoarse());
      try {
        setMuted(localStorage.getItem("joel-world-muted") === "1");
      } catch {
        /* ignore */
      }
    });
    let disposed = false;
    let handle: WorldHandle | null = null;
    (async () => {
      const { createWorld } = await import("./engine");
      if (disposed || !canvasRef.current) return;
      try {
        handle = createWorld(canvasRef.current, {
          exhibits: exhibits.map((e) => ({
            slug: e.slug,
            title: e.title,
            subtitle: e.sector || STATUS_LABEL[e.status],
            district: e.district,
            image: e.board || e.cover || undefined,
          })),
          districts: districts.map((d) => ({ id: d.id, name: d.name, color: d.color })),
          tools: skillTools,
          resolveAsset: asset,
          minimap: minimapRef.current,
          onProgress: setProgress,
          onReady: () => setReady(true),
          onZone: setZone,
          onActivate: openZone,
          onToast: showToast,
          onDistrict,
        });
        worldRef.current = handle;
      } catch (err) {
        console.error(err);
        setWebglError(true);
        setReady(true);
      }
    })();
    return () => {
      disposed = true;
      cancelAnimationFrame(prefsFrame);
      handle?.destroy();
      worldRef.current = null;
    };
  }, [exhibits, districts, skillTools, asset, openZone, showToast, onDistrict]);

  useEffect(() => {
    worldRef.current?.setPaused(!!panel || !started || portfolio || intro);
  }, [panel, started, portfolio, intro]);

  useEffect(() => {
    if (panel?.kind === "map" && bigMapRef.current) worldRef.current?.drawMap(bigMapRef.current, { labels: true });
  }, [panel]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (panelRef.current) setPanel(null);
        else setIntro(false);
      }
      if (e.key === "Enter" && !panelRef.current && !started && ready) begin();
      if ((e.key === "m" || e.key === "M") && started && !panelRef.current && !portfolio) setPanel({ kind: "map" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function begin() {
    if (webglError) {
      openPortfolio();
      return;
    }
    worldRef.current?.start();
    setStarted(true);
    setTimeout(() => setLoaderGone(true), 900);
    let seen = false;
    try {
      seen = localStorage.getItem(INTRO_KEY) === "1";
    } catch {
      /* ignore */
    }
    if (!seen) setTimeout(() => setIntro(true), 1300);
  }

  function closeIntro() {
    setIntro(false);
    try {
      localStorage.setItem(INTRO_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  function openPortfolio() {
    setStarted(true);
    setLoaderGone(true);
    setPanel(null);
    setPortfolio(true);
  }

  function backToRide() {
    setPortfolio(false);
    setPanel(null);
    worldRef.current?.start();
  }

  function toggleMute() {
    const m = !muted;
    setMuted(m);
    worldRef.current?.setMuted(m);
  }

  function go(t: TeleportTarget) {
    worldRef.current?.teleport(t);
    setPanel(null);
    setPortfolio(false);
  }

  /* floating joystick (touch) ------------------------------------- */
  const joy = useRef<{ id: number; ox: number; oy: number } | null>(null);
  const [joyUi, setJoyUi] = useState<{ ox: number; oy: number; x: number; y: number } | null>(null);
  const JOY_R = 56;

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse" || !started || panel || portfolio) return;
    if (joy.current) return;
    joy.current = { id: e.pointerId, ox: e.clientX, oy: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setJoyUi({ ox: e.clientX, oy: e.clientY, x: 0, y: 0 });
    worldRef.current?.setTouch({ x: 0, y: 0, active: true });
  }
  function onPointerMove(e: React.PointerEvent) {
    const j = joy.current;
    if (!j || j.id !== e.pointerId) return;
    let dx = e.clientX - j.ox;
    let dy = e.clientY - j.oy;
    const d = Math.hypot(dx, dy);
    if (d > JOY_R) {
      dx = (dx / d) * JOY_R;
      dy = (dy / d) * JOY_R;
    }
    setJoyUi({ ox: j.ox, oy: j.oy, x: dx, y: dy });
    worldRef.current?.setTouch({ x: dx / JOY_R, y: dy / JOY_R, active: true });
  }
  function onPointerUp(e: React.PointerEvent) {
    const j = joy.current;
    if (!j || j.id !== e.pointerId) return;
    joy.current = null;
    setJoyUi(null);
    worldRef.current?.setTouch({ x: 0, y: 0, active: false });
  }

  const zoneKicker = (z: Zone) => {
    if (z.type === "exhibit") return z.district ? districtById[z.district]?.name ?? "Project" : "Project";
    if (z.type === "pitch") return "Mini game";
    return z.title;
  };
  const zoneTitle = (z: Zone) => (z.type === "exhibit" ? z.title : z.subtitle);
  const zoneColor = (z: Zone) => (z.district ? districtById[z.district]?.color : undefined);

  /* render -------------------------------------------------------- */
  return (
    <div className="jw-root">
      <canvas
        ref={canvasRef}
        className="jw-canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label="JOELVERSE: a 3D world where you ride a boda boda through Joel Butala's work"
      />

      {joyUi && (
        <div className="jw-joy" style={{ left: joyUi.ox, top: joyUi.oy }}>
          <div className="jw-joy-knob" style={{ transform: `translate(${joyUi.x}px, ${joyUi.y}px)` }} />
        </div>
      )}

      {/* HUD */}
      <div className={`jw-hud ${started && !portfolio ? "is-on" : ""}`}>
        <header className="jw-hud-top">
          <button className="jw-brand" onClick={() => setPanel({ kind: "cv" })}>
            <span className="jw-brand-name">{cv.name}</span>
            <span className="jw-brand-role">Creative · Marketing · Technology</span>
          </button>
          <div className="jw-hud-actions">
            <button className="jw-icon-btn" onClick={openPortfolio} aria-label="Switch to portfolio mode">
              <ListIcon />
              <span className="jw-hide-sm">Portfolio mode</span>
            </button>
            <button className="jw-icon-btn" onClick={() => setPanel({ kind: "map" })} aria-label="Open the map">
              <MapIcon />
              <span className="jw-hide-sm">Map</span>
            </button>
            <button className="jw-icon-btn" onClick={toggleMute} aria-label={muted ? "Unmute sound" : "Mute sound"}>
              {muted ? <MuteIcon /> : <SoundIcon />}
            </button>
          </div>
        </header>

        <button className="jw-minimap" onClick={() => setPanel({ kind: "map" })} aria-label="Open the full map">
          <canvas ref={minimapRef} />
        </button>

        {!touch && !panel && <div className="jw-keys">WASD / arrows · Shift boost · Space brake · H hoot · M map · R reset</div>}

        {touch && !panel && (
          <div className="jw-touch-btns">
            <button
              className="jw-round jw-boost"
              onPointerDown={(e) => {
                e.stopPropagation();
                worldRef.current?.setBoost(true);
              }}
              onPointerUp={() => worldRef.current?.setBoost(false)}
              onPointerCancel={() => worldRef.current?.setBoost(false)}
              onPointerLeave={() => worldRef.current?.setBoost(false)}
              aria-label="Boost"
            >
              ⚡
            </button>
            <button
              className="jw-round"
              onPointerDown={(e) => {
                e.stopPropagation();
                worldRef.current?.horn();
              }}
              aria-label="Hoot the horn"
            >
              📯
            </button>
          </div>
        )}

        {zone && !panel && started && !portfolio && (
          <button className="jw-prompt" onClick={() => openZone(zone)} style={zoneColor(zone) ? ({ "--zc": zoneColor(zone) } as React.CSSProperties) : undefined}>
            <span className="jw-prompt-kicker">{zoneKicker(zone)}</span>
            <span className="jw-prompt-title">{zoneTitle(zone)}</span>
            <span className="jw-prompt-cta">{touch ? "Tap to open" : "Press Enter ↵"}</span>
          </button>
        )}
      </div>

      {toast && <div className="jw-toast">{toast}</div>}

      {/* first-time instructions */}
      {intro && !panel && !portfolio && (
        <div className="jw-modal jw-center" role="dialog" aria-modal="true" onClick={closeIntro}>
          <div className="jw-intro" onClick={(e) => e.stopPropagation()}>
            <p className="jw-kicker">How to explore</p>
            <h2 className="jw-h2">Welcome to JOELVERSE</h2>
            <ol className="jw-steps">
              <li>
                <b>{touch ? "Drag anywhere" : "Use WASD or the arrow keys"}</b> to ride the boda. {touch ? "Hold ⚡ to go faster." : "Hold Shift to go faster."}
              </li>
              <li>
                <b>Ride onto a glowing circle</b> to open a project, my CV or my contacts.
              </li>
              <li>
                <b>In a hurry?</b> Open <b>Map</b> to jump anywhere, or <b>Portfolio mode</b> for a normal page.
              </li>
            </ol>
            <div className="jw-row">
              <button className="jw-start" onClick={closeIntro}>
                Let&apos;s ride
              </button>
              <button className="jw-link jw-link-dark" onClick={() => { closeIntro(); setPanel({ kind: "cv" }); }}>
                See my CV first
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loader */}
      {!loaderGone && (
        <div className={`jw-loader ${started ? "is-leaving" : ""}`}>
          <div className="jw-loader-inner">
            <p className="jw-kicker">JOELVERSE · {cv.location}</p>
            <h1 className="jw-loader-title">{cv.name}</h1>
            <p className="jw-loader-sub">{cv.identity}. Ride a boda boda through a tiny Kampala to see my work, or open the classic portfolio.</p>
            <div className="jw-bar" aria-hidden>
              <div className="jw-bar-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <div className="jw-row">
              <button className="jw-start" disabled={!ready} onClick={begin}>
                {ready ? (webglError ? "View my portfolio" : "Start the engine") : `Loading ${Math.round(progress * 100)}%`}
              </button>
              <button className="jw-ghost" onClick={openPortfolio}>
                Portfolio mode
              </button>
            </div>
            <p className="jw-hint">{touch ? "Drag anywhere to steer · sound on" : "Keyboard: WASD or arrows · sound on"}</p>
          </div>
        </div>
      )}

      {/* Portfolio mode */}
      {portfolio && (
        <PortfolioMode
          cv={cv}
          exhibits={exhibits}
          districts={districts}
          asset={asset}
          cvHref={cvHref}
          canRide={!webglError}
          onRide={backToRide}
          onOpen={(e) => setPanel({ kind: "exhibit", exhibit: e })}
        />
      )}

      {/* Panels */}
      {panel && (
        <div className="jw-modal" role="dialog" aria-modal="true" onClick={() => setPanel(null)}>
          <div className="jw-sheet" onClick={(e) => e.stopPropagation()}>
            <button className="jw-close" onClick={() => setPanel(null)} aria-label="Close">
              ✕
            </button>
            {panel.kind === "exhibit" && <ExhibitView exhibit={panel.exhibit} district={districtById[panel.exhibit.district]} asset={asset} />}
            {panel.kind === "cv" && <CVView cv={cv} asset={asset} cvHref={cvHref} onContact={() => setPanel({ kind: "contact" })} />}
            {panel.kind === "contact" && <ContactView cv={cv} />}
            {panel.kind === "pitch" && (
              <div className="jw-pad">
                <p className="jw-kicker">Mini game</p>
                <h2 className="jw-h2">Score a goal</h2>
                <p className="jw-body">Ride into the ball and push it into the net at the far end of the pitch. There&apos;s a little celebration waiting.</p>
                <button className="jw-start" onClick={() => setPanel(null)}>
                  Let&apos;s play
                </button>
              </div>
            )}
            {panel.kind === "map" && (
              <MapView
                districts={districts}
                bigMapRef={bigMapRef}
                webgl={!webglError}
                onGo={go}
                onPortfolio={openPortfolio}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function StatusChip({ status }: { status: ExhibitStatus }) {
  return <span className={`jw-status jw-status-${status}`}>{STATUS_LABEL[status]}</span>;
}

function Media({ src, alt, asset }: { src: string; alt: string; asset: (p: string) => string }) {
  if (src.endsWith(".mp4")) return <video src={asset(src)} muted loop playsInline autoPlay controls preload="metadata" />;
  return <img src={asset(src)} alt={alt} loading="lazy" />;
}

function ExhibitView({ exhibit: e, district, asset }: { exhibit: Exhibit; district?: District; asset: (p: string) => string }) {
  const hasMedia = !!e.cover || e.sections.some((s) => s.media.length > 0);
  return (
    <article style={district ? ({ "--dc": district.color } as React.CSSProperties) : undefined}>
      {e.cover && (
        <div className="jw-hero">
          <img src={asset(e.cover)} alt={e.title} onError={(ev) => ((ev.target as HTMLImageElement).parentElement!.style.display = "none")} />
        </div>
      )}
      <div className="jw-pad">
        <p className="jw-kicker jw-kicker-d">{district?.name}</p>
        <h2 className="jw-h2">{e.title}</h2>
        <div className="jw-meta">
          <StatusChip status={e.status} />
          {e.client && <span>{e.client}</span>}
          {e.sector && <span>{e.sector}</span>}
        </div>
        {e.role && <p className="jw-role">{e.role}</p>}
        <p className="jw-body jw-lead">{e.summary}</p>
        {e.problem && (
          <>
            <h3 className="jw-h3 jw-sub">The problem</h3>
            <p className="jw-body">{e.problem}</p>
          </>
        )}
        {e.solution && e.solution !== e.summary && (
          <>
            <h3 className="jw-h3 jw-sub">What was done</h3>
            <p className="jw-body">{e.solution}</p>
          </>
        )}
        {e.deliverables.length > 0 && (
          <>
            <h3 className="jw-h3 jw-sub">Deliverables</h3>
            <div className="jw-chips">
              {e.deliverables.map((d) => (
                <span key={d} className="jw-chip jw-chip-soft">
                  {d}
                </span>
              ))}
            </div>
          </>
        )}
        {e.stack.length > 0 && (
          <>
            <h3 className="jw-h3 jw-sub">Built with</h3>
            <div className="jw-chips">
              {e.stack.map((d) => (
                <span key={d} className="jw-chip">
                  {d}
                </span>
              ))}
            </div>
          </>
        )}
        {e.link && (
          <a className="jw-start jw-start-link" href={e.link} target="_blank" rel="noopener noreferrer">
            Visit {e.link.replace(/^https?:\/\//, "").replace(/\/$/, "")} ↗
          </a>
        )}
        {e.sections.length > 0 && (
          <div className="jw-sections">
            {e.sections.map((s) => (
              <section key={s.title} className="jw-section">
                <h3 className="jw-h3">{s.title}</h3>
                <p className="jw-small">{s.body}</p>
                {s.media.length > 0 && (
                  <div className={`jw-gallery ${s.media.length > 1 ? "is-grid" : ""}`}>
                    {s.media.map((m) => (
                      <div key={m} className="jw-gallery-item">
                        <Media src={m} alt={s.title} asset={asset} />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
        {!hasMedia && <p className="jw-small jw-muted jw-note">Images for this project are being added.</p>}
      </div>
    </article>
  );
}

function CVView({ cv, asset, cvHref, onContact }: { cv: CV; asset: (p: string) => string; cvHref: string; onContact?: () => void }) {
  return (
    <div className="jw-cv">
      <div className="jw-about-photo">
        <img src={asset(cv.photo)} alt={cv.name} />
      </div>
      <div className="jw-pad">
        <p className="jw-kicker">Achievements Centre</p>
        <h2 className="jw-h2">{cv.name}</h2>
        <p className="jw-role">{cv.identity}</p>
        {cv.summary.map((s) => (
          <p key={s} className="jw-body">
            {s}
          </p>
        ))}
        <div className="jw-row">
          {cvHref && (
            <a className="jw-start jw-start-link" href={cvHref} target="_blank" rel="noopener noreferrer">
              Printable CV / PDF
            </a>
          )}
          {onContact && (
            <button className="jw-ghost jw-ghost-dark" onClick={onContact}>
              Contact me
            </button>
          )}
        </div>

        <h3 className="jw-h3 jw-sub">Highlights</h3>
        <ul className="jw-list-plain">
          {cv.achievements.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>

        <h3 className="jw-h3 jw-sub">Experience</h3>
        <div className="jw-timeline">
          {cv.experience.map((x) => (
            <div key={x.org} className="jw-job">
              <p className="jw-job-period">{x.period}</p>
              <p className="jw-job-role">{x.role}</p>
              <p className="jw-job-org">{x.org}</p>
              {x.summary && <p className="jw-small">{x.summary}</p>}
              {x.groups?.map((g) => (
                <div key={g.label} className="jw-job-group">
                  <p className="jw-tag">{g.label}</p>
                  <p className="jw-small">{g.items.join(" · ")}</p>
                </div>
              ))}
              {x.highlights && (
                <>
                  <p className="jw-tag">Key projects</p>
                  <ul className="jw-list-plain jw-small">
                    {x.highlights.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ))}
        </div>

        <h3 className="jw-h3 jw-sub">Education</h3>
        {cv.education.map((ed) => (
          <div key={ed.award} className="jw-job">
            <p className="jw-job-role">{ed.award}</p>
            <p className="jw-job-org">{ed.school}</p>
          </div>
        ))}
        {cv.ambitions.length > 0 && <p className="jw-small jw-muted">Next: {cv.ambitions.join(" · ")}</p>}

        <h3 className="jw-h3 jw-sub">Skills</h3>
        {cv.skills.map((s) => (
          <div key={s.tier} className="jw-skill-tier">
            <p className="jw-tag">
              {s.tier} <span className="jw-muted">· {s.note}</span>
            </p>
            <div className="jw-chips">
              {s.items.map((t) => (
                <span key={t} className={`jw-chip ${s.tier === "Developing" ? "jw-chip-soft" : ""}`}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}

        <h3 className="jw-h3 jw-sub">What I do</h3>
        <p className="jw-small">{cv.disciplines.join(" · ")}</p>
      </div>
    </div>
  );
}

function ContactView({ cv }: { cv: CV }) {
  return (
    <div className="jw-pad">
      <p className="jw-kicker">Contact Centre</p>
      <h2 className="jw-h2">Let&apos;s work together</h2>
      <p className="jw-body">For roles, brand and marketing work, websites and software, or partnerships.</p>
      <div className="jw-contact-list">
        <a className="jw-contact" href={`mailto:${cv.email}`}>
          <span className="jw-tag">Email</span>
          <span>{cv.email}</span>
        </a>
        {cv.phones.map((p) => (
          <a key={p.tel} className="jw-contact" href={`tel:${p.tel}`}>
            <span className="jw-tag">Phone</span>
            <span>{p.display}</span>
          </a>
        ))}
        {cv.whatsapp && (
          <a className="jw-contact" href={`https://wa.me/${cv.whatsapp}`} target="_blank" rel="noopener noreferrer">
            <span className="jw-tag">WhatsApp</span>
            <span>Chat on WhatsApp ↗</span>
          </a>
        )}
        {cv.links.map((l) => (
          <a key={l.href} className="jw-contact" href={l.href} target="_blank" rel="noopener noreferrer">
            <span className="jw-tag">{l.label}</span>
            <span>{l.href.replace(/^https?:\/\//, "")} ↗</span>
          </a>
        ))}
      </div>
      <p className="jw-small jw-muted">{cv.location}</p>
    </div>
  );
}

function MapView({ districts, bigMapRef, webgl, onGo, onPortfolio }: {
  districts: District[];
  bigMapRef: React.RefObject<HTMLCanvasElement | null>;
  webgl: boolean;
  onGo: (t: TeleportTarget) => void;
  onPortfolio: () => void;
}) {
  const places: { id: TeleportTarget; name: string; tag: string; color?: string }[] = [
    { id: "start", name: "Start", tag: "Welcome" },
    { id: "cv", name: "Achievements Centre", tag: "CV" },
    { id: "contact", name: "Contact Centre", tag: "Contact" },
    ...districts.map((d) => ({ id: d.id as TeleportTarget, name: d.name, tag: d.short, color: d.color })),
    { id: "pitch", name: "Football pitch", tag: "Mini game" },
  ];
  return (
    <div className="jw-pad">
      <p className="jw-kicker">Map</p>
      <h2 className="jw-h2">Where to?</h2>
      {webgl && (
        <div className="jw-bigmap">
          <canvas ref={bigMapRef} />
        </div>
      )}
      <div className="jw-places">
        {places.map((p) => (
          <button key={p.id} className="jw-place" onClick={() => onGo(p.id)} style={p.color ? ({ "--pc": p.color } as React.CSSProperties) : undefined}>
            <span className="jw-place-tag">{p.tag}</span>
            <span>{p.name}</span>
          </button>
        ))}
      </div>
      <button className="jw-link jw-link-dark" onClick={onPortfolio}>
        Switch to portfolio mode →
      </button>
    </div>
  );
}

function PortfolioMode(props: {
  cv: CV;
  exhibits: Exhibit[];
  districts: District[];
  asset: (p: string) => string;
  cvHref: string;
  canRide: boolean;
  onRide: () => void;
  onOpen: (e: Exhibit) => void;
}) {
  const { cv, exhibits, districts, asset } = props;
  const [filter, setFilter] = useState<DistrictId | "all">("all");
  const shown = filter === "all" ? exhibits : exhibits.filter((e) => e.district === filter);
  return (
    <div className="jw-portfolio">
      <nav className="jw-pf-nav">
        <span className="jw-pf-logo">{cv.name}</span>
        <div className="jw-pf-links">
          <a href="#pf-work">Work</a>
          <a href="#pf-experience">Experience</a>
          <a href="#pf-skills">Skills</a>
          <a href="#pf-contact">Contact</a>
        </div>
        {props.canRide && (
          <button className="jw-start jw-start-sm" onClick={props.onRide}>
            Ride the world
          </button>
        )}
      </nav>

      <header className="jw-pf-hero">
        <div>
          <p className="jw-kicker">{cv.location}</p>
          <h1 className="jw-pf-title">{cv.name}</h1>
          <p className="jw-pf-identity">{cv.identity}</p>
          {cv.summary.map((s) => (
            <p key={s} className="jw-body">
              {s}
            </p>
          ))}
          <div className="jw-row">
            {props.cvHref && (
              <a className="jw-start jw-start-link" href={props.cvHref} target="_blank" rel="noopener noreferrer">
                Printable CV / PDF
              </a>
            )}
            <a className="jw-ghost jw-ghost-dark" href="#pf-contact">
              Contact
            </a>
          </div>
        </div>
        <div className="jw-pf-photo">
          <img src={asset(cv.photo)} alt={cv.name} />
        </div>
      </header>

      <section id="pf-work" className="jw-pf-section">
        <h2 className="jw-h2">Work</h2>
        <div className="jw-filters" role="tablist">
          <button className={filter === "all" ? "is-on" : ""} onClick={() => setFilter("all")}>
            All ({exhibits.length})
          </button>
          {districts.map((d) => (
            <button key={d.id} className={filter === d.id ? "is-on" : ""} onClick={() => setFilter(d.id)} style={{ "--pc": d.color } as React.CSSProperties}>
              {d.short} ({exhibits.filter((e) => e.district === d.id).length})
            </button>
          ))}
        </div>
        {filter !== "all" && <p className="jw-body">{districts.find((d) => d.id === filter)?.blurb}</p>}
        <div className="jw-cards">
          {shown.map((e) => {
            const d = districts.find((x) => x.id === e.district);
            const img = e.board || e.cover;
            return (
              <button key={e.slug} className="jw-card" onClick={() => props.onOpen(e)} style={d ? ({ "--pc": d.color } as React.CSSProperties) : undefined}>
                <span className="jw-card-img">{img ? <img src={asset(img)} alt="" loading="lazy" /> : <span className="jw-card-ph">{e.title}</span>}</span>
                <span className="jw-card-body">
                  <span className="jw-card-top">
                    <span className="jw-card-d">{d?.short}</span>
                    <StatusChip status={e.status} />
                  </span>
                  <span className="jw-h3">{e.title}</span>
                  <span className="jw-small jw-clamp">{e.summary}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section id="pf-experience" className="jw-pf-section jw-pf-alt">
        <div className="jw-pf-narrow">
          <CVExperience cv={cv} />
        </div>
      </section>

      <section id="pf-skills" className="jw-pf-section">
        <div className="jw-pf-narrow">
          <h2 className="jw-h2">Skills</h2>
          {cv.skills.map((s) => (
            <div key={s.tier} className="jw-skill-tier">
              <p className="jw-tag">
                {s.tier} <span className="jw-muted">· {s.note}</span>
              </p>
              <div className="jw-chips">
                {s.items.map((t) => (
                  <span key={t} className={`jw-chip ${s.tier === "Developing" ? "jw-chip-soft" : ""}`}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <h3 className="jw-h3 jw-sub">Education</h3>
          {cv.education.map((ed) => (
            <div key={ed.award} className="jw-job">
              <p className="jw-job-role">{ed.award}</p>
              <p className="jw-job-org">{ed.school}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pf-contact" className="jw-pf-section jw-pf-dark">
        <div className="jw-pf-narrow">
          <ContactView cv={cv} />
        </div>
      </section>
    </div>
  );
}

function CVExperience({ cv }: { cv: CV }) {
  return (
    <>
      <h2 className="jw-h2">Experience</h2>
      <div className="jw-timeline">
        {cv.experience.map((x) => (
          <div key={x.org} className="jw-job">
            <p className="jw-job-period">{x.period}</p>
            <p className="jw-job-role">{x.role}</p>
            <p className="jw-job-org">{x.org}</p>
            {x.summary && <p className="jw-small">{x.summary}</p>}
            {x.groups?.map((g) => (
              <div key={g.label} className="jw-job-group">
                <p className="jw-tag">{g.label}</p>
                <p className="jw-small">{g.items.join(" · ")}</p>
              </div>
            ))}
            {x.highlights && (
              <>
                <p className="jw-tag">Key projects</p>
                <ul className="jw-list-plain jw-small">
                  {x.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

/* icons ------------------------------------------------------------ */
function MapIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M9 9v11" />
    </svg>
  );
}
function SoundIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}
function MuteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="m22 9-6 6M16 9l6 6" />
    </svg>
  );
}
