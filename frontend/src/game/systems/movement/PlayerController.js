import * as THREE from "three";
import { ocean, worldBounds } from "../../../components/map/three/cityGrid";
import { EMOTES, EMOTE_DURATIONS } from "../../characters/player/PlayerAnimator";

/**
 * Camera-relative third-person locomotion with smooth accel/decel, gravity,
 * jump, crouch, sprint, vehicle collision, and 15 expressive character emotes.
 *
 * All tuning lives in TUNING so it can be surfaced in a debug panel later.
 */
const TUNING = {
  speed: { walk: 3.4, run: 7.2, sprint: 7.2, crouch: 1.8 },
  accel: 28,
  decel: 34,
  airControl: 0.35,
  gravity: 26,
  // apex ≈ v²/2g ≈ 1.56m — comfortably clears the 1.35m plot fences
  jumpVelocity: 9.0,
  fallMult: 1.75, // fall faster than you rise
  lowJumpMult: 2.6, // released jump early -> shorter hop
  coyoteTime: 0.11, // grace period after leaving the ground
  radius: 0.45, // player collision radius
  turnLerp: 12, // how fast the model yaws toward movement
  stepHeight: 0.45, // vault low obstacles (kerbs, fence rails) instead of sticking
};

export class PlayerController {
  constructor(engine, spawn) {
    this.engine = engine;
    this.pos = new THREE.Vector3(spawn.x, spawn.y ?? 0.10, spawn.z);
    this.vel = new THREE.Vector3();
    this.vy = 0;
    this.yaw = spawn.yaw ?? 0; // facing (radians, +Z forward at 0 -> we use atan2)
    this.grounded = true;
    this.state = "idle";
    this.speed = 0;
    this.isFalling = false;
    this.fallTimer = 0;
    this.invulnerableTimer = 0;
    this.idleTime = 0;
    this.currentEmote = null;
    this.emoteTimer = 0;
    this.emoteDuration = 0;
    this.isSitting = false;
    this.currentBench = null;
    this.benchTimer = 0;
    this._tmp = new THREE.Vector3();
  }

  /** Trigger an emote manually (press O) or pick a random one. */
  triggerEmote(name = null) {
    if (this.isFalling || !this.grounded) return null;
    return this.playRandomEmote(name);
  }

  playRandomEmote(name = null) {
    const list = EMOTES.filter((e) => e !== this.currentEmote);
    const chosen = name || list[Math.floor(Math.random() * list.length)];
    this.currentEmote = chosen;
    this.emoteTimer = 0;
    this.emoteDuration = EMOTE_DURATIONS[chosen] || 3.0;
    this.idleTime = 0;
    return chosen;
  }

  /**
   * @param dt        seconds
   * @param input     { forward, back, left, right, sprint, crouch, jumpPressed }
   * @param camYaw    camera yaw (radians) — movement is relative to this
   */
  update(dt, input, camYaw) {
    this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);

    // ── If currently knocked down by vehicle ───────────────────────
    if (this.isFalling) {
      this.fallTimer += dt;

      // ground friction decelerates knockback slide
      this.vel.x *= Math.max(0, 1 - 5.5 * dt);
      this.vel.z *= Math.max(0, 1 - 5.5 * dt);

      // gravity
      this.vy -= TUNING.gravity * dt;
      this.pos.y += this.vy * dt;
      const ground = this.engine.groundHeightAt(this.pos.x, this.pos.z);
      if (this.pos.y <= ground) {
        this.pos.y = ground;
        this.vy = 0;
        this.grounded = true;
      }

      // position integration
      const solids = this.engine.getSolids ? this.engine.getSolids() : EMPTY;
      let nx = this.pos.x + this.vel.x * dt;
      let nz = this.pos.z + this.vel.z * dt;
      if (!this._blocked(nx, this.pos.z, solids, EMPTY)) this.pos.x = nx;
      else this.vel.x = 0;
      if (!this._blocked(this.pos.x, nz, solids, EMPTY)) this.pos.z = nz;
      else this.vel.z = 0;

      this._clampToWorld();

      if (this.fallTimer >= 1.9) {
        this.isFalling = false;
        this.fallTimer = 0;
        this.invulnerableTimer = 1.6; // grace period after standing up
      }

      return {
        pos: this.pos,
        yaw: this.yaw,
        state: "fall",
        fallTime: this.fallTimer,
        speed: Math.hypot(this.vel.x, this.vel.z),
        grounded: this.grounded,
        vy: this.vy,
      };
    }

    // Camera forward and right unit vectors on the horizontal (XZ) ground plane
    // Camera look vector is (-sin(camYaw), -cos(camYaw))
    const fwdX = -Math.sin(camYaw);
    const fwdZ = -Math.cos(camYaw);
    const rightX = -fwdZ; // +cos(camYaw)
    const rightZ = fwdX;  // -sin(camYaw)

