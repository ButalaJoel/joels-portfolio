import * as THREE from "three";

/**
 * Procedural low-poly models. Everything is built from primitives so the world
 * loads instantly; any of these can later be swapped for a Blender GLB.
 */

const matCache = new Map<string, THREE.MeshStandardMaterial>();
export function mat(color: string, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  const key = color + JSON.stringify(opts);
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...opts });
    matCache.set(key, m);
  }
  return m;
}

function mesh(geo: THREE.BufferGeometry, m: THREE.Material, cast = true, receive = false) {
  const me = new THREE.Mesh(geo, m);
  me.castShadow = cast;
  me.receiveShadow = receive;
  return me;
}

function box(w: number, h: number, d: number, color: string, opts?: Partial<THREE.MeshStandardMaterialParameters>) {
  return mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
}

export const PALETTE = {
  brand: "#FFB020",
  ink: "#151515",
  earth: "#c4683a",
  earthDark: "#a9552d",
  grass: "#7aa33f",
  grassDark: "#5f8a2f",
  road: "#3d3b3e",
  cream: "#f5efe0",
  sky: "#f6d7a7",
};

/* ------------------------------------------------------------------ */
/* Boda boda + rider                                                   */
/* ------------------------------------------------------------------ */

export type BodaRig = {
  root: THREE.Group; // positioned by physics
  lean: THREE.Group; // roll / pitch
  frontWheel: THREE.Object3D;
  rearWheel: THREE.Object3D;
  steerGroup: THREE.Group;
  headlight: THREE.Mesh;
  tailLight: THREE.Mesh;
  exhaust: THREE.Object3D;
  rearContact: THREE.Object3D;
  rider: THREE.Group;
};

function wheel() {
  const g = new THREE.Group();
  const tyre = mesh(new THREE.TorusGeometry(0.33, 0.1, 8, 16), mat("#1d1d1d"));
  tyre.rotation.y = Math.PI / 2;
  const hub = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.16, 8), mat("#bdbdbd", { metalness: 0.6, roughness: 0.4 }));
  hub.rotation.z = Math.PI / 2;
  // spokes so rotation is visible
  for (let i = 0; i < 3; i++) {
    const s = mesh(new THREE.BoxGeometry(0.03, 0.6, 0.03), mat("#9a9a9a"));
    s.rotation.x = (i * Math.PI) / 3;
    g.add(s);
  }
  g.add(tyre, hub);
  return g;
}

