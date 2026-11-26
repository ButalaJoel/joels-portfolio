import * as THREE from "three";

type Particle = {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  grow: number;
  gravity: number;
  baseScale: number;
  active: boolean;
};

/** Pooled low-poly particles (dust, exhaust smoke, confetti). No per-frame allocation. */
export class Particles {
  private pool: Particle[] = [];
  private cursor = 0;
  group = new THREE.Group();

  constructor(size: number, geometry: THREE.BufferGeometry, materials: THREE.Material[]) {
    for (let i = 0; i < size; i++) {
      const m = new THREE.Mesh(geometry, materials[i % materials.length]);
      m.visible = false;
      m.frustumCulled = false;
      this.group.add(m);
      this.pool.push({
        mesh: m,
        life: 0,
        maxLife: 1,
        vel: new THREE.Vector3(),
        spin: new THREE.Vector3(),
        grow: 0,
        gravity: 0,
        baseScale: 1,
        active: false,
      });
    }
  }

  emit(pos: THREE.Vector3, vel: THREE.Vector3, opts: { life?: number; scale?: number; grow?: number; gravity?: number; spin?: number } = {}) {
    const p = this.pool[this.cursor];
    this.cursor = (this.cursor + 1) % this.pool.length;
    p.active = true;
    p.life = p.maxLife = opts.life ?? 0.8;
    p.vel.copy(vel);
    p.grow = opts.grow ?? 1.5;
    p.gravity = opts.gravity ?? 0;
    p.baseScale = opts.scale ?? 0.25;
    const s = opts.spin ?? 2;
    p.spin.set((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    p.mesh.position.copy(pos);
    p.mesh.scale.setScalar(p.baseScale);
    p.mesh.visible = true;
  }

  update(dt: number) {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      p.vel.y -= p.gravity * dt;
      p.vel.multiplyScalar(1 - 1.5 * dt);
      p.mesh.position.addScaledVector(p.vel, dt);
      if (p.mesh.position.y < 0.02) {
        p.mesh.position.y = 0.02;
        p.vel.y = Math.abs(p.vel.y) * 0.3;
      }
      p.mesh.rotation.x += p.spin.x * dt;
      p.mesh.rotation.y += p.spin.y * dt;
      p.mesh.rotation.z += p.spin.z * dt;
      const t = 1 - p.life / p.maxLife; // 0 → 1
      // grow, then shrink out (shared materials, so we fade by scale)
      const s = p.baseScale * (1 + p.grow * t) * (t > 0.7 ? (1 - t) / 0.3 : 1);
      p.mesh.scale.setScalar(Math.max(0.001, s));
    }
  }
}
