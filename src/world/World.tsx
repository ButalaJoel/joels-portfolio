"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TeleportTarget, WorldHandle, Zone } from "./engine";
import "./world.css";

/* ------------------------------------------------------------------ */
/* Content types (match src/data/projects.ts)                          */
/* ------------------------------------------------------------------ */

export type Deliverable = {
  type: string;
  title: string;
  description: string;
  image?: string;
  images?: string[];
  video?: string;
};

export type Project = {
  id: number;
  slug: string;
  title: string;
  category: string;
  year: string;
  description: string;
  image?: string;
  deliverables: Deliverable[];
};

export type Profile = {
  name: string;
  role: string;
  location: string;
  bio: string[];
  email: string;
  photo: string;
  stats: { value: string; label: string }[];
  tools: string[];
  socials: { label: string; href: string }[];
};

type Panel =
  | { kind: "project"; project: Project }
  | { kind: "about" }
  | { kind: "contact" }
  | { kind: "pitch" }
  | { kind: "menu" }
  | null;

type Props = {
  projects: Project[];
  profile: Profile;
  resolveAsset?: (path: string) => string;
};

const isCoarse = () => typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches;

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function World({ projects, profile, resolveAsset }: Props) {
  const asset = useCallback((p: string) => (resolveAsset ? resolveAsset(p) : p), [resolveAsset]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<WorldHandle | null>(null);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [loaderGone, setLoaderGone] = useState(false);
  const [zone, setZone] = useState<Zone | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [touch, setTouchMode] = useState(false);
  const [webglError, setWebglError] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<Panel>(null);
  panelRef.current = panel;

  const showToast = useCallback((t: string) => {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const openZone = useCallback(
    (z: Zone) => {
      if (z.type === "project") {
        const p = projects.find((pp) => pp.slug === z.slug);
        if (p) setPanel({ kind: "project", project: p });
      } else setPanel({ kind: z.type });
    },
    [projects],
  );

  /* mount the 3D world -------------------------------------------- */
  useEffect(() => {
    // read device/storage prefs after hydration so server and client HTML match
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
          projects: projects.map((p) => ({ slug: p.slug, title: p.title, category: p.category, year: p.year, image: p.image })),
          tools: profile.tools,
          resolveAsset: asset,
          onProgress: setProgress,
          onReady: () => setReady(true),
          onZone: setZone,
          onActivate: openZone,
          onToast: showToast,
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
  }, [projects, profile.tools, asset, openZone, showToast]);

  useEffect(() => {
    worldRef.current?.setPaused(!!panel || !started);
  }, [panel, started]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanel(null);
      if (e.key === "Enter" && !panelRef.current && !started && ready) begin();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function begin() {
    if (webglError) {
      setStarted(true);
      setLoaderGone(true);
      setPanel({ kind: "menu" });
      return;
    }
    worldRef.current?.start();
    setStarted(true);
    setTimeout(() => setLoaderGone(true), 900);
  }

  function toggleMute() {
    const m = !muted;
    setMuted(m);
    worldRef.current?.setMuted(m);
  }

  function go(t: TeleportTarget) {
    worldRef.current?.teleport(t);
    setPanel(null);
  }

  /* floating joystick (touch) ------------------------------------- */
  const joy = useRef<{ id: number; ox: number; oy: number } | null>(null);
  const [joyUi, setJoyUi] = useState<{ ox: number; oy: number; x: number; y: number } | null>(null);
  const JOY_R = 56;

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse" || !started || panel) return;
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
        aria-label="3D world: ride a boda boda around Joel's portfolio"
      />

      {joyUi && (
        <div className="jw-joy" style={{ left: joyUi.ox, top: joyUi.oy }}>
          <div className="jw-joy-knob" style={{ transform: `translate(${joyUi.x}px, ${joyUi.y}px)` }} />
        </div>
      )}

      {/* HUD */}
      {started && (
        <>
          <header className="jw-hud-top">
            <button className="jw-brand" onClick={() => setPanel({ kind: "about" })}>
              <span className="jw-brand-name">{profile.name}</span>
              <span className="jw-brand-role">{profile.role}</span>
            </button>
            <div className="jw-hud-actions">
              <button className="jw-icon-btn" onClick={() => setPanel({ kind: "menu" })} aria-label="Open map and project list">
                <MapIcon />
                <span>Map</span>
              </button>
              <button className="jw-icon-btn" onClick={toggleMute} aria-label={muted ? "Unmute sound" : "Mute sound"}>
                {muted ? <MuteIcon /> : <SoundIcon />}
              </button>
            </div>
          </header>

          {!touch && !panel && <div className="jw-keys">WASD / arrows · Shift boost · Space brake · H hoot · R reset</div>}

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
              <button className="jw-round" onPointerDown={(e) => { e.stopPropagation(); worldRef.current?.horn(); }} aria-label="Hoot the horn">
                📯
              </button>
            </div>
          )}

          {zone && !panel && (
            <button className="jw-prompt" onClick={() => openZone(zone)}>
              <span className="jw-prompt-kicker">{zone.type === "project" ? "Project" : zone.type === "pitch" ? "Mini game" : zone.title}</span>
              <span className="jw-prompt-title">{zone.type === "project" ? zone.title : zone.subtitle}</span>
              <span className="jw-prompt-cta">{touch ? "Tap to open" : "Press Enter ↵"}</span>
            </button>
          )}
        </>
      )}

      {toast && <div className="jw-toast">{toast}</div>}

      {/* Loader */}
      {!loaderGone && (
        <div className={`jw-loader ${started ? "is-leaving" : ""}`}>
          <div className="jw-loader-inner">
            <p className="jw-kicker">Portfolio · {profile.location}</p>
            <h1 className="jw-loader-title">{profile.name}</h1>
            <p className="jw-loader-sub">{profile.role}. Ride a boda boda through a tiny Kampala to see my work.</p>
            <div className="jw-bar" aria-hidden>
              <div className="jw-bar-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <button className="jw-start" disabled={!ready} onClick={begin}>
              {ready ? (webglError ? "View my work" : "Start the engine") : `Loading ${Math.round(progress * 100)}%`}
            </button>
            <button
              className="jw-link"
              onClick={() => {
                setStarted(true);
                setLoaderGone(true);
                setPanel({ kind: "menu" });
              }}
            >
              Skip the ride, show me the list
            </button>
            <p className="jw-hint">{touch ? "Drag anywhere to steer · 🔊 sound on" : "Keyboard: WASD or arrows · 🔊 sound on"}</p>
          </div>
        </div>
      )}

      {/* Panels */}
      {panel && (
        <div className="jw-modal" role="dialog" aria-modal="true" onClick={() => setPanel(null)}>
          <div className="jw-sheet" onClick={(e) => e.stopPropagation()}>
            <button className="jw-close" onClick={() => setPanel(null)} aria-label="Close">
              ✕
            </button>
            {panel.kind === "project" && <ProjectView project={panel.project} asset={asset} />}
            {panel.kind === "about" && <AboutView profile={profile} asset={asset} />}
            {panel.kind === "contact" && <ContactView profile={profile} />}
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
            {panel.kind === "menu" && (
              <MenuView
                projects={projects}
                asset={asset}
                webgl={!webglError}
                onGo={go}
                onProject={(p) => setPanel({ kind: "project", project: p })}
                onAbout={() => setPanel({ kind: "about" })}
                onContact={() => setPanel({ kind: "contact" })}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Panels                                                              */
/* ------------------------------------------------------------------ */

function ProjectView({ project, asset }: { project: Project; asset: (p: string) => string }) {
  return (
    <div>
      {project.image && (
        <div className="jw-hero">
          <img src={asset(project.image)} alt={project.title} onError={(e) => ((e.target as HTMLImageElement).parentElement!.style.display = "none")} />
        </div>
      )}
      <div className="jw-pad">
        <p className="jw-kicker">
          {project.category} · {project.year}
        </p>
        <h2 className="jw-h2">{project.title}</h2>
        <p className="jw-body">{project.description}</p>
        {project.deliverables.length > 0 && (
          <div className="jw-deliverables">
            {project.deliverables.map((d) => (
              <article key={d.title} className="jw-deliv">
                <div className="jw-deliv-media">
                  {d.video ? (
                    <video src={asset(d.video)} muted loop playsInline autoPlay preload="metadata" />
                  ) : d.images ? (
                    <div className="jw-deliv-pair">
                      {d.images.map((src) => (
                        <img key={src} src={asset(src)} alt={d.title} loading="lazy" />
                      ))}
                    </div>
                  ) : d.image ? (
                    <img src={asset(d.image)} alt={d.title} loading="lazy" />
                  ) : null}
                </div>
                <p className="jw-tag">{d.type}</p>
                <h3 className="jw-h3">{d.title}</h3>
                <p className="jw-small">{d.description}</p>
              </article>
            ))}
          </div>
        )}
        {project.deliverables.length === 0 && <p className="jw-small jw-muted">Full case study coming soon.</p>}
      </div>
    </div>
  );
}

function AboutView({ profile, asset }: { profile: Profile; asset: (p: string) => string }) {
  return (
    <div className="jw-about">
      <div className="jw-about-photo">
        <img src={asset(profile.photo)} alt={profile.name} />
      </div>
      <div className="jw-pad">
        <p className="jw-kicker">About me</p>
        <h2 className="jw-h2">{profile.bio[0]}</h2>
        {profile.bio.slice(1).map((b) => (
          <p key={b} className="jw-body">
            {b}
          </p>
        ))}
        <div className="jw-stats">
          {profile.stats.map((s) => (
            <div key={s.label} className="jw-stat">
              <span className="jw-stat-v">{s.value}</span>
              <span className="jw-stat-l">{s.label}</span>
            </div>
          ))}
        </div>
        <p className="jw-kicker" style={{ marginTop: 24 }}>
          Tools I use
        </p>
        <div className="jw-chips">
          {profile.tools.map((t) => (
            <span key={t} className="jw-chip">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContactView({ profile }: { profile: Profile }) {
  return (
    <div className="jw-pad">
      <p className="jw-kicker">Contact</p>
      <h2 className="jw-h2">Got a brand on the rise? Let&apos;s talk.</h2>
      <p className="jw-body">Branding, websites, apps and motion. Tell me what you&apos;re building.</p>
      <a className="jw-start jw-start-link" href={`mailto:${profile.email}`}>
        {profile.email}
      </a>
      {profile.socials.length > 0 && (
        <div className="jw-chips" style={{ marginTop: 16 }}>
          {profile.socials.map((s) => (
            <a key={s.label} className="jw-chip jw-chip-link" href={s.href} target="_blank" rel="noopener noreferrer">
              {s.label} ↗
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function MenuView(props: {
  projects: Project[];
  asset: (p: string) => string;
  webgl: boolean;
  onGo: (t: TeleportTarget) => void;
  onProject: (p: Project) => void;
  onAbout: () => void;
  onContact: () => void;
}) {
  const places: [TeleportTarget, string, string][] = [
    ["spawn", "Boda stage", "Start"],
    ["work", "Work street", "Projects"],
    ["about", "Skills market", "About"],
    ["contact", "Hello kiosk", "Contact"],
    ["pitch", "Football pitch", "Mini game"],
  ];
  return (
    <div className="jw-pad">
      {props.webgl && (
        <>
          <p className="jw-kicker">Ride to</p>
          <div className="jw-places">
            {places.map(([id, name, tag]) => (
              <button key={id} className="jw-place" onClick={() => props.onGo(id)}>
                <span className="jw-place-tag">{tag}</span>
                <span>{name}</span>
              </button>
            ))}
          </div>
        </>
      )}
      <p className="jw-kicker" style={{ marginTop: 24 }}>
        All projects
      </p>
      <div className="jw-list">
        {props.projects.map((p) => (
          <button key={p.slug} className="jw-list-item" onClick={() => props.onProject(p)}>
            <span className="jw-list-thumb">{p.image && <img src={props.asset(p.image)} alt="" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />}</span>
            <span className="jw-list-text">
              <span className="jw-h3">{p.title}</span>
              <span className="jw-small jw-muted">{p.category}</span>
            </span>
            <span aria-hidden>→</span>
          </button>
        ))}
      </div>
      <div className="jw-menu-foot">
        <button className="jw-link" onClick={props.onAbout}>
          About me
        </button>
        <button className="jw-link" onClick={props.onContact}>
          Contact
        </button>
      </div>
    </div>
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
