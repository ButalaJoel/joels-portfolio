import * as THREE from "three";
import { WorldAudio } from "./audio";
import { makeGroundTextTexture, makeLabelTexture, makePosterTexture, makeSignTexture } from "./canvasTextures";
import {
  PALETTE,
  createArch,
  createBall,
  createBanana,
  createBillboard,
  createBoda,
  createBuilding,
  createClockTower,
  createCone,
  createCrate,
  createGoal,
  createJerrycan,
  createKiosk,
  createMatatu,
  createParkedBoda,
  createRolexStand,
  createTree,
  mat,
} from "./models";
import { Particles } from "./particles";
import { PhysicsWorld, Prop } from "./physics";

/* ------------------------------------------------------------------ */
/* Public types                                                        */
/* ------------------------------------------------------------------ */

export type DistrictKey = "marketing" | "creative" | "digital" | "business" | "innovation";

export type WorldExhibit = {
  slug: string;
  title: string;
  subtitle: string;
  district: DistrictKey;
  /** image for the billboard, loaded when you ride close */
  image?: string;
};

export type WorldDistrict = { id: DistrictKey; name: string; color: string };

export type ZoneType = "exhibit" | "cv" | "contact" | "pitch";

export type Zone = {
  id: string;
  type: ZoneType;
  title: string;
  subtitle: string;
  slug?: string;
  district?: DistrictKey;
  x: number;
  z: number;
  r: number;
};

export type AreaId = DistrictKey | "start" | "pitch";

export type TeleportTarget = AreaId | "cv" | "contact";

export type WorldOptions = {
  exhibits: WorldExhibit[];
  districts: WorldDistrict[];
  tools: string[];
  resolveAsset?: (path: string) => string;
  /** small canvas the engine keeps drawing the mini-map on */
  minimap?: HTMLCanvasElement | null;
  onProgress?: (p: number) => void;
  onReady?: () => void;
  onZone?: (zone: Zone | null) => void;
  onActivate?: (zone: Zone) => void;
  onToast?: (text: string) => void;
  onDistrict?: (area: AreaId | null) => void;
};

export type TouchInput = { x: number; y: number; active: boolean };