    let moveX = 0;
    let moveZ = 0;
    if (input.forward) { moveX += fwdX;   moveZ += fwdZ;   }
    if (input.back)    { moveX -= fwdX;   moveZ -= fwdZ;   }
    if (input.right)   { moveX += rightX; moveZ += rightZ; }
    if (input.left)    { moveX -= rightX; moveZ -= rightZ; }

    const mag = Math.hypot(moveX, moveZ);
    const wantsMove = mag > 0.001;
    let dirX = 0;
    let dirZ = 0;
    if (wantsMove) {
      dirX = moveX / mag;
      dirZ = moveZ / mag;
    }

    // ── If sitting on a bench ─────────────────────────────────────
    if (this.isSitting) {
      if (wantsMove || input.jumpPressed || input.crouch) {
        if (this.currentBench) {
          const sx = this.currentBench.standX ?? (this.currentBench.x + Math.sin(this.currentBench.yaw) * 1.5);
          const sz = this.currentBench.standZ ?? (this.currentBench.z + Math.cos(this.currentBench.yaw) * 1.5);
          this.pos.set(sx, 0.10, sz);
        }
        this.isSitting = false;
        this.currentBench = null;
        this.benchTimer = -2.5; // cooldown so player doesn't immediately re-sit
      } else {
        if (this.currentBench) {
          this.pos.set(this.currentBench.x, this.currentBench.y ?? 0.10, this.currentBench.z);
          this.yaw = this.currentBench.yaw;
        }
        this.vel.set(0, 0, 0);
        this.vy = 0;
        this.grounded = true;
        this.state = "sit";
        this.speed = 0;
        return {
          pos: this.pos,
          yaw: this.yaw,
          state: "sit",
          emote: null,
          emoteTime: 0,
          fallTime: 0,
          speed: 0,
          grounded: true,
          vy: 0,
        };
      }
    }

    // locomotion state
    const isRunning = Boolean(input.sprint || input.run);
    const crouching = input.crouch && this.grounded;
    let moveState = "idle";
    let targetSpeed = 0;
    if (wantsMove) {
      if (crouching) {
        moveState = "crouch";
        targetSpeed = TUNING.speed.crouch;
      } else if (isRunning) {
        moveState = "run";
        targetSpeed = TUNING.speed.run;
      } else {
        moveState = "walk";
        targetSpeed = TUNING.speed.walk;
      }
    } else if (crouching) {
      moveState = "crouch";
    }

    // accelerate horizontal velocity toward target
    const desired = this._tmp.set(dirX, 0, dirZ).multiplyScalar(targetSpeed);
    const rate = (wantsMove ? TUNING.accel : TUNING.decel) * (this.grounded ? 1 : TUNING.airControl);
    this.vel.x += (desired.x - this.vel.x) * Math.min(1, rate * dt);
    this.vel.z += (desired.z - this.vel.z) * Math.min(1, rate * dt);

    // gravity + jump (with coyote time so edge jumps feel fair)
    this.coyote = this.grounded ? TUNING.coyoteTime : Math.max(0, (this.coyote || 0) - dt);
    if (input.jumpPressed && this.coyote > 0) {
      this.vy = TUNING.jumpVelocity;
      this.grounded = false;
      this.coyote = 0;
      this.jumpedThisFrame = true;
      this.onJump?.();
    } else {
      this.jumpedThisFrame = false;
    }
    // Snappier arc: fall faster than you rise, and cut the rise if the key is
    // released early — the classic platformer feel.
    const gScale = this.vy > 0 ? (input.jumpHeld ? 1 : TUNING.lowJumpMult) : TUNING.fallMult;
    this.vy -= TUNING.gravity * gScale * dt;

    // integrate with collision slide (X then Z). Dynamic colliders (traffic,
    // fences, props) are refreshed each frame; buildings are cached.
    const solids = this.engine.getSolids();
    const dyn = this.engine.getDynamicSolids ? this.engine.getDynamicSolids() : EMPTY;

    // If we already overlap something (landed on a rail, a car drove into us,
    // a building just grew) push straight back out along the shallowest axis
    // instead of freezing — being stuck inside geometry is never acceptable.
    this._depenetrate(solids, dyn);

    let nx = this.pos.x + this.vel.x * dt;
    let nz = this.pos.z + this.vel.z * dt;
    const blockedX = this._blocked(nx, this.pos.z, solids, dyn);
    const blockedZ = this._blocked(this.pos.x, nz, solids, dyn);
    if (blockedX) {
      nx = this.pos.x;
      this.vel.x = 0;
    }
    if (blockedZ) {
      nz = this.pos.z;
      this.vel.z = 0;
    }
    // diagonal corner case: neither axis alone is blocked but the combination is
    if (!blockedX && !blockedZ && this._blocked(nx, nz, solids, dyn)) {
      nz = this.pos.z;
      this.vel.z = 0;
    }
    this.pos.x = nx;
    this.pos.z = nz;

