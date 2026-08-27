import * as THREE from "three";

/**
 * Polished third-person follow camera:
 *  - pointer-lock mouse orbit (yaw + clamped pitch)
 *  - critically-damped position + look-target follow (no stiffness, no snap)
 *  - wall push-in: shortens the boom when a building is between player & camera
 *  - subtle distance/FOV kick while sprinting
 */
const CFG = {
  distance: 5.6,
  minDistance: 1.6,
  height: 1.65, // look target above the feet (player chest/head height)
  shoulder: 0.40, // lateral offset for an over-the-shoulder perspective
  pitchMin: -0.85,
  pitchMax: 0.65,
  sensitivity: 0.0022,
  posDamp: 9.5, // smooth position follow
  rotDamp: 6.8, // slow, silky smooth easing when panning sideways/vertically
  sprintPush: 0.9,
};

export class ThirdPersonCamera {
  constructor(camera, engine) {
    this.camera = camera;
    this.engine = engine;
    this.targetYaw = Math.PI;
    this.targetPitch = -0.15;
    this.yaw = Math.PI;
    this.pitch = -0.15;
    this._pos = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this._desired = new THREE.Vector3();
    this._rc = new THREE.Raycaster();
    this._initialised = false;
    this._shake = 0;
    this._lastUserLookTime = 0;
  }

  addImpulse(amount = 0.35) {
    this._shake = Math.min(0.85, this._shake + amount);
  }

  addMouse(dx, dy) {
    this.targetYaw -= dx * CFG.sensitivity;
    this.targetPitch = THREE.MathUtils.clamp(
      this.targetPitch - dy * CFG.sensitivity,
      CFG.pitchMin,
      CFG.pitchMax
    );
    this._lastUserLookTime = performance.now();
  }

  /** Force the camera behind a given player facing. */
  alignBehind(playerYaw) {
    this.targetYaw = playerYaw + Math.PI;
    this.yaw = this.targetYaw;
    this.targetPitch = -0.15;
    this.pitch = -0.15;
  }

  update(dt, playerPos, opts = {}) {
    const sprint = opts.sprint ? 1 : 0;

    // Smooth rotational transition towards target yaw & pitch (slow, smooth pan)
    let dyaw = this.targetYaw - this.yaw;
    while (dyaw < -Math.PI) dyaw += Math.PI * 2;
    while (dyaw > Math.PI) dyaw -= Math.PI * 2;
    this.yaw += dyaw * (1 - Math.exp(-CFG.rotDamp * dt));

    this.pitch += (this.targetPitch - this.pitch) * (1 - Math.exp(-CFG.rotDamp * dt));

    // Look target = player upper body / head
    this._look.set(playerPos.x, playerPos.y + CFG.height, playerPos.z);

    // Boom vector from spherical smoothed yaw/pitch
    const dist = CFG.distance + sprint * CFG.sprintPush;
    const cp = Math.cos(this.pitch);
    const boom = new THREE.Vector3(
      Math.sin(this.yaw) * cp,
      Math.sin(-this.pitch),
      Math.cos(this.yaw) * cp
    );

    // Shoulder offset (perpendicular to boom, on the ground plane)
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const anchor = this._look.clone().addScaledVector(right, CFG.shoulder);

    this._desired.copy(anchor).addScaledVector(boom, dist);

    // Wall push-in: cast from anchor toward the desired camera position
    const solids = this.engine.getSolids ? this.engine.getSolids() : [];
    const hitDist = raySolids(anchor, this._desired, solids, dist);
    if (hitDist < dist) {
      this._desired.copy(anchor).addScaledVector(boom, Math.max(CFG.minDistance, hitDist - 0.3));
    }

    // Ground clearance
    const minHeight = (playerPos.y || 0) + 0.6;
    if (this._desired.y < minHeight) this._desired.y = minHeight;

    if (!this._initialised) {
      this._pos.copy(this._desired);
      this._initialised = true;
    } else {
      damp3(this._pos, this._desired, CFG.posDamp, dt);
    }

    if (this._shake > 0.001) {
      this._shake = Math.max(0, this._shake - dt * 2.8);
      const sx = (Math.random() - 0.5) * this._shake * 0.45;
      const sy = (Math.random() - 0.5) * this._shake * 0.35;
      const sz = (Math.random() - 0.5) * this._shake * 0.45;
      this.camera.position.set(this._pos.x + sx, this._pos.y + sy, this._pos.z + sz);
    } else {
      this.camera.position.copy(this._pos);
    }
    this.camera.lookAt(this._look);
  }

  /** Snap instantly (used at the end of the cinematic hand-off). */
  snap(playerPos) {
    this._initialised = false;
    this.yaw = this.targetYaw;
    this.pitch = this.targetPitch;
    this.update(0.016, playerPos);
  }
}

function damp3(cur, target, lambda, dt) {
  const f = 1 - Math.exp(-lambda * dt);
  cur.lerp(target, f);
}

// Cheap segment-vs-AABB sweep; returns distance to first hit (or `max`).
function raySolids(from, to, solids, max) {
  const dir = to.clone().sub(from);
  const len = dir.length();
  if (len < 1e-4) return max;
  dir.divideScalar(len);
  let best = max;
  for (const s of solids) {
    const t = segAabb(from, dir, len, s);
    if (t != null && t < best) best = t;
  }
  return best;
}

function segAabb(o, d, len, s) {
  const minX = s.cx - s.hw - 0.2;
  const maxX = s.cx + s.hw + 0.2;
  const minZ = s.cz - s.hd - 0.2;
  const maxZ = s.cz + s.hd + 0.2;
  const minY = 0;
  const maxY = s.h;
  let tmin = 0;
  let tmax = len;
  for (const [oi, di, lo, hi] of [
    [o.x, d.x, minX, maxX],
    [o.y, d.y, minY, maxY],
    [o.z, d.z, minZ, maxZ],
  ]) {
    if (Math.abs(di) < 1e-6) {
      if (oi < lo || oi > hi) return null;
    } else {
      let t1 = (lo - oi) / di;
      let t2 = (hi - oi) / di;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
  }
  return tmin;
}

export { CFG as CAMERA_CFG };