export function createBoda(colors = { body: "#c8102e", seat: "#151515", shirt: PALETTE.brand, helmet: "#151515" }): BodaRig {
  const root = new THREE.Group();
  const lean = new THREE.Group();
  root.add(lean);

  // bike faces -z
  const rearWheel = wheel();
  rearWheel.position.set(0, 0.43, 0.68);
  const frontPivot = new THREE.Group();
  frontPivot.position.set(0, 0.43, -0.72);
  const frontWheel = wheel();
  frontPivot.add(frontWheel);

  const steerGroup = new THREE.Group();
  steerGroup.position.set(0, 0, -0.62);
  // forks
  const fork = box(0.06, 0.85, 0.06, "#cfcfcf", { metalness: 0.5, roughness: 0.4 });
  fork.position.set(0, 0.85, -0.05);
  fork.rotation.x = -0.25;
  const bars = box(0.85, 0.05, 0.05, "#222");
  bars.position.set(0, 1.25, 0.05);
  const headlight = mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.1, 10), mat("#fffbe6", { emissive: "#fff2b3", emissiveIntensity: 1.2 }));
  headlight.rotation.x = Math.PI / 2;
  headlight.position.set(0, 1.06, -0.18);
  const mudguard = box(0.2, 0.06, 0.45, colors.body);
  mudguard.position.set(0, 0.86, -0.12);
  steerGroup.add(fork, bars, headlight, mudguard);
  // the front wheel visually follows steering
  steerGroup.add(frontPivot);
  frontPivot.position.set(0, 0.43, -0.1);

  // frame
  const tank = box(0.38, 0.28, 0.6, colors.body);
  tank.position.set(0, 0.98, -0.25);
  const frame = box(0.12, 0.12, 1.2, "#2a2a2a");
  frame.position.set(0, 0.68, 0.0);
  frame.rotation.x = 0.08;
  const engine = box(0.34, 0.34, 0.42, "#6b6b6b", { metalness: 0.4, roughness: 0.5 });
  engine.position.set(0, 0.55, -0.05);
  const seat = box(0.36, 0.14, 1.05, colors.seat);
  seat.position.set(0, 1.02, 0.42);
  const sideCover = box(0.4, 0.22, 0.38, colors.body);
  sideCover.position.set(0, 0.82, 0.38);
  const rack = box(0.42, 0.05, 0.4, "#2a2a2a");
  rack.position.set(0, 1.0, 1.02);
  const tailLight = box(0.18, 0.08, 0.05, "#ff2d2d", { emissive: "#ff1a1a", emissiveIntensity: 0.6 });
  tailLight.position.set(0, 0.96, 1.23);
  const rearGuard = box(0.22, 0.05, 0.5, colors.body);
  rearGuard.position.set(0, 0.86, 0.9);
  const exhaustPipe = mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.9, 8), mat("#d9d9d9", { metalness: 0.7, roughness: 0.3 }));
  exhaustPipe.rotation.x = Math.PI / 2 - 0.12;
  exhaustPipe.position.set(0.23, 0.52, 0.5);
  const exhaust = new THREE.Object3D();
  exhaust.position.set(0.23, 0.48, 0.98);
  // passenger foot rest bar typical of bodas
  const footrest = box(0.9, 0.04, 0.04, "#2a2a2a");
  footrest.position.set(0, 0.42, 0.45);

  const rearContact = new THREE.Object3D();
  rearContact.position.set(0, 0.05, 0.75);

  lean.add(rearWheel, steerGroup, tank, frame, engine, seat, sideCover, rack, tailLight, rearGuard, exhaustPipe, exhaust, footrest, rearContact);

  // rider
  const rider = new THREE.Group();
  const shirt = mat(colors.shirt);
  const skin = mat("#6b4029");
  const trousers = mat("#2b3a55");
  const torso = mesh(new THREE.BoxGeometry(0.46, 0.6, 0.3), shirt);
  torso.position.set(0, 1.55, 0.25);
  torso.rotation.x = -0.25;
  const head = mesh(new THREE.SphereGeometry(0.17, 10, 8), skin);
  head.position.set(0, 2.0, 0.12);
  const helmet = mesh(new THREE.SphereGeometry(0.2, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), mat(colors.helmet, { roughness: 0.4 }));
  helmet.position.set(0, 2.03, 0.12);
  const visor = box(0.28, 0.08, 0.06, "#222", { roughness: 0.2 });
  visor.position.set(0, 2.02, -0.08);
  const reflector = box(0.48, 0.2, 0.31, "#d9ff3d", { emissive: "#9bbf00", emissiveIntensity: 0.25 });
  reflector.position.set(0, 1.45, 0.27);
  reflector.rotation.x = -0.25;
  const armL = mesh(new THREE.BoxGeometry(0.12, 0.12, 0.6), shirt);
  armL.position.set(-0.3, 1.5, -0.05);
  armL.rotation.x = 0.35;
  const armR = armL.clone();
  armR.position.x = 0.3;
  const legGeo = new THREE.BoxGeometry(0.16, 0.16, 0.55);
  const thighL = mesh(legGeo, trousers);
  thighL.position.set(-0.17, 1.12, 0.1);
  const thighR = thighL.clone();
  thighR.position.x = 0.17;
  const shinGeo = new THREE.BoxGeometry(0.14, 0.5, 0.14);
  const shinL = mesh(shinGeo, trousers);
  shinL.position.set(-0.22, 0.75, -0.12);
  const shinR = shinL.clone();
  shinR.position.x = 0.22;
  rider.add(torso, head, helmet, visor, reflector, armL, armR, thighL, thighR, shinL, shinR);
  lean.add(rider);

  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true;
  });

  return { root, lean, frontWheel, rearWheel, steerGroup, headlight, tailLight, exhaust, rearContact, rider };
}

/** Parked boda (no rider) for the boda stage. */
export function createParkedBoda(color: string) {
  const rig = createBoda({ body: color, seat: "#151515", shirt: "#000", helmet: "#000" });
  rig.lean.remove(rig.rider);
  rig.lean.rotation.z = 0.12; // on its side-stand
  return rig.root;
}

/* ------------------------------------------------------------------ */
/* Vehicles & street furniture                                         */
/* ------------------------------------------------------------------ */