    // vertical
    this.pos.y += this.vy * dt;
    const ground = this.engine.groundHeightAt(this.pos.x, this.pos.z);
    if (this.pos.y <= ground) {
      this.pos.y = ground;
      this.vy = 0;
      this.grounded = true;
    }

    // keep on the island / off the water
    this._clampToWorld();

    // facing
    this.speed = Math.hypot(this.vel.x, this.vel.z);
    if (this.speed > 0.4) {
      const targetYaw = Math.atan2(this.vel.x, this.vel.z);
      this.yaw = dampAngle(this.yaw, targetYaw, TUNING.turnLerp, dt);
    }

    // check if hit by a moving vehicle
    if (this.invulnerableTimer <= 0) {
      for (let i = 0; i < dyn.length; i++) {
        const s = dyn[i];
        if (!s.vehicle) continue;
        if (this._checkVehicleHit(this.pos.x, this.pos.z, s)) {
          this._triggerVehicleHit(s);
          return {
            pos: this.pos,
            yaw: this.yaw,
            state: "fall",
            fallTime: 0,
            speed: Math.hypot(this.vel.x, this.vel.z),
            grounded: this.grounded,
            vy: this.vy,
          };
        }
      }
    }

    // reported state & idle emote evaluation
    if (!this.grounded) {
      this.state = "jump";
      this.idleTime = 0;
      this.currentEmote = null;
      this.emoteTimer = 0;
    } else if (wantsMove || crouching) {
      this.state = moveState;
      this.idleTime = 0;
      this.currentEmote = null;
      this.emoteTimer = 0;
    } else {
      this.state = "idle";
      this.idleTime += dt;

      // Check if standing near any park bench for 3 seconds -> Sit on bench!
      if (this.benchTimer < 0) {
        this.benchTimer += dt;
      } else {
        const benches = this.engine.parkBenches || [];
        let closeBench = null;
        for (let i = 0; i < benches.length; i++) {
          const b = benches[i];
          const d = Math.hypot(b.x - this.pos.x, b.z - this.pos.z);
          if (d < 2.5) {
            closeBench = b;
            break;
          }
        }
        if (closeBench) {
          this.benchTimer += dt;
          if (this.benchTimer >= 3.0) {
            this.isSitting = true;
            this.currentBench = closeBench;
            this.benchTimer = 0;
            this.idleTime = 0;
            this.currentEmote = null;
            this.pos.set(closeBench.x, closeBench.y ?? 0.10, closeBench.z);
            this.yaw = closeBench.yaw;
            this.vel.set(0, 0, 0);
            this.vy = 0;
            this.grounded = true;
            this.state = "sit";
            this.speed = 0;
            return {
              pos: this.pos,
              yaw: this.yaw,
              state: "sit",
              emote: null,
              emoteTime: 0,
              fallTime: 0,
              speed: 0,
              grounded: true,
              vy: 0,
            };
          }
        } else {
          this.benchTimer = 0;
        }
      }

      if (this.currentEmote) {
        this.emoteTimer += dt;
        if (this.emoteTimer >= this.emoteDuration) {
          this.currentEmote = null;
          this.emoteTimer = 0;
          this.idleTime = 0; // wait 3s before next idle emote
        }
      } else if (this.idleTime >= 3.0) {
        // Stood still for more than 3 seconds! Play random realistic emote
        this.playRandomEmote();
      }
    }

