import * as THREE from "three";

/**
 * Tiny arcade physics on the ground plane (x/z) with a simple height for jumps.
 * No physics library: the world is small and this keeps the bundle light and
 * the handling fully tunable.
 */

export type CircleCollider = { kind: "circle"; x: number; z: number; r: number };
export type BoxCollider = { kind: "box"; x: number; z: number; hw: number; hd: number };
export type Collider = CircleCollider | BoxCollider;

export type Ramp = {
  x: number;
  z: number;
  /** half width across the ramp */
  hw: number;
  /** half length along the ramp */
  hl: number;
  height: number;
  /** direction the ramp runs along */
  axis: "x" | "z";
  /** -1: rises toward the negative axis, 1: toward the positive axis */
  dir: -1 | 1;
};

export type Prop = {
  mesh: THREE.Object3D;
  x: number;
  z: number;
  y: number;
  vx: number;
  vz: number;
  vy: number;
  r: number;
  height: number;
  mass: number;
  bounce: number;
  spin: THREE.Vector3;
  yaw: number;
  kind: string;
  home: { x: number; z: number };
  /** keeps tilt after tumbling? (crates fall over, balls roll) */
  ball?: boolean;
  /** distance from base to the mesh pivot (centre) */
  yOffset: number;
};

export class PhysicsWorld {
  colliders: Collider[] = [];
  ramps: Ramp[] = [];
  props: Prop[] = [];
  bounds = 110;

  addCircle(x: number, z: number, r: number) {
    this.colliders.push({ kind: "circle", x, z, r });
  }
  addBox(x: number, z: number, hw: number, hd: number) {
    this.colliders.push({ kind: "box", x, z, hw, hd });
  }

  heightAt(x: number, z: number) {
    let h = 0;
    for (const r of this.ramps) {
      const along = r.axis === "z" ? z - r.z : x - r.x;
      const across = r.axis === "z" ? x - r.x : z - r.z;
      if (Math.abs(across) > r.hw || Math.abs(along) > r.hl) continue;
      // t: 0 at the low end, 1 at the high end
      const t = r.dir === -1 ? (r.hl - along) / (2 * r.hl) : (along + r.hl) / (2 * r.hl);
      h = Math.max(h, t * r.height);
    }
    return h;
  }

  /** Push a circle out of static colliders. Returns the hit normal and depth, if any. */
  resolveStatic(p: { x: number; z: number }, radius: number) {
    let hit: { nx: number; nz: number; depth: number } | null = null;
    for (const c of this.colliders) {
      let nx = 0;
      let nz = 0;
      let depth = 0;
      if (c.kind === "circle") {
        const dx = p.x - c.x;
        const dz = p.z - c.z;
        const d = Math.hypot(dx, dz);
        const min = radius + c.r;
        if (d >= min || d === 0) continue;
        nx = dx / d;
        nz = dz / d;
        depth = min - d;
      } else {
        const cx = THREE.MathUtils.clamp(p.x, c.x - c.hw, c.x + c.hw);
        const cz = THREE.MathUtils.clamp(p.z, c.z - c.hd, c.z + c.hd);
        const dx = p.x - cx;
        const dz = p.z - cz;
        const d = Math.hypot(dx, dz);
        if (d >= radius) continue;
        if (d > 1e-5) {
          nx = dx / d;
          nz = dz / d;
          depth = radius - d;
        } else {
          // centre inside the box: push out along the shallowest axis
          const ox = c.hw - Math.abs(p.x - c.x);
          const oz = c.hd - Math.abs(p.z - c.z);
          if (ox < oz) {
            nx = Math.sign(p.x - c.x) || 1;
            depth = ox + radius;
          } else {
            nz = Math.sign(p.z - c.z) || 1;
            depth = oz + radius;
          }
        }
      }
      p.x += nx * depth;
      p.z += nz * depth;
      if (!hit || depth > hit.depth) hit = { nx, nz, depth };
    }
    // world edge
    const b = this.bounds;
    if (Math.abs(p.x) > b) {
      const s = Math.sign(p.x);
      p.x = s * b;
      hit = { nx: -s, nz: 0, depth: 0.1 };
    }
    if (Math.abs(p.z) > b) {
      const s = Math.sign(p.z);
      p.z = s * b;
      hit = { nx: 0, nz: -s, depth: 0.1 };
    }
    return hit;
  }