export function createMatatu(stripe = "#1f4fa8") {
  const g = new THREE.Group();
  const body = box(2.1, 1.6, 5, "#f4f4f0");
  body.position.y = 1.25;
  const roof = box(2.0, 0.25, 4.6, "#e6e6e0");
  roof.position.y = 2.15;
  const band = box(2.12, 0.28, 5.02, stripe);
  band.position.y = 1.15;
  // checker band like Kampala taxis
  const checks = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const c = box(2.14, 0.12, 0.2, i % 2 ? "#151515" : "#f4f4f0");
    c.position.set(0, 1.62, -2.2 + i * 0.4);
    checks.add(c);
  }
  const glass = box(2.13, 0.55, 3.6, "#2b3a45", { roughness: 0.2, metalness: 0.3 });
  glass.position.set(0, 1.75, 0.3);
  const wind = box(1.9, 0.7, 0.05, "#2b3a45", { roughness: 0.2, metalness: 0.3 });
  wind.position.set(0, 1.65, -2.52);
  g.add(body, roof, band, checks, glass, wind);
  for (const [x, z] of [
    [-1, -1.6],
    [1, -1.6],
    [-1, 1.6],
    [1, 1.6],
  ]) {
    const w = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), mat("#1d1d1d"));
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.42, z);
    g.add(w);
  }
  const lightL = box(0.3, 0.18, 0.05, "#fffbe6", { emissive: "#fff2b3", emissiveIntensity: 0.6 });
  lightL.position.set(-0.7, 0.9, -2.52);
  const lightR = lightL.clone();
  lightR.position.x = 0.7;
  g.add(lightL, lightR);
  return g;
}

export function createTree(scale = 1) {
  const g = new THREE.Group();
  const trunk = mesh(new THREE.CylinderGeometry(0.18 * scale, 0.28 * scale, 2.2 * scale, 6), mat("#6b4a2f"));
  trunk.position.y = 1.1 * scale;
  g.add(trunk);
  const greens = ["#4f7d2a", "#5f8f32", "#3f6b22"];
  for (let i = 0; i < 3; i++) {
    const r = (1.2 + Math.random() * 0.6) * scale;
    const crown = mesh(new THREE.IcosahedronGeometry(r, 0), mat(greens[i % 3]));
    crown.position.set((Math.random() - 0.5) * 1.2 * scale, (2.5 + Math.random() * 0.9) * scale, (Math.random() - 0.5) * 1.2 * scale);
    crown.rotation.set(Math.random(), Math.random(), Math.random());
    g.add(crown);
  }
  return g;
}

export function createBanana(scale = 1) {
  const g = new THREE.Group();
  const stem = mesh(new THREE.CylinderGeometry(0.12 * scale, 0.18 * scale, 2 * scale, 6), mat("#7c8f3a"));
  stem.position.y = 1 * scale;
  g.add(stem);
  const leafMat = mat("#5d9c2e", { side: THREE.DoubleSide });
  const leaves = 6;
  for (let i = 0; i < leaves; i++) {
    const leaf = mesh(new THREE.PlaneGeometry(0.55 * scale, 2.0 * scale, 1, 3), leafMat);
    // droop
    const pos = leaf.geometry.attributes.position as THREE.BufferAttribute;
    for (let v = 0; v < pos.count; v++) {
      const y = pos.getY(v);
      pos.setZ(v, -Math.pow((y + scale) / (2 * scale), 2) * 0.8 * scale);
    }
    leaf.geometry.computeVertexNormals();
    leaf.geometry.translate(0, 1.0 * scale, 0);
    const pivot = new THREE.Group();
    pivot.position.y = 2 * scale;
    pivot.rotation.y = (i / leaves) * Math.PI * 2 + Math.random() * 0.4;
    leaf.rotation.x = -0.9 - Math.random() * 0.3;
    pivot.add(leaf);
    g.add(pivot);
  }
  // matooke bunch
  const bunch = mesh(new THREE.IcosahedronGeometry(0.25 * scale, 0), mat("#4a7a1f"));
  bunch.position.set(0.2 * scale, 1.75 * scale, 0);
  bunch.scale.y = 1.4;
  g.add(bunch);
  return g;
}

