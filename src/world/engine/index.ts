import * as THREE from "three";
import { WorldAudio } from "./audio";
import { makeGroundTextTexture, makeLabelTexture, makePosterTexture, makeSignTexture } from "./canvasTextures";
import {
  PALETTE,
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

export type WorldProject = {
  slug: string;
  title: string;
  category: string;
  year: string;
  image?: string;
};

export type ZoneType = "project" | "about" | "contact" | "pitch";

export type Zone = {
  id: string;
  type: ZoneType;
  title: string;
  subtitle: string;
  slug?: string;
  x: number;
  z: number;
  r: number;
};

export type TeleportTarget = "spawn" | "work" | "about" | "contact" | "pitch";

export type WorldOptions = {
  projects: WorldProject[];
  tools: string[];
  resolveAsset?: (path: string) => string;
  onProgress?: (p: number) => void;
  onReady?: () => void;
  onZone?: (zone: Zone | null) => void;
  onActivate?: (zone: Zone) => void;
  onToast?: (text: string) => void;
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

const SPAWN = { x: 0, z: 26, h: 0 };
const TELEPORTS: Record<TeleportTarget, { x: number; z: number; h: number }> = {
  spawn: SPAWN,
  work: { x: 0, z: -20, h: 0 },
  about: { x: 22, z: 1.5, h: -Math.PI / 2 },
  contact: { x: -22, z: 1.5, h: Math.PI / 2 },
  pitch: { x: 0, z: 50, h: Math.PI },
};

/* ------------------------------------------------------------------ */
/* World                                                               */
/* ------------------------------------------------------------------ */

export function createWorld(canvas: HTMLCanvasElement, opts: WorldOptions): WorldHandle {
  const resolve = opts.resolveAsset ?? ((p: string) => p);
  const isTouch = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;

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
  scene.fog = new THREE.Fog(PALETTE.sky, 70, 150);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 400);

  /* lights: warm Kampala afternoon --------------------------------- */
  const hemi = new THREE.HemisphereLight("#fff4dc", "#b5653a", 1.4);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight("#ffe2b0", 2.6);
  sun.castShadow = true;
  const shadowSize = isTouch ? 1024 : 2048;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  const sc = sun.shadow.camera as THREE.OrthographicCamera;
  sc.left = -34;
  sc.right = 34;
  sc.top = 34;
  sc.bottom = -34;
  sc.near = 1;
  sc.far = 120;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const SUN_OFFSET = new THREE.Vector3(-22, 40, 18);

  /* loading -------------------------------------------------------- */
  const manager = new THREE.LoadingManager();
  let loadTotal = 0;
  manager.onProgress = (_url, loaded, total) => opts.onProgress?.(total ? loaded / total : 1);
  manager.onLoad = () => readyOnce();
  let readyFired = false;
  const readyOnce = () => {
    if (readyFired) return;
    readyFired = true;
    opts.onProgress?.(1);
    opts.onReady?.();
  };
  const texLoader = new THREE.TextureLoader(manager);

  const physics = new PhysicsWorld();
  const zones: Zone[] = [];
  const padMeshes = new Map<string, THREE.Mesh>();
  const r = rng(7);
  const exclusions: { x: number; z: number; r: number }[] = [];
  const exclude = (x: number, z: number, rad: number) => exclusions.push({ x, z, r: rad });

  /* ground --------------------------------------------------------- */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), mat(PALETTE.earth, { flatShading: false }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // grass patches
  const grassGeo = new THREE.CircleGeometry(1, 7);
  for (let i = 0; i < 70; i++) {
    const x = (r() - 0.5) * 210;
    const z = (r() - 0.5) * 210;
    if (Math.abs(x) < 8 || Math.abs(z) < 8) continue;
    const g = new THREE.Mesh(grassGeo, mat(r() > 0.5 ? PALETTE.grass : PALETTE.grassDark, { flatShading: false }));
    g.rotation.x = -Math.PI / 2;
    g.rotation.z = r() * Math.PI;
    g.position.set(x, 0.01, z);
    g.scale.set(3 + r() * 7, 2 + r() * 5, 1);
    g.receiveShadow = true;
    scene.add(g);
  }

  // darker murram patches and stones so the red earth isn't flat
  for (let i = 0; i < 60; i++) {
    const x = (r() - 0.5) * 220;
    const z = (r() - 0.5) * 220;
    const g = new THREE.Mesh(grassGeo, mat(r() > 0.5 ? PALETTE.earthDark : "#cf7646", { flatShading: false }));
    g.rotation.x = -Math.PI / 2;
    g.rotation.z = r() * Math.PI;
    g.position.set(x, 0.005, z);
    g.scale.set(4 + r() * 9, 3 + r() * 6, 1);
    g.receiveShadow = true;
    scene.add(g);
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
  function road(x: number, z: number, w: number, l: number, alongZ: boolean) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(alongZ ? w : l, alongZ ? l : w), roadMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.02, z);
    m.receiveShadow = true;
    scene.add(m);
    const len = l;
    for (let d = -len / 2 + 2; d < len / 2 - 1; d += 4) {
      const ln = new THREE.Mesh(new THREE.PlaneGeometry(alongZ ? 0.25 : 2, alongZ ? 2 : 0.25), lineMat);
      ln.rotation.x = -Math.PI / 2;
      ln.position.set(alongZ ? x : x + d, 0.03, alongZ ? z + d : z);
      scene.add(ln);
    }
  }
  road(0, -57, 8, 90, true); // north
  road(0, 33, 8, 22, true); // south to pitch
  road(58, 0, 8, 92, false); // east
  road(-58, 0, 8, 92, false); // west

  // roundabout
  const ring = new THREE.Mesh(new THREE.CircleGeometry(13, 40), roadMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.021;
  ring.receiveShadow = true;
  scene.add(ring);
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
  groundText(["WORK"], 0, -17, 7);
  groundText(["ABOUT"], 17, 0, 7, -Math.PI / 2);
  groundText(["CONTACT"], -17, 0, 7, Math.PI / 2);
  groundText(["FOOTBALL"], 0, 40, 7, 0, PALETTE.brand);

  /* welcome area --------------------------------------------------- */
  const welcomeTex = makeSignTexture({
    title: "Hi, I'm Joel",
    subtitle: "Designer & Developer · Kampala",
    small: "Hop on the boda and ride around to explore my work",
    bg: PALETTE.ink,
  });
  const welcome = createBillboard(welcomeTex, 9, 4.5);
  welcome.group.position.set(-13, 0, 18);
  welcome.group.rotation.y = 0.35;
  scene.add(welcome.group);
  physics.addCircle(-13 + Math.cos(0.35) * -3.9, 18 + Math.sin(0.35) * 3.9, 0.35);
  physics.addCircle(-13 + Math.cos(0.35) * 3.9, 18 - Math.sin(0.35) * 3.9, 0.35);
  exclude(-13, 18, 7);

  const controlsTex = makeSignTexture({
    title: isTouch ? "Drag to ride" : "W A S D  /  ← ↑ → ↓",
    subtitle: isTouch ? "Hold ⚡ to boost · tap 📯 to hoot" : "Shift boost · Space brake · H hoot",
    small: isTouch ? "Stop on a glowing pad, then tap to open" : "Stop on a glowing pad and press Enter",
    bg: PALETTE.brand,
    fg: PALETTE.ink,
    accent: PALETTE.ink,
  });
  const controlsBoard = createBillboard(controlsTex, 7, 3.5);
  controlsBoard.group.position.set(13, 0, 34);
  controlsBoard.group.rotation.y = -0.35;
  controlsBoard.group.scale.setScalar(0.8);
  scene.add(controlsBoard.group);
  physics.addCircle(13 - 2.4, 34 - 1, 0.3);
  physics.addCircle(13 + 2.4, 34 + 1, 0.3);
  exclude(13, 34, 6);

  // boda stage
  const stageSign = makeSignTexture({ title: "BODA STAGE", subtitle: "Safe rides · Helmets on", bg: "#1f4fa8", width: 1024, height: 320 });
  const stageBoard = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.4), new THREE.MeshBasicMaterial({ map: stageSign, toneMapped: false }));
  stageBoard.position.set(11, 3.2, 16);
  scene.add(stageBoard);
  const shelter = new THREE.Mesh(new THREE.BoxGeometry(7, 0.15, 3.5), mat("#8c8c8c", { metalness: 0.3 }));
  shelter.position.set(11, 2.6, 18);
  shelter.castShadow = true;
  scene.add(shelter);
  for (const [px, pz] of [
    [7.8, 16.4],
    [14.2, 16.4],
    [7.8, 19.6],
    [14.2, 19.6],
  ]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.6, 0.15), mat("#555"));
    post.position.set(px, 1.3, pz);
    post.castShadow = true;
    scene.add(post);
    physics.addCircle(px, pz, 0.2);
  }
  ["#1f6f3f", "#c8102e", "#1f4fa8"].forEach((c, i) => {
    const b = createParkedBoda(c);
    b.position.set(9 + i * 2, 0, 18.5);
    b.rotation.y = -0.4;
    scene.add(b);
    physics.addCircle(9 + i * 2, 18.5, 0.8);
  });
  exclude(11, 18, 6);

  // rolex stand (the Ugandan street food, not the watch)
  const rolexSign = makeSignTexture({ title: "ROLEX", subtitle: "Chapati + eggs · 2,000/=", bg: "#f5efe0", fg: "#c0392b", accent: PALETTE.ink, width: 768, height: 256 });
  const rolex = createRolexStand(rolexSign);
  rolex.position.set(-9.5, 0, 31);
  rolex.rotation.y = 0.2;
  scene.add(rolex);
  physics.addBox(-9.5, 31, 1.2, 0.7);
  exclude(-9.5, 31, 4);

  // signpost
  const postTex = makeSignTexture({ title: "↑ WORK", subtitle: "← CONTACT   ABOUT →", small: "↓ FOOTBALL", bg: "#1b6b3a", width: 768, height: 420 });
  const signPost = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.4, 8), mat("#9a9a9a", { metalness: 0.5 }));
  pole.position.y = 1.7;
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.4), new THREE.MeshBasicMaterial({ map: postTex, toneMapped: false }));
  plate.position.y = 3.2;
  signPost.add(pole, plate);
  signPost.position.set(5.5, 0, 22);
  signPost.rotation.y = -0.2;
  pole.castShadow = true;
  scene.add(signPost);
  physics.addCircle(5.5, 22, 0.15);

  /* zones / pads --------------------------------------------------- */
  const padGeo = new THREE.CircleGeometry(1, 40);
  const ringGeo = new THREE.RingGeometry(0.88, 1, 48);
  function addPad(z: Zone) {
    zones.push(z);
    const pad = new THREE.Mesh(padGeo, new THREE.MeshBasicMaterial({ color: PALETTE.brand, transparent: true, opacity: 0.28, depthWrite: false }));
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(z.x, 0.05, z.z);
    pad.scale.setScalar(z.r);
    const edge = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: PALETTE.brand, transparent: true, opacity: 0.95, depthWrite: false }));
    edge.position.z = 0.001;
    pad.add(edge);
    scene.add(pad);
    padMeshes.set(z.id, pad);
    exclude(z.x, z.z, z.r + 1.5);
  }

  /* work district (north) ----------------------------------------- */
  const billboardScreens: THREE.Mesh[] = [];
  opts.projects.forEach((p, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const zPos = -30 - i * 15;
    const xPos = side * 14;
    const placeholder = makePosterTexture(p.title, p.category, p.year);
    const bb = createBillboard(placeholder, 9, 5.6);
    bb.group.position.set(xPos, 0, zPos);
    bb.group.rotation.y = side * -0.55;
    scene.add(bb.group);
    billboardScreens.push(bb.screen);
    // collide on the posts only, you can ride under the board
    const c = Math.cos(bb.group.rotation.y);
    const s = Math.sin(bb.group.rotation.y);
    for (const px of [-3.9, 3.9]) physics.addCircle(xPos + px * c, zPos - px * s, 0.35);
    exclude(xPos, zPos, 7);

    if (p.image) {
      loadTotal++;
      texLoader.load(
        resolve(p.image),
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 4;
          // cover-fit into a 9:5.6 board
          const img = tex.image as { width: number; height: number };
          const target = 9 / 5.6;
          const aspect = img.width / img.height;
          if (aspect > target) {
            tex.repeat.set(target / aspect, 1);
            tex.offset.set((1 - target / aspect) / 2, 0);
          } else {
            tex.repeat.set(1, aspect / target);
            tex.offset.set(0, (1 - aspect / target) / 2);
          }
          (bb.screen.material as THREE.MeshBasicMaterial).map = tex;
          (bb.screen.material as THREE.MeshBasicMaterial).needsUpdate = true;
        },
        undefined,
        () => {
          /* keep the painted poster */
        },
      );
    }

    // name plate under the board
    const plateTex = makeSignTexture({ title: p.title, subtitle: p.category, bg: PALETTE.ink, width: 1024, height: 256, border: false });
    const plateMesh = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshBasicMaterial({ map: plateTex, toneMapped: false }));
    plateMesh.position.set(0, 1.2, 0.2);
    bb.group.add(plateMesh);

    addPad({
      id: `project-${p.slug}`,
      type: "project",
      slug: p.slug,
      title: p.title,
      subtitle: p.category,
      x: side * 7.5,
      z: zPos + 4,
      r: 2.6,
    });
  });

  const workEnd = -30 - opts.projects.length * 15;

  // shops lining the north road
  const shopNames: [string, string, string][] = [
    ["DESIGN DUKA", "Logos · Flyers · Brands", "#2e86c1"],
    ["CODE & CO.", "Websites · Apps · POS", "#27ae60"],
    ["MOTION SALON", "Edits · Reels · 3D", "#8e44ad"],
    ["PIXEL HARDWARE", "Every pixel in stock", "#e67e22"],
    ["BRAND CLINIC", "We treat weak brands", "#c0392b"],
    ["NOVA WORKS", "Built for brands on the rise", PALETTE.ink],
    ["CHAPATI CORNER", "Fuel for designers", "#16a085"],
    ["MOBILE MONEY", "Send · Withdraw · Airtime", "#f1c40f"],
  ];
  let shopIdx = 0;
  function shop(x: number, z: number, w: number, d: number, rotY = 0) {
    const [name, sub, wall] = shopNames[shopIdx % shopNames.length];
    shopIdx++;
    const h = 3.6 + r() * 2.5;
    const signTex = makeSignTexture({ title: name, subtitle: sub, bg: wall === "#f1c40f" ? "#151515" : "#f5efe0", fg: wall === "#f1c40f" ? "#f1c40f" : wall === PALETTE.ink ? "#151515" : wall, accent: PALETTE.ink, width: 1024, height: 300 });
    const b = createBuilding({ w, d, h, wall, signTex });
    b.position.set(x, 0, z);
    b.rotation.y = rotY;
    scene.add(b);
    const rotated = Math.abs(Math.sin(rotY)) > 0.5;
    physics.addBox(x, z, rotated ? d / 2 : w / 2, rotated ? w / 2 : d / 2);
    exclude(x, z, Math.max(w, d) * 0.75 + 1.5);
  }
  for (let z = -28; z > workEnd - 4; z -= 14) {
    shop(-27, z, 9, 6, Math.PI / 2);
    shop(27, z - 7, 9, 6, -Math.PI / 2);
  }

  /* about district (east) ----------------------------------------- */
  const aboutPoster = makePosterTexture("About Joel", "Graphic design · Marketing · Web dev", "5+ years");
  const aboutBoard = createBillboard(aboutPoster, 7, 5);
  aboutBoard.group.position.set(36, 0, -14);
  scene.add(aboutBoard.group);
  physics.addCircle(36 - 2.9, -14, 0.35);
  physics.addCircle(36 + 2.9, -14, 0.35);
  exclude(36, -14, 6);
  loadTotal++;
  texLoader.load(
    resolve("/images/joel-hero.png"),
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      const img = tex.image as { width: number; height: number };
      const target = 7 / 5;
      const aspect = img.width / img.height;
      if (aspect < target) {
        tex.repeat.set(1, aspect / target);
        tex.offset.set(0, (1 - aspect / target) * 0.75);
      }
      (aboutBoard.screen.material as THREE.MeshBasicMaterial).map = tex;
      (aboutBoard.screen.material as THREE.MeshBasicMaterial).needsUpdate = true;
    },
    undefined,
    () => {},
  );
  addPad({ id: "about", type: "about", title: "About Joel", subtitle: "Who I am & what I do", x: 36, z: -8.5, r: 2.6 });

  // skills market: one crate per tool, stacked so you can knock them over
  const marketSign = makeSignTexture({ title: "SKILLS MARKET", subtitle: "Knock a crate, learn a tool", bg: "#f5efe0", fg: "#1b6b3a", accent: PALETTE.ink, width: 1024, height: 300 });
  const marketBoard = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.75), new THREE.MeshBasicMaterial({ map: marketSign, toneMapped: false }));
  marketBoard.position.set(52, 2.6, -16.5);
  scene.add(marketBoard);
  const marketBack = new THREE.Mesh(new THREE.BoxGeometry(6.4, 2.2, 0.2), mat(PALETTE.ink));
  marketBack.position.set(52, 2.6, -16.65);
  scene.add(marketBack);
  for (const px of [49, 55]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.6, 0.2), mat("#555"));
    post.position.set(px, 1.8, -16.8);
    scene.add(post);
    physics.addCircle(px, -16.8, 0.2);
  }
  exclude(52, -11, 8);

  const shopRowE: [number, number][] = [
    [72, -14],
    [86, -14],
    [66, 14],
    [80, 14],
    [94, 14],
  ];
  shopRowE.forEach(([x, z]) => shop(x, z, 9, 6, z > 0 ? Math.PI : 0));

  /* contact (west) ------------------------------------------------- */
  const kioskSign = makeSignTexture({ title: "SAY HELLO", subtitle: "hello@joelbutala.com", bg: PALETTE.ink, width: 1024, height: 256 });
  const kiosk = createKiosk(kioskSign);
  kiosk.position.set(-38, 0, -13);
  scene.add(kiosk);
  physics.addBox(-38, -13, 2.1, 1.6);
  exclude(-38, -13, 5);
  addPad({ id: "contact", type: "contact", title: "Contact", subtitle: "Let's work together", x: -38, z: -7, r: 2.6 });
  const shopRowW: [number, number][] = [
    [-56, -14],
    [-70, -14],
    [-84, -14],
    [-60, 14],
    [-76, 14],
  ];
  shopRowW.forEach(([x, z]) => shop(x, z, 9, 6, z > 0 ? Math.PI : 0));

  /* matatus parked roadside --------------------------------------- */
  const matatuSpots: [number, number, number][] = [
    [-7, -40, 0],
    [7.2, -80, Math.PI],
    [44, 7, Math.PI / 2],
    [-46, -7, -Math.PI / 2],
    [-7.5, 14, 0.1],
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

  /* football pitch (south) ---------------------------------------- */
  const pitchZ = 64;
  const pitch = new THREE.Mesh(new THREE.PlaneGeometry(30, 40), mat("#6aa33a", { flatShading: false }));
  pitch.rotation.x = -Math.PI / 2;
  pitch.position.set(0, 0.025, pitchZ);
  pitch.receiveShadow = true;
  scene.add(pitch);
  const lineWhite = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.85 });
  const pLines: [number, number, number, number][] = [
    [0, pitchZ - 19.8, 30, 0.25],
    [0, pitchZ + 19.8, 30, 0.25],
    [-14.8, pitchZ, 0.25, 40],
    [14.8, pitchZ, 0.25, 40],
    [0, pitchZ, 30, 0.25],
  ];
  pLines.forEach(([x, z, w, l]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), lineWhite);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.035, z);
    scene.add(m);
  });
  const circle = new THREE.Mesh(new THREE.RingGeometry(4.4, 4.65, 40), lineWhite);
  circle.rotation.x = -Math.PI / 2;
  circle.position.set(0, 0.035, pitchZ);
  scene.add(circle);
  const goal = createGoal();
  const goalZ = pitchZ + 19.8;
  goal.position.set(0, 0, goalZ);
  goal.rotation.y = Math.PI; // net extends away from the pitch
  scene.add(goal);
  physics.addCircle(-3.6, goalZ, 0.2);
  physics.addCircle(3.6, goalZ, 0.2);
  physics.addBox(0, goalZ + 1.9, 3.7, 0.1);
  physics.addBox(-3.7, goalZ + 0.95, 0.1, 1);
  physics.addBox(3.7, goalZ + 0.95, 0.1, 1);
  exclude(0, pitchZ, 24);
  const pitchSign = makeSignTexture({ title: "SCORE A GOAL", subtitle: "Push the ball into the net", bg: "#1b6b3a", width: 1024, height: 300 });
  const pitchBoard = createBillboard(pitchSign, 6, 1.8);
  pitchBoard.group.position.set(-19, -1.6, pitchZ + 6);
  pitchBoard.group.rotation.y = 0.6;
  scene.add(pitchBoard.group);
  physics.addCircle(-19 - 2.5 * Math.cos(0.6), pitchZ + 6 + 2.5 * Math.sin(0.6), 0.3);
  physics.addCircle(-19 + 2.5 * Math.cos(0.6), pitchZ + 6 - 2.5 * Math.sin(0.6), 0.3);
  addPad({ id: "pitch", type: "pitch", title: "Football", subtitle: "Score a goal for a surprise", x: 9, z: 47, r: 2 });

  /* ramps ---------------------------------------------------------- */
  function ramp(x: number, z: number, hw: number, hl: number, height: number, dir: -1 | 1) {
    physics.ramps.push({ x, z, hw, hl, height, dir });
    // wedge geometry
    const geo = new THREE.BufferGeometry();
    const zl = dir === -1 ? hl : -hl; // low end z (local)
    const zh = -zl; // high end
    const v = new Float32Array([
      // bottom quad corners low end (y=0) and high end top (y=h) and high end bottom
      -hw, 0, zl, hw, 0, zl, hw, height, zh, -hw, height, zh, -hw, 0, zh, hw, 0, zh,
    ]);
    const idx = dir === -1
      ? [0, 1, 2, 0, 2, 3, 3, 2, 5, 3, 5, 4, 0, 3, 4, 1, 5, 2]
      : [0, 2, 1, 0, 3, 2, 3, 5, 2, 3, 4, 5, 0, 4, 3, 1, 2, 5];
    geo.setAttribute("position", new THREE.BufferAttribute(v, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat(PALETTE.brand, { side: THREE.DoubleSide }));
    m.position.set(x, 0, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    // stripes on the ramp
    for (let i = 0; i < 3; i++) {
      const t = (i + 0.5) / 3;
      const s = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2, 0.35), new THREE.MeshBasicMaterial({ color: PALETTE.ink }));
      const lz = zl + (zh - zl) * t;
      s.position.set(x, t * height + 0.03, z + lz);
      s.rotation.x = -Math.PI / 2 + (dir === -1 ? Math.atan(height / (2 * hl)) : -Math.atan(height / (2 * hl)));
      scene.add(s);
    }
    exclude(x, z, Math.max(hw, hl) + 3);
  }
  ramp(-26, 44, 2.6, 4.5, 1.9, -1);
  ramp(26, 30, 2.6, 4.5, 1.9, 1);
  ramp(0, -50, 3.2, 5, 2.2, -1);

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

  // tool crates in the market, stacked
  const toolColors = ["#d6402b", "#2e86c1", "#27ae60", "#8e44ad", "#e67e22", "#151515", "#16a085"];
  opts.tools.forEach((t, i) => {
    const row = Math.floor(i / 5);
    const col = i % 5;
    const color = toolColors[i % toolColors.length];
    const tex = makeLabelTexture(t, color);
    const crate = createCrate(tex, color, 0.95);
    addProp(crate, 48 + col * 1.05 + (row % 2) * 0.5, -12.5 + row * 1.1, { r: 0.55, h: 0.95, mass: 1.2, kind: "crate", yaw: 0 });
  });

  // cone slalom by the pitch
  for (let i = 0; i < 7; i++) addProp(createCone(), -10, 48 + i * 4, { r: 0.3, h: 0.8, mass: 0.4, bounce: 0.4, kind: "cone", yaw: 0 });
  // cones guarding the ramp up north
  for (let i = -2; i <= 2; i++) addProp(createCone(), i * 1.6, workEnd + 2, { r: 0.3, h: 0.8, mass: 0.4, kind: "cone", yaw: 0 });

  // jerrycans by the kiosk and rolex stand
  const jerryColors = ["#f2c200", "#f2c200", "#2e86c1", "#27ae60"];
  for (let i = 0; i < 6; i++) addProp(createJerrycan(jerryColors[i % 4]), -41 + (i % 3) * 0.7, -9.6 + Math.floor(i / 3) * 0.6, { r: 0.32, h: 0.7, mass: 0.6, kind: "jerrycan" });
  for (let i = 0; i < 4; i++) addProp(createJerrycan(jerryColors[i % 4]), -12.5 + i * 0.7, 33.2, { r: 0.32, h: 0.7, mass: 0.6, kind: "jerrycan" });

  // soda crates at the boda stage
  for (let i = 0; i < 6; i++) {
    const c = createCrate(undefined, i % 2 ? "#c8102e" : "#1f4fa8", 0.7);
    addProp(c, 15.5 + (i % 2) * 0.75, 21.5 + Math.floor(i / 2) * 0.75, { r: 0.4, h: 0.7, mass: 0.8, kind: "crate" });
  }

  const ball = addProp(createBall(), 0, pitchZ, { r: 0.42, h: 0.84, mass: 0.35, bounce: 0.7, kind: "ball", ball: true });

  /* trees, matooke and the horizon -------------------------------- */
  function free(x: number, z: number, rad: number) {
    if (Math.abs(x) < 7 + rad || Math.abs(z) < 7 + rad) {
      // roads (north/south/east/west)
      if (Math.abs(x) < 7 + rad && (z < -10 || (z > 10 && z < 46))) return false;
      if (Math.abs(z) < 7 + rad && Math.abs(x) > 10) return false;
    }
    for (const e of exclusions) if (Math.hypot(x - e.x, z - e.z) < e.r + rad) return false;
    for (const c of physics.colliders) {
      if (c.kind === "box" && Math.abs(x - c.x) < c.hw + rad + 1 && Math.abs(z - c.z) < c.hd + rad + 1) return false;
    }
    return true;
  }
  let placed = 0;
  for (let tries = 0; tries < 1600 && placed < 110; tries++) {
    const x = (r() - 0.5) * 200;
    const z = (r() - 0.5) * 200;
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
  // edge fence of trees
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * Math.PI * 2;
    const side = Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a)));
    const d = 112 / side;
    const t = createTree(1.2 + r() * 0.5);
    t.position.set(Math.cos(a) * d + (r() - 0.5) * 3, 0, Math.sin(a) * d + (r() - 0.5) * 3);
    scene.add(t);
  }
  physics.bounds = 106;

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
    if (Math.abs(ball.x) < 3.4 && ball.z > goalZ + 0.3 && ball.z < goalZ + 1.85 && ball.y < 2.2) {
      goalCooldown = 4;
      opts.onToast?.("GOOOAL! ⚽  Uganda Cranes would be proud");
      audio.chime([523, 659, 784, 1046, 1318]);
      const pos = new THREE.Vector3();
      for (let i = 0; i < 120; i++) {
        pos.set((Math.random() - 0.5) * 7, 1 + Math.random() * 2, goalZ - 1);
        confetti.emit(pos, new THREE.Vector3((Math.random() - 0.5) * 10, 6 + Math.random() * 9, -Math.random() * 8), {
          life: 2.4,
          scale: 0.3,
          grow: 0,
          gravity: 9,
          spin: 12,
        });
      }
      setTimeout(() => {
        ball.x = 0;
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

  if (loadTotal === 0) setTimeout(readyOnce, 0);
  // never let a slow image keep people at the loader
  const readyTimeout = setTimeout(readyOnce, 8000);

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