export type WorldHandle = {
  start: () => void;
  setTouch: (t: TouchInput) => void;
  setBoost: (b: boolean) => void;
  horn: () => void;
  teleport: (t: TeleportTarget) => void;
  setMuted: (m: boolean) => void;
  setPaused: (p: boolean) => void;
  getZones: () => Zone[];
  /** draw the full map (used by the big map in the UI) */
  drawMap: (canvas: HTMLCanvasElement, opts?: { labels?: boolean }) => void;
  destroy: () => void;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function wrapAngle(a: number) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/* ------------------------------------------------------------------ */
/* Map layout (world units ≈ metres, -z is north / up the screen)      */
/* ------------------------------------------------------------------ */

const SPAWN = { x: 0, z: 22, h: 0 };
const BOUNDS = 106;
const PITCH = { x: -48, z: 66 };
const CAMPUS_ROAD_Z = 58;

const TELEPORTS: Record<TeleportTarget, { x: number; z: number; h: number }> = {
  start: SPAWN,
  cv: { x: -26, z: 44, h: 0 },
  contact: { x: 24, z: 42, h: 0 },
  digital: { x: 0, z: -18, h: 0 },
  creative: { x: 18, z: 1.5, h: -Math.PI / 2 },
  marketing: { x: -18, z: -1.5, h: Math.PI / 2 },
  business: { x: 0, z: 36, h: Math.PI },
  innovation: { x: 12, z: CAMPUS_ROAD_Z + 1.5, h: -Math.PI / 2 },
  pitch: { x: PITCH.x, z: 30, h: Math.PI },
};

function districtAt(x: number, z: number): AreaId | null {
  if (z < -18 && Math.abs(x) < 34) return "digital";
  if (x > 18 && Math.abs(z) < 32) return "creative";
  if (x < -18 && Math.abs(z) < 32) return "marketing";
  if (x < -28 && z > 36) return "pitch";
  if (x > 20 && z > 40) return "innovation";
  if (z > 38 && Math.abs(x) < 22) return "business";
  if (Math.hypot(x, z) < 45) return "start";
  return null;
}

/* ------------------------------------------------------------------ */
/* World                                                               */
/* ------------------------------------------------------------------ */

export function createWorld(canvas: HTMLCanvasElement, opts: WorldOptions): WorldHandle {
  const resolve = opts.resolveAsset ?? ((p: string) => p);
  const isTouch = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
  const districtColor = (id: DistrictKey) => opts.districts.find((d) => d.id === id)?.color ?? PALETTE.brand;
  const districtName = (id: DistrictKey) => opts.districts.find((d) => d.id === id)?.name ?? id;

  /* renderer ------------------------------------------------------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch || window.devicePixelRatio < 2, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouch ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.Fog(PALETTE.sky, 75, 160);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 400);

  /* lights: warm Kampala afternoon --------------------------------- */
  const hemi = new THREE.HemisphereLight("#fff4dc", "#b5653a", 1.4);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight("#ffe2b0", 2.6);
  sun.castShadow = true;
  const shadowSize = isTouch ? 1024 : 2048;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  const sc = sun.shadow.camera as THREE.OrthographicCamera;
  sc.left = -36;
  sc.right = 36;
  sc.top = 36;
  sc.bottom = -36;
  sc.near = 1;
  sc.far = 130;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const SUN_OFFSET = new THREE.Vector3(-22, 40, 18);

  /* loading -------------------------------------------------------- */
  // Billboard images load lazily as you ride near them, so the loader only
  // waits for the world itself. Keeping the hook lets assets join later.
  let readyFired = false;
  const readyOnce = () => {
    if (readyFired) return;
    readyFired = true;
    opts.onProgress?.(1);
    opts.onReady?.();
  };
  const texLoader = new THREE.TextureLoader();

  const physics = new PhysicsWorld();
  physics.bounds = BOUNDS;
  const zones: Zone[] = [];
  const padMeshes = new Map<string, THREE.Mesh>();
  const r = rng(7);
  const exclusions: { x: number; z: number; r: number }[] = [];
  const exclude = (x: number, z: number, rad: number) => exclusions.push({ x, z, r: rad });

  // for the mini-map
  const mapRoads: { x: number; z: number; w: number; d: number }[] = [];
  const mapBlocks: { x: number; z: number; w: number; d: number; color: string }[] = [];

  /* ground --------------------------------------------------------- */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), mat(PALETTE.earth, { flatShading: false }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const patchGeo = new THREE.CircleGeometry(1, 7);
  function patch(x: number, z: number, sx: number, sz: number, color: string, y = 0.01) {
    const g = new THREE.Mesh(patchGeo, mat(color, { flatShading: false }));
    g.rotation.x = -Math.PI / 2;
    g.rotation.z = r() * Math.PI;
    g.position.set(x, y, z);
    g.scale.set(sx, sz, 1);
    g.receiveShadow = true;
    scene.add(g);
  }
  for (let i = 0; i < 60; i++) patch((r() - 0.5) * 220, (r() - 0.5) * 220, 4 + r() * 9, 3 + r() * 6, r() > 0.5 ? PALETTE.earthDark : "#cf7646", 0.005);
  for (let i = 0; i < 70; i++) {
    const x = (r() - 0.5) * 210;
    const z = (r() - 0.5) * 210;
    if (Math.abs(x) < 8 || Math.abs(z) < 8) continue;
    patch(x, z, 3 + r() * 7, 2 + r() * 5, r() > 0.5 ? PALETTE.grass : PALETTE.grassDark);
  }
  const stoneGeo = new THREE.DodecahedronGeometry(0.25, 0);
  for (let i = 0; i < 160; i++) {
    const x = (r() - 0.5) * 210;
    const z = (r() - 0.5) * 210;
    if (Math.abs(x) < 6 || Math.abs(z) < 6) continue;
    const st = new THREE.Mesh(stoneGeo, mat(r() > 0.5 ? "#8f4a2a" : "#b9a58c"));
    st.position.set(x, 0.05, z);
    st.scale.set(0.5 + r(), 0.4 + r() * 0.5, 0.5 + r());
    st.rotation.set(r(), r(), r());
    scene.add(st);
  }

  /* roads ---------------------------------------------------------- */
  const roadMat = mat(PALETTE.road, { flatShading: false, roughness: 0.95 });
  const lineMat = new THREE.MeshBasicMaterial({ color: "#f3c623" });
  const curbMat = mat("#e9e1cf");
  /** road centred at x,z; alongZ: runs north-south */
  function road(x: number, z: number, w: number, l: number, alongZ: boolean) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(alongZ ? w : l, alongZ ? l : w), roadMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.02, z);
    m.receiveShadow = true;
    scene.add(m);
    mapRoads.push({ x, z, w: alongZ ? w : l, d: alongZ ? l : w });
    for (let d = -l / 2 + 2; d < l / 2 - 1; d += 4) {
      const ln = new THREE.Mesh(new THREE.PlaneGeometry(alongZ ? 0.25 : 2, alongZ ? 2 : 0.25), lineMat);
      ln.rotation.x = -Math.PI / 2;
      ln.position.set(alongZ ? x : x + d, 0.03, alongZ ? z + d : z);
      scene.add(ln);
    }
  }
  road(0, -56, 8, 88, true); // north: digital
  road(0, 56, 8, 88, true); // south: business
  road(56, 0, 8, 88, false); // east: creative
  road(-56, 0, 8, 88, false); // west: marketing
  road(52, CAMPUS_ROAD_Z, 8, 88, false); // innovation campus
  road(-27, 36, 7, 46, false); // track to the pitch & CV centre

  // roundabout
  const ring = new THREE.Mesh(new THREE.CircleGeometry(13, 40), roadMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.021;
  ring.receiveShadow = true;
  scene.add(ring);
  mapRoads.push({ x: 0, z: 0, w: 26, d: 26 });
  const island = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.2, 0.3, 32), mat(PALETTE.grass));
  island.position.y = 0.15;
  island.receiveShadow = true;
  scene.add(island);
  const curb = new THREE.Mesh(new THREE.TorusGeometry(5.1, 0.18, 6, 40), curbMat);
  curb.rotation.x = Math.PI / 2;
  curb.position.y = 0.2;
  scene.add(curb);
  const tower = createClockTower();
  scene.add(tower);
  physics.addCircle(0, 0, 5.2);
  exclude(0, 0, 15);

  /* painted ground text ------------------------------------------- */
  function groundText(lines: string[], x: number, z: number, w: number, rotY = 0, color = "#ffffff") {
    const tex = makeGroundTextTexture(lines, color);
    const h = (w / 4) * lines.length;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.9 }));
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = rotY;
    m.position.set(x, 0.04, z);
    scene.add(m);
  }

  /* zones / pads --------------------------------------------------- */
  const padGeo = new THREE.CircleGeometry(1, 40);
  const ringGeo = new THREE.RingGeometry(0.88, 1, 48);
  function addPad(z: Zone, color: string = PALETTE.brand) {
    zones.push(z);
    const pad = new THREE.Mesh(padGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, depthWrite: false }));
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(z.x, 0.05, z.z);
    pad.scale.setScalar(z.r);
    const edge = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false }));
    edge.position.z = 0.001;
    pad.add(edge);
    scene.add(pad);
    padMeshes.set(z.id, pad);
    exclude(z.x, z.z, z.r + 1.5);
  }

  /* gateways ------------------------------------------------------- */
  function gateway(id: DistrictKey, x: number, z: number, rotY: number) {
    const tex = makeSignTexture({ title: districtName(id).toUpperCase(), bg: PALETTE.ink, accent: districtColor(id), width: 1024, height: 150, border: false });
    const arch = createArch(tex, districtColor(id));
    arch.position.set(x, 0, z);
    arch.rotation.y = rotY;
    scene.add(arch);
    const c = Math.cos(rotY);
    const s = Math.sin(rotY);
    for (const px of [-5.5, 5.5]) physics.addCircle(x + px * c, z - px * s, 0.6);
    exclude(x, z, 8);
  }

  /* exhibits: billboards with lazily loaded images ----------------- */
  type Board = { screen: THREE.Mesh; poster: THREE.Texture; url?: string; tex?: THREE.Texture; state: "none" | "loading" | "ready"; x: number; z: number; w: number; h: number };
  const boards: Board[] = [];

  function exhibitBoard(e: WorldExhibit, x: number, z: number, rotY: number, padX: number, padZ: number) {
    const color = districtColor(e.district);
    const poster = makePosterTexture(e.title, e.subtitle, districtName(e.district));
    const bb = createBillboard(poster, 8, 5, PALETTE.ink);
    bb.group.position.set(x, 0, z);
    bb.group.rotation.y = rotY;
    scene.add(bb.group);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.25, 0.3), mat(color));
    stripe.position.set(0, 2.05, 0.05);
    bb.group.add(stripe);
    const plateTex = makeSignTexture({ title: e.title, subtitle: e.subtitle, bg: PALETTE.ink, accent: color, width: 1024, height: 256, border: false });
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshBasicMaterial({ map: plateTex, toneMapped: false }));
    plate.position.set(0, 1.15, 0.2);
    bb.group.add(plate);
    const c = Math.cos(rotY);
    const s = Math.sin(rotY);
    for (const px of [-3.4, 3.4]) physics.addCircle(x + px * c, z - px * s, 0.35);
    exclude(x, z, 6.5);
    boards.push({ screen: bb.screen, poster, url: e.image ? resolve(e.image) : undefined, state: "none", x, z, w: 8, h: 5 });
    addPad({ id: `exhibit-${e.slug}`, type: "exhibit", slug: e.slug, district: e.district, title: e.title, subtitle: e.subtitle, x: padX, z: padZ, r: 2.5 }, color);
  }

  function fitCover(tex: THREE.Texture, w: number, h: number) {
    const img = tex.image as { width: number; height: number };
    const target = w / h;
    const aspect = img.width / img.height;
    tex.repeat.set(1, 1);
    tex.offset.set(0, 0);
    if (aspect > target) {
      tex.repeat.set(target / aspect, 1);
      tex.offset.set((1 - target / aspect) / 2, 0);
    } else {
      tex.repeat.set(1, aspect / target);
      tex.offset.set(0, (1 - aspect / target) / 2);
    }
  }

  let boardTimer = 0;
  function updateBoards(dt: number, bx: number, bz: number) {
    boardTimer -= dt;
    if (boardTimer > 0) return;
    boardTimer = 0.4;
    for (const b of boards) {
      if (!b.url) continue;
      const d = Math.hypot(b.x - bx, b.z - bz);
      const m = b.screen.material as THREE.MeshBasicMaterial;
      if (d < 48 && b.state === "none") {
        b.state = "loading";
        texLoader.load(
          b.url,
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.anisotropy = 4;
            fitCover(tex, b.w, b.h);
            b.tex = tex;
            b.state = "ready";
            m.map = tex;
            m.needsUpdate = true;
          },
          undefined,
          () => {
            b.state = "ready"; // keep the painted poster
          },
        );
      } else if (d > 85 && b.state === "ready" && b.tex) {
        // free GPU memory for boards far away (matters on phones)
        m.map = b.poster;
        m.needsUpdate = true;
        b.tex.dispose();
        b.tex = undefined;
        b.state = "none";
      }
    }
  }

  // shops for street life
  const shopNames: [string, string, string][] = [
    ["DESIGN DUKA", "Logos · Flyers · Brands", "#2e86c1"],
    ["CODE & CO.", "Websites · Apps · POS", "#27ae60"],
    ["MOTION SALON", "Edits · Reels · 3D", "#8e44ad"],
    ["PIXEL HARDWARE", "Every pixel in stock", "#e67e22"],
    ["BRAND CLINIC", "We treat weak brands", "#c0392b"],
    ["CHAPATI CORNER", "Fuel for designers", "#16a085"],
    ["MOBILE MONEY", "Send · Withdraw · Airtime", "#f1c40f"],
    ["PAINT & PRINT", "Colour for every wall", "#1f8a8a"],
  ];
  let shopIdx = 0;
  function shop(x: number, z: number, w: number, d: number, rotY = 0) {
    const [name, sub, wall] = shopNames[shopIdx % shopNames.length];
    shopIdx++;
    const h = 3.6 + r() * 2.5;
    const yellow = wall === "#f1c40f";
    const signTex = makeSignTexture({ title: name, subtitle: sub, bg: yellow ? "#151515" : "#f5efe0", fg: yellow ? "#f1c40f" : wall, accent: PALETTE.ink, width: 1024, height: 300 });
    const b = createBuilding({ w, d, h, wall, signTex });
    b.position.set(x, 0, z);
    b.rotation.y = rotY;
    scene.add(b);
    const rotated = Math.abs(Math.sin(rotY)) > 0.5;
    const hw = rotated ? d / 2 : w / 2;
    const hd = rotated ? w / 2 : d / 2;
    physics.addBox(x, z, hw, hd);
    mapBlocks.push({ x, z, w: hw * 2, d: hd * 2, color: "#9b5a38" });
    exclude(x, z, Math.max(w, d) * 0.75 + 1.5);
  }

  const byDistrict = (id: DistrictKey) => opts.exhibits.filter((e) => e.district === id);

  /* START: welcome, CV centre, contact ------------------------------ */
  const welcomeTex = makeSignTexture({
    title: "Hi, I'm Joel",
    subtitle: "Creative · Marketing · Technology",
    small: "Kampala, Uganda — ride the boda to explore my work",
    bg: PALETTE.ink,
  });
  const welcome = createBillboard(welcomeTex, 9, 4.5);
  welcome.group.position.set(-13, 0, 16);
  welcome.group.rotation.y = 0.35;
  scene.add(welcome.group);
  physics.addCircle(-13 - Math.cos(0.35) * 3.9, 16 + Math.sin(0.35) * 3.9, 0.35);
  physics.addCircle(-13 + Math.cos(0.35) * 3.9, 16 - Math.sin(0.35) * 3.9, 0.35);
  exclude(-13, 16, 7);

  // boda stage
  const stageSign = makeSignTexture({ title: "BODA STAGE", subtitle: "Safe rides · Helmets on", bg: "#1f4fa8", width: 1024, height: 320 });
  const stageBoard = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.4), new THREE.MeshBasicMaterial({ map: stageSign, toneMapped: false }));
  stageBoard.position.set(11, 3.2, 15);
  scene.add(stageBoard);
  const shelter = new THREE.Mesh(new THREE.BoxGeometry(7, 0.15, 3.5), mat("#8c8c8c", { metalness: 0.3 }));
  shelter.position.set(11, 2.6, 17);
  shelter.castShadow = true;
  scene.add(shelter);
  for (const [px, pz] of [
    [7.8, 15.4],
    [14.2, 15.4],
    [7.8, 18.6],
    [14.2, 18.6],
  ]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.6, 0.15), mat("#555"));
    post.position.set(px, 1.3, pz);
    post.castShadow = true;
    scene.add(post);
    physics.addCircle(px, pz, 0.2);
  }
  ["#1f6f3f", "#c8102e", "#1f4fa8"].forEach((c, i) => {
    const b = createParkedBoda(c);
    b.position.set(9 + i * 2, 0, 17.5);
    b.rotation.y = -0.4;
    scene.add(b);
    physics.addCircle(9 + i * 2, 17.5, 0.8);
  });
  exclude(11, 17, 6);

  // signpost
  const postTex = makeSignTexture({ title: "↑ DIGITAL", subtitle: "← MARKETING   CREATIVE →", small: "↓ BUSINESS · INNOVATION", bg: "#1b6b3a", width: 768, height: 420 });
  const signPost = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.4, 8), mat("#9a9a9a", { metalness: 0.5 }));
  pole.position.y = 1.7;
  pole.castShadow = true;
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.5), new THREE.MeshBasicMaterial({ map: postTex, toneMapped: false }));
  plate.position.y = 3.2;
  signPost.add(pole, plate);
  signPost.position.set(5.5, 0, 24);
  signPost.rotation.y = -0.2;
  scene.add(signPost);
  physics.addCircle(5.5, 24, 0.15);

  // Achievements Centre (CV)
  const cvSign = makeSignTexture({ title: "ACHIEVEMENTS CENTRE", subtitle: "CV · Experience · Skills", bg: PALETTE.cream, fg: PALETTE.ink, accent: "#b37400", width: 1024, height: 300 });
  const cvBuilding = createBuilding({ w: 12, d: 7, h: 6.5, wall: PALETTE.ink, roof: PALETTE.brand, signTex: cvSign });
  cvBuilding.position.set(-26, 0, 27);
  scene.add(cvBuilding);
  physics.addBox(-26, 27, 6, 3.5);
  mapBlocks.push({ x: -26, z: 27, w: 12, d: 7, color: PALETTE.ink });
  exclude(-26, 27, 9);
  addPad({ id: "cv", type: "cv", title: "Achievements Centre", subtitle: "CV, experience & skills", x: -26, z: 34.5, r: 2.8 });

  // Contact kiosk
  const kioskSign = makeSignTexture({ title: "CONTACT CENTRE", subtitle: "Email · Phone · WhatsApp", bg: PALETTE.ink, width: 1024, height: 256 });
  const kiosk = createKiosk(kioskSign);
  kiosk.position.set(24, 0, 27);
  scene.add(kiosk);
  physics.addBox(24, 27, 2.1, 1.6);
  mapBlocks.push({ x: 24, z: 27, w: 4.2, d: 3.2, color: PALETTE.brand });
  exclude(24, 27, 5);
  addPad({ id: "contact", type: "contact", title: "Contact Centre", subtitle: "Let's work together", x: 24, z: 33, r: 2.6 });

  // rolex stand (Ugandan street food, not the watch)
  const rolexSign = makeSignTexture({ title: "ROLEX", subtitle: "Chapati + eggs · 2,000/=", bg: "#f5efe0", fg: "#c0392b", accent: PALETTE.ink, width: 768, height: 256 });
  const rolex = createRolexStand(rolexSign);
  rolex.position.set(9, 0, 30);
  rolex.rotation.y = -0.2;
  scene.add(rolex);
  physics.addBox(9, 30, 1.2, 0.7);
  exclude(9, 30, 4);

  /* DIGITAL DISTRICT (north) --------------------------------------- */
  gateway("digital", 0, -19, 0);
  groundText(["DIGITAL"], 0, -15, 7);
  byDistrict("digital").forEach((e, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const z = -30 - Math.floor(i / 2) * 15;
    exhibitBoard(e, side * 14, z, side * -0.5, side * 7.5, z + 4);
  });
  const digitalEnd = -30 - Math.ceil(byDistrict("digital").length / 2) * 15;
  for (let z = -28; z > -96; z -= 14) {
    shop(-27, z, 9, 6, Math.PI / 2);
    shop(27, z - 7, 9, 6, -Math.PI / 2);
  }

  /* CREATIVE DISTRICT (east) --------------------------------------- */
  gateway("creative", 19, 0, -Math.PI / 2);
  groundText(["CREATIVE"], 15, 0, 7, -Math.PI / 2);
  byDistrict("creative").forEach((e, i) => {
    const side = i % 2 === 0 ? -1 : 1; // -1 north of the road, 1 south
    const x = 28 + Math.floor(i / 2) * 15;
    exhibitBoard(e, x, side * 14, 0, x, side * 7.6);
  });
  for (let x = 30; x < 98; x += 15) {
    shop(x, -27, 9, 6, 0);
    if (x < 90) shop(x + 7, 27, 9, 6, Math.PI);
  }

  /* MARKETING CITY (west) ------------------------------------------ */
  gateway("marketing", -19, 0, Math.PI / 2);
  groundText(["MARKETING"], -15, 0, 7, Math.PI / 2);
  byDistrict("marketing").forEach((e, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const x = -28 - Math.floor(i / 2) * 15;
    exhibitBoard(e, x, side * 14, 0, x, side * 7.6);
  });
  for (let x = -30; x > -98; x -= 15) shop(x, -27, 9, 6, 0);
  for (let x = -76; x > -98; x -= 15) shop(x, 27, 9, 6, Math.PI);

  /* BUSINESS DISTRICT (south) -------------------------------------- */
  gateway("business", 0, 41, Math.PI);
  groundText(["BUSINESS"], 0, 45, 7);
  byDistrict("business").forEach((e, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    // rows skip the campus road junction at z≈58
    const z = [47, 71, 84, 97][Math.floor(i / 2)] ?? 97;
    exhibitBoard(e, side * 14, z, side * -0.5, side * 7.5, z + 4);
  });

  /* INNOVATION LAB (south-east campus) ----------------------------- */
  gateway("innovation", 11, CAMPUS_ROAD_Z, -Math.PI / 2);
  byDistrict("innovation").forEach((e, i) => {
    const row = i % 2 === 0 ? -1 : 1; // north row / south row of the campus road
    const x = 26 + Math.floor(i / 2) * 15;
    exhibitBoard(e, x, CAMPUS_ROAD_Z + row * 14, 0, x, CAMPUS_ROAD_Z + row * 7.6);
  });
  // lab dome
  const dome = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat("#ece6f7", { flatShading: true }));
  dome.position.set(96, 0, CAMPUS_ROAD_Z - 16);
  dome.castShadow = true;
  scene.add(dome);
  physics.addCircle(96, CAMPUS_ROAD_Z - 16, 6);
  mapBlocks.push({ x: 96, z: CAMPUS_ROAD_Z - 16, w: 12, d: 12, color: districtColor("innovation") });
  exclude(96, CAMPUS_ROAD_Z - 16, 9);

  /* matatus parked roadside --------------------------------------- */
  const matatuSpots: [number, number, number][] = [
    [-7.2, -33.5, 0],
    [7.2, -86, Math.PI],
    [92, 7, Math.PI / 2],
    [-92, -7, -Math.PI / 2],
    [-7.5, 13, 0.1],
  ];
  matatuSpots.forEach(([x, z, ry], i) => {
    const m = createMatatu(i % 2 ? "#c8102e" : "#1f4fa8");
    m.position.set(x, 0, z);
    m.rotation.y = ry;
    scene.add(m);
    const sideways = Math.abs(Math.sin(ry)) > 0.5;
    physics.addBox(x, z, sideways ? 2.5 : 1.05, sideways ? 1.05 : 2.5);
    exclude(x, z, 4);
  });

  /* football pitch (south-west) ----------------------------------- */
  const pitchX = PITCH.x;
  const pitchZ = PITCH.z;
  const pitch = new THREE.Mesh(new THREE.PlaneGeometry(30, 40), mat("#6aa33a", { flatShading: false }));
  pitch.rotation.x = -Math.PI / 2;
  pitch.position.set(pitchX, 0.025, pitchZ);
  pitch.receiveShadow = true;
  scene.add(pitch);
  mapBlocks.push({ x: pitchX, z: pitchZ, w: 30, d: 40, color: "#6aa33a" });
  const lineWhite = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.85 });
  const pLines: [number, number, number, number][] = [
    [0, -19.8, 30, 0.25],
    [0, 19.8, 30, 0.25],
    [-14.8, 0, 0.25, 40],
    [14.8, 0, 0.25, 40],
    [0, 0, 30, 0.25],
  ];
  pLines.forEach(([x, z, w, l]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), lineWhite);
    m.rotation.x = -Math.PI / 2;
    m.position.set(pitchX + x, 0.035, pitchZ + z);
    scene.add(m);
  });
  const circle = new THREE.Mesh(new THREE.RingGeometry(4.4, 4.65, 40), lineWhite);
  circle.rotation.x = -Math.PI / 2;
  circle.position.set(pitchX, 0.035, pitchZ);
  scene.add(circle);
  const goal = createGoal();
  const goalZ = pitchZ + 19.8;
  goal.position.set(pitchX, 0, goalZ);
  goal.rotation.y = Math.PI; // net extends away from the pitch
  scene.add(goal);
  physics.addCircle(pitchX - 3.6, goalZ, 0.2);
  physics.addCircle(pitchX + 3.6, goalZ, 0.2);
  physics.addBox(pitchX, goalZ + 1.9, 3.7, 0.1);
  physics.addBox(pitchX - 3.7, goalZ + 0.95, 0.1, 1);
  physics.addBox(pitchX + 3.7, goalZ + 0.95, 0.1, 1);
  exclude(pitchX, pitchZ, 25);
  addPad({ id: "pitch", type: "pitch", title: "Football", subtitle: "Score a goal for a surprise", x: pitchX + 12, z: 42, r: 2 });

  /* ramps ---------------------------------------------------------- */
  function ramp(x: number, z: number, hw: number, hl: number, height: number, axis: "x" | "z", dir: -1 | 1) {
    physics.ramps.push({ x, z, hw, hl, height, axis, dir });
    // built rising toward -z, then turned to face its direction
    const geo = new THREE.BufferGeometry();
    const v = new Float32Array([-hw, 0, hl, hw, 0, hl, hw, height, -hl, -hw, height, -hl, -hw, 0, -hl, hw, 0, -hl]);
    geo.setAttribute("position", new THREE.BufferAttribute(v, 3));
    geo.setIndex([0, 1, 2, 0, 2, 3, 3, 2, 5, 3, 5, 4, 0, 3, 4, 1, 5, 2]);
    geo.computeVertexNormals();
    const g = new THREE.Group();
    const m = new THREE.Mesh(geo, mat(PALETTE.brand, { side: THREE.DoubleSide }));
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    const tilt = Math.atan(height / (2 * hl));
    for (let i = 0; i < 3; i++) {
      const t = (i + 0.5) / 3;
      const s = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2, 0.35), new THREE.MeshBasicMaterial({ color: PALETTE.ink }));
      s.position.set(0, t * height + 0.03, hl - 2 * hl * t);
      s.rotation.x = -Math.PI / 2 + tilt;
      g.add(s);
    }
    g.position.set(x, 0, z);
    g.rotation.y = axis === "z" ? (dir === -1 ? 0 : Math.PI) : dir === -1 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(g);
    mapBlocks.push({ x, z, w: axis === "z" ? hw * 2 : hl * 2, d: axis === "z" ? hl * 2 : hw * 2, color: PALETTE.brand });
    exclude(x, z, Math.max(hw, hl) + 3);
  }
  ramp(0, -52, 3.2, 5, 2.2, "z", -1);
  ramp(48, CAMPUS_ROAD_Z, 3.2, 5, 2.2, "x", 1);
  ramp(pitchX, 36, 3, 4.5, 1.8, "z", 1);
  ramp(-60, 0, 3.2, 5, 2.2, "x", -1);

  /* props ---------------------------------------------------------- */
  function addProp(model: THREE.Object3D, x: number, z: number, o: { r: number; h: number; mass: number; bounce?: number; kind: string; ball?: boolean; yaw?: number }) {
    const pivot = new THREE.Group();
    model.position.y = -o.h / 2;
    pivot.add(model);
    pivot.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) (c as THREE.Mesh).castShadow = true;
    });
    const yaw = o.yaw ?? r() * Math.PI * 2;
    pivot.rotation.y = yaw;
    pivot.position.set(x, o.h / 2, z);
    scene.add(pivot);
    const p: Prop = {
      mesh: pivot,
      x,
      z,
      y: 0,
      vx: 0,
      vz: 0,
      vy: 0,
      r: o.r,
      height: o.h,
      mass: o.mass,
      bounce: o.bounce ?? 0.3,
      spin: new THREE.Vector3(),
      yaw,
      kind: o.kind,
      home: { x, z },
      ball: o.ball,
      yOffset: o.h / 2,
    };
    physics.props.push(p);
    return p;
  }

  // skill crates by the Achievements Centre
  const toolColors = ["#d6402b", "#2e86c1", "#27ae60", "#8e44ad", "#e67e22", "#151515", "#16a085"];
  opts.tools.forEach((t, i) => {
    const row = Math.floor(i / 5);
    const col = i % 5;
    const color = toolColors[i % toolColors.length];
    const crate = createCrate(makeLabelTexture(t, color), color, 0.95);
    addProp(crate, -42 + col * 1.05 + (row % 2) * 0.5, 29 + row * 1.1, { r: 0.55, h: 0.95, mass: 1.2, kind: "crate", yaw: 0 });
  });
  exclude(-40, 30, 5);

  // cone slalom by the pitch
  for (let i = 0; i < 7; i++) addProp(createCone(), pitchX - 18, 48 + i * 5, { r: 0.3, h: 0.8, mass: 0.4, bounce: 0.4, kind: "cone", yaw: 0 });
  // cones closing the digital road
  for (let i = -2; i <= 2; i++) addProp(createCone(), i * 1.6, digitalEnd - 4, { r: 0.3, h: 0.8, mass: 0.4, kind: "cone", yaw: 0 });

  // jerrycans by the kiosk and the rolex stand
  const jerryColors = ["#f2c200", "#f2c200", "#2e86c1", "#27ae60"];
  for (let i = 0; i < 6; i++) addProp(createJerrycan(jerryColors[i % 4]), 27.5 + (i % 3) * 0.7, 29 + Math.floor(i / 3) * 0.6, { r: 0.32, h: 0.7, mass: 0.6, kind: "jerrycan" });
  for (let i = 0; i < 4; i++) addProp(createJerrycan(jerryColors[i % 4]), 11 + i * 0.7, 31.8, { r: 0.32, h: 0.7, mass: 0.6, kind: "jerrycan" });

  // soda crates at the boda stage
  for (let i = 0; i < 6; i++) {
    const c = createCrate(undefined, i % 2 ? "#c8102e" : "#1f4fa8", 0.7);
    addProp(c, 15.5 + (i % 2) * 0.75, 20.5 + Math.floor(i / 2) * 0.75, { r: 0.4, h: 0.7, mass: 0.8, kind: "crate" });
  }

  const ball = addProp(createBall(), pitchX, pitchZ, { r: 0.42, h: 0.84, mass: 0.35, bounce: 0.7, kind: "ball", ball: true });

  /* trees, matooke and the horizon -------------------------------- */
  function onRoad(x: number, z: number, pad: number) {
    for (const rd of mapRoads) if (Math.abs(x - rd.x) < rd.w / 2 + pad && Math.abs(z - rd.z) < rd.d / 2 + pad) return true;
    return false;
  }
  function free(x: number, z: number, rad: number) {
    if (onRoad(x, z, rad + 2.5)) return false;
    for (const e of exclusions) if (Math.hypot(x - e.x, z - e.z) < e.r + rad) return false;
    for (const c of physics.colliders) {
      if (c.kind === "box" && Math.abs(x - c.x) < c.hw + rad + 1 && Math.abs(z - c.z) < c.hd + rad + 1) return false;
    }
    return true;
  }
  let placed = 0;
  for (let tries = 0; tries < 2000 && placed < 110; tries++) {
    const x = (r() - 0.5) * 204;
    const z = (r() - 0.5) * 204;
    if (!free(x, z, 1.6)) continue;
    const banana = r() > 0.55;
    const s = 0.8 + r() * 0.6;
    const t = banana ? createBanana(s) : createTree(s);
    t.position.set(x, 0, z);
    t.rotation.y = r() * Math.PI * 2;
    scene.add(t);
    physics.addCircle(x, z, banana ? 0.3 : 0.45 * s);
    exclusions.push({ x, z, r: 2.2 });
    placed++;
  }
  // rolling hills beyond the edge (Kampala's seven hills, give or take)
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const d = 128 + r() * 20;
    const hill = new THREE.Mesh(new THREE.IcosahedronGeometry(18 + r() * 14, 1), mat(r() > 0.5 ? "#5f8a2f" : "#6f9a3a"));
    hill.position.set(Math.cos(a) * d, -6, Math.sin(a) * d);
    hill.scale.y = 0.55;
    scene.add(hill);
  }
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * Math.PI * 2;
    const side = Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a)));
    const d = 112 / side;
    const t = createTree(1.2 + r() * 0.5);
    t.position.set(Math.cos(a) * d + (r() - 0.5) * 3, 0, Math.sin(a) * d + (r() - 0.5) * 3);
    scene.add(t);
  }

  /* mini-map ------------------------------------------------------- */
  const areaTint: { id: DistrictKey; x: number; z: number; w: number; d: number }[] = [
    { id: "digital", x: 0, z: -60, w: 64, d: 84 },
    { id: "creative", x: 60, z: 0, w: 84, d: 60 },
    { id: "marketing", x: -60, z: 0, w: 84, d: 60 },
    { id: "business", x: 0, z: 70, w: 40, d: 64 },
    { id: "innovation", x: 62, z: CAMPUS_ROAD_Z, w: 84, d: 46 },
  ];
  function drawMapTo(ctx: CanvasRenderingContext2D, size: number, o: { labels?: boolean; bike?: { x: number; z: number; h: number } }) {
    const s = size / (BOUNDS * 2);
    const X = (x: number) => (x + BOUNDS) * s;
    const Z = (z: number) => (z + BOUNDS) * s;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#c4683a";
    ctx.fillRect(0, 0, size, size);
    for (const a of areaTint) {
      ctx.fillStyle = districtColor(a.id) + "38";
      ctx.fillRect(X(a.x - a.w / 2), Z(a.z - a.d / 2), a.w * s, a.d * s);
    }
    for (const b of mapBlocks) {
      ctx.fillStyle = b.color;
      ctx.fillRect(X(b.x - b.w / 2), Z(b.z - b.d / 2), b.w * s, b.d * s);
    }
    ctx.fillStyle = "#3d3b3e";
    for (const rd of mapRoads) ctx.fillRect(X(rd.x - rd.w / 2), Z(rd.z - rd.d / 2), rd.w * s, rd.d * s);
    ctx.fillStyle = PALETTE.grass;
    ctx.beginPath();
    ctx.arc(X(0), Z(0), 5 * s, 0, Math.PI * 2);
    ctx.fill();
    for (const z of zones) {
      const c = z.district ? districtColor(z.district) : PALETTE.brand;
      ctx.fillStyle = c;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Math.max(1, size / 220);
      ctx.beginPath();
      ctx.arc(X(z.x), Z(z.z), Math.max(2.5, z.r * s * 1.1) * (z.type === "exhibit" ? 1 : 1.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    if (o.labels) {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `800 ${Math.round(size / 26)}px system-ui, sans-serif`;
      const labels: [string, number, number][] = [
        ...opts.districts.map((d) => {
          const a = areaTint.find((t) => t.id === d.id)!;
          return [d.name, a.x, a.z + (d.id === "digital" ? -30 : d.id === "business" ? 22 : 0)] as [string, number, number];
        }),
        ["Start", 0, 30],
        ["CV", -26, 22],
        ["Contact", 24, 22],
        ["Football", pitchX, pitchZ],
      ];
      for (const [t, x, z] of labels) {
        ctx.lineWidth = size / 110;
        ctx.strokeStyle = "rgba(21,21,21,0.85)";
        ctx.strokeText(t, X(x), Z(z));
        ctx.fillStyle = "#ffffff";
        ctx.fillText(t, X(x), Z(z));
      }
    }
    if (o.bike) {
      const { x, z, h } = o.bike;
      ctx.save();
      ctx.translate(X(x), Z(z));
      ctx.rotate(-h);
      const k = Math.max(5, size / 30);
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = Math.max(1.5, size / 150);
      ctx.beginPath();
      ctx.moveTo(0, -k);
      ctx.lineTo(k * 0.7, k * 0.8);
      ctx.lineTo(0, k * 0.4);
      ctx.lineTo(-k * 0.7, k * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
  function prepCanvas(c: HTMLCanvasElement) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = Math.round((c.clientWidth || 140) * dpr);
    if (c.width !== size) {
      c.width = size;
      c.height = size;
    }
    return size;
  }
  let minimapTimer = 0;
  function updateMinimap(dt: number) {
    const c = opts.minimap;
    if (!c) return;
    minimapTimer -= dt;
    if (minimapTimer > 0) return;
    minimapTimer = 0.1;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    drawMapTo(ctx, prepCanvas(c), { bike: { x: bike.x, z: bike.z, h: bike.h } });
  }

  let currentDistrict: AreaId | null = null;

  /* the player's boda --------------------------------------------- */
  const boda = createBoda();
  scene.add(boda.root);

  const dustMats = ["#d9a27a", "#c98a5e", "#e6b894"].map((c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55, depthWrite: false }));
  const dust = new Particles(90, new THREE.IcosahedronGeometry(1, 0), dustMats);
  const smoke = new Particles(40, new THREE.IcosahedronGeometry(1, 0), ["#bdbdbd", "#d6d6d6"].map((c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.4, depthWrite: false })));
  const confettiMats = [PALETTE.brand, "#c8102e", "#151515", "#1f4fa8", "#27ae60", "#ffffff"].map((c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
  const confetti = new Particles(160, new THREE.PlaneGeometry(1, 0.6), confettiMats);
  scene.add(dust.group, smoke.group, confetti.group);

  const bike = {
    x: SPAWN.x,
    z: SPAWN.z,
    y: 0,
    vy: 0,
    h: SPAWN.h,
    speed: 0,
    steer: 0,
    lean: 0,
    pitch: 0,
    airborne: false,
    airTime: 0,
    wheelSpin: 0,
    bounce: 0,
  };

  /* input ---------------------------------------------------------- */
  const keys = new Set<string>();
  let touch: TouchInput = { x: 0, y: 0, active: false };
  let touchBoost = false;
  let paused = false;
  let started = false;
  let activeZone: Zone | null = null;

  const onKeyDown = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
    if (paused) return;
    keys.add(k);
    if (k === "h") audio.horn();
    if (k === "enter" && activeZone) opts.onActivate?.(activeZone);
    if (k === "r") resetBike();
  };
  const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
  const onBlur = () => keys.clear();
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  let zoom = 1;
  const onWheel = (e: WheelEvent) => {
    zoom = THREE.MathUtils.clamp(zoom + e.deltaY * 0.0012, 0.6, 1.6);
  };
  canvas.addEventListener("wheel", onWheel, { passive: true });

  function readControls() {
    let throttle = 0;
    let steer = 0;
    let brake = false;
    let boost = touchBoost;
    if (paused) return { throttle, steer, brake, boost: false };
    if (keys.has("w") || keys.has("arrowup") || keys.has("z")) throttle += 1;
    if (keys.has("s") || keys.has("arrowdown")) throttle -= 1;
    if (keys.has("a") || keys.has("arrowleft") || keys.has("q")) steer += 1;
    if (keys.has("d") || keys.has("arrowright")) steer -= 1;
    if (keys.has(" ")) brake = true;
    if (keys.has("shift")) boost = true;

    if (touch.active) {
      const mag = Math.min(1, Math.hypot(touch.x, touch.y));
      if (mag > 0.12) {
        const desired = Math.atan2(-touch.x, -touch.y);
        const diff = wrapAngle(desired - bike.h);
        steer = THREE.MathUtils.clamp(diff * 2.4, -1, 1);
        throttle = mag * (Math.abs(diff) < 1.9 ? 1 : 0.35);
      }
    }
    return { throttle, steer, brake, boost };
  }

  /* audio ---------------------------------------------------------- */
  const audio = new WorldAudio();
  try {
    audio.muted = localStorage.getItem("joel-world-muted") === "1";
  } catch {
    /* storage unavailable */
  }

  /* camera --------------------------------------------------------- */
  const camTarget = new THREE.Vector3(bike.x, 0, bike.z);
  const camPos = new THREE.Vector3();
  let shake = 0;
  let introT = 0; // 0 → 1 fly-in after start

  function cameraOffset() {
    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    const portrait = aspect < 0.9;
    const base = portrait ? new THREE.Vector3(0, 33, 26) : new THREE.Vector3(0, 19, 18.5);
    return base.multiplyScalar(zoom);
  }

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.9 ? 46 : 40;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  /* gameplay helpers ---------------------------------------------- */
  function resetBike(target: { x: number; z: number; h: number } = SPAWN) {
    bike.x = target.x;
    bike.z = target.z;
    bike.h = target.h;
    bike.speed = 0;
    bike.y = 0;
    bike.vy = 0;
    bike.airborne = false;
    camTarget.set(bike.x, 0, bike.z);
  }

  let goalCooldown = 0;
  function checkGoal(dt: number) {
    goalCooldown = Math.max(0, goalCooldown - dt);
    if (goalCooldown > 0) return;
    if (Math.abs(ball.x - pitchX) < 3.4 && ball.z > goalZ + 0.3 && ball.z < goalZ + 1.85 && ball.y < 2.2) {
      goalCooldown = 4;
      opts.onToast?.("GOOOAL! ⚽  Uganda Cranes would be proud");
      audio.chime([523, 659, 784, 1046, 1318]);
      const pos = new THREE.Vector3();
      for (let i = 0; i < 120; i++) {
        pos.set(pitchX + (Math.random() - 0.5) * 7, 1 + Math.random() * 2, goalZ - 1);
        confetti.emit(pos, new THREE.Vector3((Math.random() - 0.5) * 10, 6 + Math.random() * 9, -Math.random() * 8), {
          life: 2.4,
          scale: 0.3,
          grow: 0,
          gravity: 9,
          spin: 12,
        });
      }
      setTimeout(() => {
        ball.x = pitchX;
        ball.z = pitchZ;
        ball.y = 0;
        ball.vx = ball.vz = 0;
        ball.vy = 4;
      }, 2200);
    }
  }

  const tmpV = new THREE.Vector3();
  const tmpV2 = new THREE.Vector3();
  let emitAcc = 0;

  function updateBike(dt: number) {
    const c = readControls();
    const maxSpeed = c.boost ? 23 : 15;
    const onGround = !bike.airborne;

    if (onGround) {
      if (c.throttle > 0) {
        if (bike.speed < 0) bike.speed += 30 * dt; // braking out of reverse
        bike.speed += (c.boost ? 22 : 13) * c.throttle * dt;
      } else if (c.throttle < 0) {
        if (bike.speed > 0.5) bike.speed -= 28 * dt;
        else bike.speed -= 9 * -c.throttle * dt;
      }
      if (c.brake) bike.speed -= Math.sign(bike.speed) * Math.min(Math.abs(bike.speed), 32 * dt);
      // drag + rolling resistance
      bike.speed -= bike.speed * 0.55 * dt;
      if (c.throttle === 0) bike.speed -= Math.sign(bike.speed) * Math.min(Math.abs(bike.speed), 3 * dt);
      bike.speed = THREE.MathUtils.clamp(bike.speed, -6, maxSpeed + (bike.speed > maxSpeed ? 0.3 : 0));
      if (bike.speed > maxSpeed) bike.speed -= 12 * dt;

      const speedFactor = THREE.MathUtils.clamp(Math.abs(bike.speed) / 5, 0, 1);
      const highSpeedDamp = 1 - 0.35 * THREE.MathUtils.clamp(Math.abs(bike.speed) / 23, 0, 1);
      bike.h += c.steer * 2.5 * speedFactor * highSpeedDamp * Math.sign(bike.speed || 1) * dt;
    }
    bike.steer += (c.steer - bike.steer) * Math.min(1, 10 * dt);

    const fx = -Math.sin(bike.h);
    const fz = -Math.cos(bike.h);
    const prevGround = physics.heightAt(bike.x, bike.z);
    bike.x += fx * bike.speed * dt;
    bike.z += fz * bike.speed * dt;

    // collisions
    const pos = { x: bike.x, z: bike.z };
    const hit = physics.resolveStatic(pos, 0.75);
    bike.x = pos.x;
    bike.z = pos.z;
    if (hit) {
      const vn = (fx * hit.nx + fz * hit.nz) * bike.speed;
      if (vn < -0.5) {
        const strength = -vn;
        // slide along the wall, lose speed
        bike.speed *= 0.35 + 0.5 * (1 - Math.min(1, strength / 15));
        if (strength > 4) {
          audio.impact(strength);
          shake = Math.min(1, shake + strength * 0.05);
          bike.bounce = Math.min(0.4, strength * 0.025);
          if (bike.speed > 0) bike.speed = -Math.min(3, strength * 0.15);
        }
      }
    }

    // props
    for (const p of physics.props) {
      const dx = p.x - bike.x;
      const dz = p.z - bike.z;
      const min = 0.85 + p.r;
      if (Math.abs(dx) > min || Math.abs(dz) > min) continue;
      if (p.y > bike.y + 1.6 || bike.y > p.y + p.height) continue;
      const d = Math.hypot(dx, dz);
      if (d >= min || d === 0) continue;
      const nx = dx / d;
      const nz = dz / d;
      const bvx = fx * bike.speed;
      const bvz = fz * bike.speed;
      const rel = (bvx - p.vx) * nx + (bvz - p.vz) * nz;
      p.x = bike.x + nx * min;
      p.z = bike.z + nz * min;
      if (rel > 0) {
        const kick = rel * (1.25 + (p.ball ? 0.5 : 0)) / Math.max(0.35, p.mass * 0.9);
        p.vx += nx * kick + bvx * 0.25;
        p.vz += nz * kick + bvz * 0.25;
        p.vy += Math.min(9, (p.ball ? 2.5 : 2) + rel * (p.ball ? 0.3 : 0.4));
        if (!p.ball) p.spin.set((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2).normalize().multiplyScalar(4 + rel * 1.2);
        bike.speed *= p.ball ? 0.97 : 0.9;
        if (rel > 2) audio.impact(rel * 0.4);
      }
    }

    // vertical: ramps & jumps
    const groundH = physics.heightAt(bike.x, bike.z);
    if (!bike.airborne) {
      if (groundH + 0.05 < prevGround && Math.abs(bike.speed) > 4) {
        // left the top of a ramp: launch
        bike.airborne = true;
        bike.airTime = 0;
        const slope = (prevGround - groundH) / Math.max(0.001, Math.abs(bike.speed) * dt);
        bike.vy = Math.min(14, Math.abs(bike.speed) * Math.max(0.35, Math.min(0.6, slope)) * 0.9 + 2);
        bike.y = prevGround;
      } else {
        bike.y = groundH;
        const slope = (groundH - prevGround) / Math.max(0.001, Math.abs(bike.speed * dt) || 1);
        bike.pitch += (Math.atan(Math.max(-1, Math.min(1, slope))) * Math.sign(bike.speed || 1) - bike.pitch) * Math.min(1, 12 * dt);
      }
    }
    if (bike.airborne) {
      bike.airTime += dt;
      bike.vy -= 24 * dt;
      bike.y += bike.vy * dt;
      bike.pitch += (0.18 - bike.pitch) * Math.min(1, 2 * dt);
      if (bike.y <= groundH) {
        const impact = -bike.vy;
        bike.y = groundH;
        bike.vy = 0;
        bike.airborne = false;
        bike.bounce = Math.min(0.5, impact * 0.03);
        shake = Math.min(1, shake + impact * 0.035);
        audio.impact(impact * 0.6);
        for (let i = 0; i < 18; i++) {
          tmpV.set(bike.x + (Math.random() - 0.5) * 1.5, 0.2, bike.z + (Math.random() - 0.5) * 1.5);
          dust.emit(tmpV, tmpV2.set((Math.random() - 0.5) * 6, 1 + Math.random() * 2, (Math.random() - 0.5) * 6), { life: 0.9, scale: 0.22, grow: 2.2 });
        }
        if (bike.airTime > 0.9) opts.onToast?.(bike.airTime > 1.3 ? "Massive air! 🚀" : "Nice jump!");
      }
    }

    // visuals
    const leanTarget = onGround ? bike.steer * 0.42 * THREE.MathUtils.clamp(Math.abs(bike.speed) / 10, 0, 1) * Math.sign(bike.speed || 1) : bike.lean * 0.98;
    bike.lean += (leanTarget - bike.lean) * Math.min(1, 6 * dt);
    bike.bounce *= Math.max(0, 1 - 6 * dt);
    bike.wheelSpin += (bike.speed / 0.43) * dt;

    boda.root.position.set(bike.x, bike.y + Math.abs(Math.sin(performance.now() * 0.02)) * bike.bounce * 0.4, bike.z);
    boda.root.rotation.y = bike.h;
    boda.lean.rotation.z = bike.lean;
    boda.lean.rotation.x = bike.pitch;
    boda.frontWheel.rotation.x = -bike.wheelSpin;
    boda.rearWheel.rotation.x = -bike.wheelSpin;
    boda.steerGroup.rotation.y = bike.steer * 0.45;
    boda.rider.rotation.x = -Math.max(0, bike.speed / 23) * 0.12;
    const braking = c.brake || (c.throttle < 0 && bike.speed > 0.5);
    (boda.tailLight.material as THREE.MeshStandardMaterial).emissiveIntensity = braking ? 3 : 0.6;

    // particles
    emitAcc += dt;
    if (emitAcc > 0.035) {
      emitAcc = 0;
      const sp = Math.abs(bike.speed);
      if (onGround && (sp > 6 || (sp > 3 && Math.abs(bike.steer) > 0.6))) {
        boda.rearContact.getWorldPosition(tmpV);
        dust.emit(tmpV, tmpV2.set(-fx * sp * 0.2 + (Math.random() - 0.5), 0.6 + Math.random(), -fz * sp * 0.2 + (Math.random() - 0.5)), {
          life: 0.7 + Math.random() * 0.4,
          scale: 0.08 + Math.random() * 0.07,
          grow: 2.2,
        });
      }
      if (c.throttle > 0.1 || c.boost) {
        boda.exhaust.getWorldPosition(tmpV);
        smoke.emit(tmpV, tmpV2.set(-fx * 1.5, 0.8, -fz * 1.5), { life: 0.5, scale: c.boost ? 0.09 : 0.06, grow: 2.5 });
      }
    }

    audio.updateEngine(bike.speed, Math.max(0, c.throttle) + (c.boost ? 0.3 : 0), c.boost, bike.airborne);

    // zones
    let found: Zone | null = null;
    for (const z of zones) {
      if (Math.hypot(bike.x - z.x, bike.z - z.z) < z.r) {
        found = z;
        break;
      }
    }
    if (found !== activeZone) {
      activeZone = found;
      if (found) audio.chime([660, 880]);
      opts.onZone?.(found);
    }
    const d = districtAt(bike.x, bike.z);
    if (d !== currentDistrict) {
      currentDistrict = d;
      opts.onDistrict?.(d);
    }
  }

  function updatePads(t: number) {
    padMeshes.forEach((pad, id) => {
      const active = activeZone?.id === id;
      const m = pad.material as THREE.MeshBasicMaterial;
      const target = active ? 0.55 + Math.sin(t * 6) * 0.1 : 0.2 + Math.sin(t * 2 + pad.position.x) * 0.06;
      m.opacity += (target - m.opacity) * 0.2;
      const zone = zones.find((z) => z.id === id)!;
      const s = zone.r * (active ? 1.08 : 1);
      pad.scale.x += (s - pad.scale.x) * 0.2;
      pad.scale.y = pad.scale.x;
    });
  }

  function updateCamera(dt: number) {
    const look = Math.min(1, Math.abs(bike.speed) / 15) * 3.5 * Math.sign(bike.speed);
    tmpV.set(bike.x - Math.sin(bike.h) * look, bike.y * 0.5, bike.z - Math.cos(bike.h) * look);
    camTarget.lerp(tmpV, 1 - Math.exp(-5 * dt));
    const off = cameraOffset();
    // intro: start high and swoop down
    const intro = 1 - Math.pow(1 - Math.min(1, introT), 3);
    off.multiplyScalar(1 + (1 - intro) * 1.6);
    off.x += (1 - intro) * 18;
    camPos.copy(camTarget).add(off);
    if (shake > 0.001) {
      camPos.x += (Math.random() - 0.5) * shake * 0.8;
      camPos.y += (Math.random() - 0.5) * shake * 0.8;
      shake *= Math.max(0, 1 - 6 * dt);
    }
    camera.position.copy(camPos);
    camera.lookAt(camTarget);
    sun.position.copy(camTarget).add(SUN_OFFSET);
    sun.target.position.copy(camTarget);
  }

  /* loop ----------------------------------------------------------- */
  let last = performance.now();
  let raf = 0;
  let elapsed = 0;
  let visible = true;
  function frame() {
    raf = requestAnimationFrame(frame);
    if (!visible) return;
    const now = performance.now();
    // real time, capped; simulated in fixed sub-steps so slow phones don't play in slow motion
    const frameDt = Math.min((now - last) / 1000, 0.1);
    last = now;
    const steps = Math.max(1, Math.ceil(frameDt / (1 / 60)));
    const dt = frameDt / steps;
    elapsed += frameDt;
    if (started) {
      introT += frameDt / 1.8;
      for (let i = 0; i < steps; i++) {
        updateBike(dt);
        physics.stepProps(dt, (s) => audio.impact(s));
      }
      checkGoal(frameDt);
    } else {
      // idle orbit behind the loader
      boda.root.position.set(bike.x, 0, bike.z);
      boda.root.rotation.y = bike.h;
    }
    updateBoards(frameDt, bike.x, bike.z);
    updateMinimap(frameDt);
    dust.update(frameDt);
    smoke.update(frameDt);
    confetti.update(frameDt);
    updatePads(elapsed);
    updateCamera(frameDt);
    renderer.render(scene, camera);
  }
  frame();

  const onVis = () => {
    visible = document.visibilityState === "visible";
    if (visible) {
      last = performance.now();
      if (started) audio.resume();
    } else audio.suspend();
  };
  document.addEventListener("visibilitychange", onVis);

  // the world is procedural, so it's ready after the first frames compile
  const readyTimeout = setTimeout(readyOnce, 350);

  const handle: WorldHandle = {
    start() {
      if (started) return;
      started = true;
      audio.start();
      audio.setMuted(audio.muted);
      setTimeout(() => audio.horn(), 600);
    },
    setTouch(t) {
      touch = t;
    },
    setBoost(b) {
      touchBoost = b;
    },
    horn() {
      if (!paused) audio.horn();
    },
    teleport(t) {
      resetBike(TELEPORTS[t]);
      shake = 0.3;
      introT = 1;
    },
    setMuted(m) {
      audio.setMuted(m);
      try {
        localStorage.setItem("joel-world-muted", m ? "1" : "0");
      } catch {
        /* ignore */
      }
    },
    setPaused(p) {
      paused = p;
      if (p) {
        keys.clear();
        touch = { x: 0, y: 0, active: false };
        touchBoost = false;
      }
    },
    getZones: () => zones.slice(),
    drawMap(c, o) {
      const ctx = c.getContext("2d");
      if (!ctx) return;
      drawMapTo(ctx, prepCanvas(c), { labels: o?.labels ?? true, bike: { x: bike.x, z: bike.z, h: bike.h } });
    },
    destroy() {
      cancelAnimationFrame(raf);
      clearTimeout(readyTimeout);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("wheel", onWheel);
      document.removeEventListener("visibilitychange", onVis);
      audio.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose();
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          mats.forEach((mm) => {
            const mb = mm as THREE.MeshBasicMaterial;
            mb.map?.dispose();
            mb.dispose();
          });
        }
      });
      renderer.dispose();
    },
  };
  // test hook: ?debug in the URL exposes the world for automated checks
  if (typeof location !== "undefined" && location.search.includes("debug")) {
    (window as unknown as Record<string, unknown>).__joelWorld = { handle, bike, zones, physics };
  }
  return handle;
}