export function createBuilding(opts: { w: number; d: number; h: number; wall: string; roof?: string; signTex?: THREE.Texture; signColor?: string }) {
  const g = new THREE.Group();
  const walls = box(opts.w, opts.h, opts.d, opts.wall);
  walls.position.y = opts.h / 2;
  walls.receiveShadow = true;
  g.add(walls);
  // iron-sheet roof edge
  const roof = box(opts.w + 0.4, 0.2, opts.d + 0.4, opts.roof ?? "#8c8c8c", { metalness: 0.3, roughness: 0.6 });
  roof.position.y = opts.h + 0.1;
  g.add(roof);
  // shop front facing +z (towards camera)
  const door = box(Math.min(2.2, opts.w * 0.35), 2.1, 0.08, "#3a2b22");
  door.position.set(-opts.w * 0.18, 1.05, opts.d / 2 + 0.03);
  const shutter = box(Math.min(2.4, opts.w * 0.3), 2.0, 0.08, "#7f8a93", { metalness: 0.4, roughness: 0.5 });
  shutter.position.set(opts.w * 0.22, 1.0, opts.d / 2 + 0.03);
  g.add(door, shutter);
  // veranda
  const veranda = box(opts.w, 0.08, 1.4, "#9a9a9a", { metalness: 0.3 });
  veranda.position.set(0, 2.7, opts.d / 2 + 0.7);
  const postL = box(0.1, 2.7, 0.1, "#555");
  postL.position.set(-opts.w / 2 + 0.2, 1.35, opts.d / 2 + 1.3);
  const postR = postL.clone();
  postR.position.x = opts.w / 2 - 0.2;
  g.add(veranda, postL, postR);
  if (opts.signTex) {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(opts.w * 0.9, Math.min(1.4, opts.h * 0.3)), new THREE.MeshBasicMaterial({ map: opts.signTex, toneMapped: false }));
    sign.position.set(0, Math.min(opts.h - 0.6, 3.5), opts.d / 2 + 0.05);
    g.add(sign);
  }
  return g;
}

export function createClockTower() {
  const g = new THREE.Group();
  const base = box(3.2, 0.8, 3.2, "#d8d2c4");
  base.position.y = 0.4;
  const shaft = box(1.6, 7, 1.6, "#ece6d8");
  shaft.position.y = 4.3;
  const head = box(2.2, 1.8, 2.2, "#ece6d8");
  head.position.y = 8.6;
  const cap = mesh(new THREE.ConeGeometry(1.7, 1.8, 4), mat(PALETTE.brand));
  cap.position.y = 10.4;
  cap.rotation.y = Math.PI / 4;
  g.add(base, shaft, head, cap);
  for (let i = 0; i < 4; i++) {
    const face = mesh(new THREE.CircleGeometry(0.75, 16), mat("#ffffff", { flatShading: false }));
    const ang = (i * Math.PI) / 2;
    face.position.set(Math.sin(ang) * 1.11, 8.6, Math.cos(ang) * 1.11);
    face.rotation.y = ang;
    const hand = box(0.06, 0.55, 0.02, "#151515");
    hand.position.set(0, 0.2, 0.02);
    const hand2 = box(0.06, 0.35, 0.02, "#151515");
    hand2.rotation.z = 1.6;
    hand2.position.set(0.15, 0, 0.02);
    face.add(hand, hand2);
    g.add(face);
  }
  return g;
}

export function createBillboard(tex: THREE.Texture, w = 8, h = 5, frame = PALETTE.ink) {
  const g = new THREE.Group();
  const postL = box(0.3, h + 2.2, 0.3, "#2d2d2d");
  postL.position.set(-w / 2 + 0.6, (h + 2.2) / 2, -0.2);
  const postR = postL.clone();
  postR.position.x = w / 2 - 0.6;
  const back = box(w + 0.5, h + 0.5, 0.25, frame);
  back.position.set(0, 2.2 + h / 2, 0);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  screen.position.set(0, 2.2 + h / 2, 0.13);
  const lamp = box(w * 0.6, 0.12, 0.4, "#2d2d2d");
  lamp.position.set(0, 2.2 + h + 0.45, 0.4);
  g.add(postL, postR, back, screen, lamp);
  return { group: g, screen };
}

export function createKiosk(signTex: THREE.Texture) {
  const g = new THREE.Group();
  const body = box(4, 3, 3, PALETTE.brand);
  body.position.y = 1.5;
  const counter = box(3.2, 0.15, 0.9, "#3a2b22");
  counter.position.set(0, 1.15, 1.9);
  const opening = box(3, 1.2, 0.1, "#2a2a2a");
  opening.position.set(0, 1.85, 1.52);
  const roof = box(4.8, 0.2, 4, "#8c8c8c", { metalness: 0.3 });
  roof.position.y = 3.1;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false }));
  sign.position.set(0, 3.75, 1.4);
  const signBack = box(4.1, 1.1, 0.1, PALETTE.ink);
  signBack.position.set(0, 3.75, 1.33);
  g.add(body, counter, opening, roof, signBack, sign);
  return g;
}