    return {
      pos: this.pos,
      yaw: this.yaw,
      state: this.state,
      emote: this.currentEmote,
      emoteTime: this.emoteTimer,
      fallTime: 0,
      speed: this.speed,
      grounded: this.grounded,
      vy: this.vy,
    };
  }

  _checkVehicleHit(x, z, s) {
    const r = TUNING.radius + 0.18;
    const rot = s.rot || 0;
    const c = Math.cos(-rot);
    const sn = Math.sin(-rot);
    const dx = x - s.cx;
    const dz = z - s.cz;
    const lx = rot ? dx * c - dz * sn : dx;
    const lz = rot ? dx * sn + dz * c : dz;
    return Math.abs(lx) < s.hw + r && Math.abs(lz) < s.hd + r;
  }

  _triggerVehicleHit(s) {
    this.isFalling = true;
    this.fallTimer = 0;
    this.invulnerableTimer = 3.5;

    // Vehicle push impulse direction
    let pushX = 0;
    let pushZ = 0;
    if (s.vx || s.vz) {
      const vMag = Math.hypot(s.vx, s.vz) || 1;
      pushX = s.vx / vMag;
      pushZ = s.vz / vMag;
    } else {
      const dx = this.pos.x - s.cx;
      const dz = this.pos.z - s.cz;
      const mag = Math.hypot(dx, dz) || 1;
      pushX = dx / mag;
      pushZ = dz / mag;
    }

    const flingSpeed = 9.6;
    this.vel.x = pushX * flingSpeed;
    this.vel.z = pushZ * flingSpeed;
    this.vy = 4.8;
    this.grounded = false;

    // Turn player away from impact
    this.yaw = Math.atan2(pushX, pushZ) + Math.PI;

    this.onHit?.();
  }

  /**
   * Resolve any existing overlap by pushing out along the axis with the
   * smallest penetration. Runs before integration so the player can always
   * walk away from whatever they're inside.
   */
  _depenetrate(solids, dyn) {
    const r = TUNING.radius;
    const clearBelow = this.pos.y + TUNING.stepHeight;
    const all = [solids, dyn];

    for (let pass = 0; pass < 2; pass++) {
      let pushX = 0;
      let pushZ = 0;
      let worst = 0;

      for (const list of all) {
        for (let i = 0; i < list.length; i++) {
          const s = list[i];
          if (s.h <= clearBelow) continue;

          // work in the collider's local frame for rotated boxes
          const rot = s.rot || 0;
          const c = Math.cos(-rot);
          const sn = Math.sin(-rot);
          const dx = this.pos.x - s.cx;
          const dz = this.pos.z - s.cz;
          const lx = rot ? dx * c - dz * sn : dx;
          const lz = rot ? dx * sn + dz * c : dz;

          const ox = s.hw + r - Math.abs(lx);
          const oz = s.hd + r - Math.abs(lz);
          if (ox <= 0 || oz <= 0) continue; // not overlapping

          const depth = Math.min(ox, oz);
          if (depth <= worst) continue;
          worst = depth;

          // push out along the shallower local axis, then back to world space
          let px = 0;
          let pz = 0;
          if (ox < oz) px = Math.sign(lx || 1) * (ox + 0.02);
          else pz = Math.sign(lz || 1) * (oz + 0.02);
          if (rot) {
            const cc = Math.cos(rot);
            const ss = Math.sin(rot);
            pushX = px * cc - pz * ss;
            pushZ = px * ss + pz * cc;
          } else {
            pushX = px;
            pushZ = pz;
          }
        }
      }

      if (!worst) break;
      this.pos.x += pushX;
      this.pos.z += pushZ;
      if (pushX) this.vel.x = 0;
      if (pushZ) this.vel.z = 0;
    }
  }

  _blocked(x, z, solids, dyn) {
    const r = TUNING.radius;
    const feet = this.pos.y;
    // Anything whose top is below the player's feet (+ step height) is walked
    // over, not into — so kerbs and low rails never snag you, and you can
    // clear a fence or a car roof if you actually jumped that high.
    const clearBelow = feet + TUNING.stepHeight;

    for (let i = 0; i < solids.length; i++) {
      const s = solids[i];
      if (s.h <= clearBelow) continue;
      if (x > s.cx - s.hw - r && x < s.cx + s.hw + r && z > s.cz - s.hd - r && z < s.cz + s.hd + r) {
        return true;
      }
    }
    for (let i = 0; i < dyn.length; i++) {
      const s = dyn[i];
      if (s.h <= clearBelow) continue;
      // rotated box: bring the point into the collider's local frame
      if (s.rot) {
        const c = Math.cos(-s.rot);
        const sn = Math.sin(-s.rot);
        const dx = x - s.cx;
        const dz = z - s.cz;
        const lx = dx * c - dz * sn;
        const lz = dx * sn + dz * c;
        if (Math.abs(lx) < s.hw + r && Math.abs(lz) < s.hd + r) return true;
      } else if (
        x > s.cx - s.hw - r && x < s.cx + s.hw + r &&
        z > s.cz - s.hd - r && z < s.cz + s.hd + r
      ) {
        return true;
      }
    }
    return false;
  }

  _clampToWorld() {
    const b = worldBounds();
    const shoreX = ocean().shoreX;
    // west: greenbelt hills are walkable; east: stop at the beach, not the sea
    this.pos.x = THREE.MathUtils.clamp(this.pos.x, -b.halfW - 340, shoreX - 6);
    this.pos.z = THREE.MathUtils.clamp(this.pos.z, -b.halfD - 220, b.halfD + 220);
  }
}

const EMPTY = [];

function dampAngle(current, target, lambda, dt) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * Math.min(1, lambda * dt);
}

export { TUNING as PLAYER_TUNING };