  stepProps(dt: number, onImpact?: (strength: number, prop: Prop) => void) {
    const g = 26;
    const tmpQ = new THREE.Quaternion();
    const upright = new THREE.Quaternion();
    for (const p of this.props) {
      const moving =
        Math.abs(p.vx) + Math.abs(p.vz) + Math.abs(p.vy) > 0.02 || p.y > 0.001 || p.spin.lengthSq() > 0.01;
      if (!moving) continue;

      p.vy -= g * dt;
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.y += p.vy * dt;

      const ground = this.heightAt(p.x, p.z);
      const grounded = p.y <= ground;
      if (grounded) {
        p.y = ground;
        if (p.vy < -3) {
          onImpact?.(-p.vy * 0.4, p);
          p.vy = -p.vy * p.bounce;
        } else p.vy = 0;
        const fr = p.ball ? 0.6 : 3.2;
        const k = Math.max(0, 1 - fr * dt);
        p.vx *= k;
        p.vz *= k;
        p.spin.multiplyScalar(Math.max(0, 1 - 4 * dt));
      }

      const hit = this.resolveStatic(p, p.r);
      if (hit) {
        const vn = p.vx * hit.nx + p.vz * hit.nz;
        if (vn < 0) {
          p.vx -= (1 + p.bounce) * vn * hit.nx;
          p.vz -= (1 + p.bounce) * vn * hit.nz;
          if (-vn > 3) onImpact?.(-vn * 0.3, p);
        }
      }

      // rotation
      if (p.ball) {
        const sp = Math.hypot(p.vx, p.vz);
        if (sp > 0.01) {
          const axis = new THREE.Vector3(p.vz, 0, -p.vx).normalize();
          tmpQ.setFromAxisAngle(axis, (sp / p.r) * dt);
          p.mesh.quaternion.premultiply(tmpQ);
        }
      } else if (!grounded || p.spin.lengthSq() > 0.5) {
        const a = p.spin.length();
        if (a > 0) {
          tmpQ.setFromAxisAngle(p.spin.clone().divideScalar(a), a * dt);
          p.mesh.quaternion.premultiply(tmpQ);
        }
      } else {
        // settle back onto its base, keeping its heading
        p.yaw += (Math.hypot(p.vx, p.vz) * dt) * 0.3;
        upright.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw);
        p.mesh.quaternion.slerp(upright, Math.min(1, 8 * dt));
      }

      p.mesh.position.set(p.x, p.y + p.yOffset, p.z);
    }

    // prop vs prop (small n, simple separation)
    const n = this.props.length;
    for (let i = 0; i < n; i++) {
      const a = this.props[i];
      for (let j = i + 1; j < n; j++) {
        const b = this.props[j];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const min = a.r + b.r;
        if (Math.abs(dx) > min || Math.abs(dz) > min) continue;
        if (Math.abs(a.y - b.y) > Math.max(a.height, b.height)) continue;
        const d = Math.hypot(dx, dz);
        if (d >= min || d === 0) continue;
        const nx = dx / d;
        const nz = dz / d;
        const overlap = min - d;
        const tm = a.mass + b.mass;
        a.x -= nx * overlap * (b.mass / tm);
        a.z -= nz * overlap * (b.mass / tm);
        b.x += nx * overlap * (a.mass / tm);
        b.z += nz * overlap * (a.mass / tm);
        const rv = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
        if (rv < 0) {
          const jImp = (-(1.4) * rv) / (1 / a.mass + 1 / b.mass);
          a.vx -= (jImp / a.mass) * nx;
          a.vz -= (jImp / a.mass) * nz;
          b.vx += (jImp / b.mass) * nx;
          b.vz += (jImp / b.mass) * nz;
          // wake both
          if (Math.abs(rv) > 2) {
            b.spin.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(Math.abs(rv));
          }
        }
        a.mesh.position.set(a.x, a.y + a.yOffset, a.z);
        b.mesh.position.set(b.x, b.y + b.yOffset, b.z);
      }
    }
  }
}