export function createRolexStand(signTex: THREE.Texture) {
  const g = new THREE.Group();
  const table = box(2.2, 0.9, 1.1, "#7a5534");
  table.position.y = 0.45;
  const pan = mesh(new THREE.CylinderGeometry(0.5, 0.45, 0.08, 14), mat("#2a2a2a", { metalness: 0.6 }));
  pan.position.set(-0.4, 0.95, 0);
  const eggs = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const e = mesh(new THREE.SphereGeometry(0.07, 6, 5), mat("#f2e6cf"));
    e.position.set(0.3 + (i % 3) * 0.16, 0.97, -0.15 + Math.floor(i / 3) * 0.16);
    eggs.add(e);
  }
  const umbrellaPole = box(0.06, 2.6, 0.06, "#444");
  umbrellaPole.position.set(0.9, 1.3, -0.4);
  const umbrella = mesh(new THREE.ConeGeometry(1.6, 0.6, 8), mat("#e5322d"));
  umbrella.position.set(0.9, 2.7, -0.4);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.7), new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false }));
  sign.position.set(0, 0.5, 0.56);
  g.add(table, pan, eggs, umbrellaPole, umbrella, sign);
  return g;
}

export function createGoal() {
  const g = new THREE.Group();
  const white = "#ffffff";
  const postL = box(0.2, 2.4, 0.2, white);
  postL.position.set(-3.6, 1.2, 0);
  const postR = postL.clone();
  postR.position.x = 3.6;
  const bar = box(7.4, 0.2, 0.2, white);
  bar.position.y = 2.4;
  const net = new THREE.Mesh(
    new THREE.BoxGeometry(7.2, 2.3, 1.8, 14, 5, 4),
    new THREE.MeshBasicMaterial({ color: "#ffffff", wireframe: true, transparent: true, opacity: 0.35 }),
  );
  net.position.set(0, 1.15, -0.95);
  g.add(postL, postR, bar, net);
  return g;
}

/* ------------------------------------------------------------------ */
/* Knockable props                                                     */
/* ------------------------------------------------------------------ */

export function createJerrycan(color = "#f2c200") {
  const g = new THREE.Group();
  const b = box(0.5, 0.65, 0.32, color, { roughness: 0.6 });
  b.position.y = 0.33;
  const cap = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 8), mat("#c0392b"));
  cap.position.set(0.14, 0.7, 0);
  const handle = box(0.24, 0.06, 0.08, color);
  handle.position.set(-0.08, 0.7, 0);
  g.add(b, cap, handle);
  return g;
}

export function createCone() {
  const g = new THREE.Group();
  const base = box(0.55, 0.06, 0.55, "#f06318");
  base.position.y = 0.03;
  const c = mesh(new THREE.ConeGeometry(0.22, 0.75, 10), mat("#f06318"));
  c.position.y = 0.42;
  const band = mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.12, 10), mat("#ffffff"));
  band.position.y = 0.5;
  g.add(base, c, band);
  return g;
}

export function createCrate(labelTex?: THREE.Texture, color = "#d6402b", size = 0.9) {
  const g = new THREE.Group();
  const mats = labelTex
    ? [
        new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.8 }),
        new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.8 }),
        mat(color),
        mat(color),
        new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.8 }),
        new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.8 }),
      ]
    : mat(color);
  const b = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), mats);
  b.position.y = size / 2;
  b.castShadow = true;
  g.add(b);
  return g;
}

export function createBall() {
  const g = new THREE.Group();
  const ball = mesh(new THREE.IcosahedronGeometry(0.42, 1), mat("#ffffff"));
  // patches
  const patchGeo = new THREE.IcosahedronGeometry(0.43, 0);
  const patches = mesh(patchGeo, mat("#151515", { wireframe: true }));
  ball.add(patches);
  ball.position.y = 0.42;
  g.add(ball);
  return g;
}

/** District gateway arch spanning a road. Faces +z by default; rotate for other roads. */
export function createArch(signTex: THREE.Texture, color: string, span = 11) {
  const g = new THREE.Group();
  const pillarL = box(0.8, 7, 0.8, PALETTE.ink);
  pillarL.position.set(-span / 2, 3.5, 0);
  const pillarR = pillarL.clone();
  pillarR.position.x = span / 2;
  const capL = box(1.1, 0.4, 1.1, color);
  capL.position.set(-span / 2, 7.2, 0);
  const capR = capL.clone();
  capR.position.x = span / 2;
  const beam = box(span + 1.4, 1.9, 0.5, PALETTE.ink);
  beam.position.y = 6.3;
  const stripe = box(span + 1.42, 0.18, 0.52, color);
  stripe.position.y = 5.3;
  const front = new THREE.Mesh(new THREE.PlaneGeometry(span, 1.6), new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false }));
  front.position.set(0, 6.35, 0.26);
  const back = front.clone();
  back.position.z = -0.26;
  back.rotation.y = Math.PI;
  g.add(pillarL, pillarR, capL, capR, beam, stripe, front, back);
  return g;
}
