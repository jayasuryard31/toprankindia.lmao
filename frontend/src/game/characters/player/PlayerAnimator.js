import * as THREE from "three";

/**
 * Procedural animator for the humanoid rig.
 *
 * Rather than swinging rigid limbs, every pose is expressed as target joint
 * rotations that are damped toward each frame, so transitions blend instead of
 * popping. Locomotion uses a shared gait phase (so feet stay in sync with the
 * body bob), and the jump is a real state machine:
 *
 *   grounded --(jump)--> LAUNCH (anticipate + push) --> RISE (tuck)
 *          --> APEX (spread) --> FALL (reach for ground) --> LAND (absorb) --> grounded
 */

const lerp = THREE.MathUtils.lerp;
const damp = (cur, target, lambda, dt) => cur + (target - cur) * (1 - Math.exp(-lambda * dt));

export class PlayerAnimator {
  constructor(rig) {
    this.rig = rig;
    // The model tells us where its pelvis rests; vertical offsets (bob, crouch,
    // landing squash) scale with it so short cartoon legs don't over-travel.
    this.baseHipY = rig.baseHipY ?? 0.68;
    this.vScale = this.baseHipY / 0.68;
    this.phase = 0; // gait cycle
    this.blend = { walk: 0, run: 0, crouch: 0, air: 0, fall: 0, emote: 0, sit: 0 };
    this.jump = { state: "none", t: 0 };
    this.fallTime = 0;
    this.currentEmote = null;
    this.emoteTime = 0;
    this.landImpact = 0;
    this.breathe = 0;
    this._wasGrounded = true;
    // live joint values we damp toward targets
    this.j = {
      hipY: 0, hipPitch: 0, hipRoll: 0, hipYaw: 0,
      spinePitch: 0, spineRoll: 0, chestYaw: 0,
      headPitch: 0, headYaw: 0,
      lHipP: 0, lKnee: 0, lAnkle: 0,
      rHipP: 0, rKnee: 0, rAnkle: 0,
      lShP: 0, lShR: 0, lElb: 0,
      rShP: 0, rShR: 0, rElb: 0,
    };
  }

  /**
   * @param dt seconds
   * @param s  { state, speed, grounded, vy, moving, emote, emoteTime }
   *           state: idle | walk | run | sprint | crouch | jump | fall | sit
   */
  update(dt, s = {}) {
    const speed = s.speed || 0;
    const grounded = s.grounded !== false;
    const vy = s.vy || 0;
    const crouching = s.state === "crouch";
    const sitting = s.state === "sit";
    const running = s.state === "run" || s.state === "sprint";
    const sprinting = s.state === "sprint";
    const moving = speed > 0.35 && grounded && !sitting;

    const falling = s.state === "fall";
    if (falling) {
      this.fallTime = s.fallTime !== undefined ? s.fallTime : this.fallTime + dt;
    } else {
      this.fallTime = 0;
    }

    if (s.emote && !sitting) {
      if (this.currentEmote !== s.emote) {
        this.currentEmote = s.emote;
        this.emoteTime = s.emoteTime || 0;
      } else {
        this.emoteTime = s.emoteTime !== undefined ? s.emoteTime : this.emoteTime + dt;
      }
    } else {
      this.currentEmote = null;
      this.emoteTime = 0;
    }

    this.breathe += dt;

    // ── jump state machine ─────────────────────────────────────────
    this._tickJump(dt, grounded, vy);

    // ── blends ─────────────────────────────────────────────────────
    const bl = this.blend;
    bl.walk = damp(bl.walk, moving && !running && !falling && !sitting ? 1 : 0, 11, dt);
    bl.run = damp(bl.run, moving && running && !falling && !sitting ? 1 : 0, 9, dt);
    bl.crouch = damp(bl.crouch, crouching && !falling && !sitting ? 1 : 0, 10, dt);
    bl.air = damp(bl.air, grounded || falling || sitting ? 0 : 1, 13, dt);
    bl.fall = damp(bl.fall, falling ? 1 : 0, 20, dt);
    bl.sit = damp(bl.sit, sitting ? 1 : 0, 14, dt);
    bl.emote = damp(bl.emote, this.currentEmote && !moving && !falling && grounded && !sitting ? 1 : 0, 12, dt);

    // ── gait phase: stride frequency scales with actual speed ───────
    const strideHz = moving ? THREE.MathUtils.clamp(speed * 0.62, 1.1, 3.4) : 0;
    this.phase += dt * strideHz * Math.PI * 2;
    const ph = this.phase;
    const sin = Math.sin(ph);
    const cos = Math.cos(ph);

    const gait = bl.walk + bl.run;
    const amp = lerp(0.42, 0.86, bl.run) * gait; // leg swing amplitude
    const armAmp = lerp(0.34, 0.78, bl.run) * gait;

    const t = { ...ZERO };

    // ── legs: swing + knee flexion + ankle roll ────────────────────
    // Knees bend on the back-swing (never hyper-extend forward).
    const kneeL = Math.max(0, -Math.sin(ph - 0.6)) * lerp(0.9, 1.55, bl.run) * gait;
    const kneeR = Math.max(0, -Math.sin(ph + Math.PI - 0.6)) * lerp(0.9, 1.55, bl.run) * gait;
    t.lHipP = sin * amp;
    t.rHipP = -sin * amp;
    t.lKnee = -kneeL;
    t.rKnee = -kneeR;
    // toe-off / heel-strike
    t.lAnkle = -sin * 0.28 * gait;
    t.rAnkle = sin * 0.28 * gait;

    // ── arms: counter-swing, outward clearance to prevent body clipping ──
    t.lShP = -sin * armAmp;
    t.rShP = sin * armAmp;
    t.lShR = lerp(0.22, 0.32, bl.run); // arms held clearly away from ribs & hips
    t.rShR = -lerp(0.22, 0.32, bl.run);
    t.lElb = -(0.24 + Math.max(0, -sin) * lerp(0.5, 1.25, bl.run) * gait);
    t.rElb = -(0.24 + Math.max(0, sin) * lerp(0.5, 1.25, bl.run) * gait);

    // ── torso: bob, lean, counter-rotation ─────────────────────────
    const bob = Math.abs(cos) * lerp(0.028, 0.062, bl.run) * gait;
    t.hipY = -bob - bl.crouch * 0.34 - this.landImpact * 0.22;
    t.hipRoll = sin * 0.045 * gait;
    t.hipYaw = -sin * lerp(0.06, 0.13, bl.run) * gait;
    t.chestYaw = sin * lerp(0.1, 0.2, bl.run) * gait; // shoulders counter the hips
    t.spinePitch =
      lerp(0.03, sprinting ? 0.3 : 0.19, bl.run) * gait + bl.crouch * 0.46 + this.landImpact * 0.3;
    t.spineRoll = -sin * 0.03 * gait;
    // head stays level regardless of what the spine does
    t.headPitch = -t.spinePitch * 0.72;
    t.headYaw = -t.chestYaw * 0.3;

    // ── idle: breathing + natural hand actions + weight shift ───────
    const idleW = Math.max(0, 1 - gait - bl.air - bl.fall - bl.emote - bl.sit);
    if (idleW > 0.01) {
      const b = Math.sin(this.breathe * 1.5);
      const sway = Math.sin(this.breathe * 0.55);
      t.hipY += idleW * b * 0.012;
      t.spinePitch += idleW * (0.045 + b * 0.02);
      t.hipRoll += idleW * sway * 0.035;
      t.chestYaw += idleW * sway * 0.05;
      t.headYaw += idleW * Math.sin(this.breathe * 0.42) * 0.14;

      // Natural resting hand clearance outside thighs
      t.lShR += idleW * (0.06 + b * 0.02);
      t.rShR -= idleW * (0.06 + b * 0.02);
      t.lShP += idleW * (0.08 + b * 0.03);
      t.rShP += idleW * (0.08 + b * 0.03);
      t.lElb -= idleW * (0.08 + Math.abs(b) * 0.04);
      t.rElb -= idleW * (0.08 + Math.abs(b) * 0.04);
    }

    // ── sit overlay (relaxed posture on park bench) ─────────────────
    if (bl.sit > 0.001) {
      const k = bl.sit;
      t.hipY = lerp(t.hipY, 0.44, k); // Raise hips to rest on the bench seat (1.12m)
      t.lHipP = lerp(t.lHipP, 1.57, k); // Thighs project straight forward along seat
      t.rHipP = lerp(t.rHipP, 1.57, k);
      t.lKnee = lerp(t.lKnee, -1.57, k); // Knees bend 90 deg down over bench edge
      t.rKnee = lerp(t.rKnee, -1.57, k);
      t.lAnkle = lerp(t.lAnkle, 0.0, k);
      t.rAnkle = lerp(t.rAnkle, 0.0, k);
      t.spinePitch = lerp(t.spinePitch, -0.08, k); // Relaxed upright lean against backrest
      t.lShP = lerp(t.lShP, -0.55, k); // Hands resting on thighs
      t.rShP = lerp(t.rShP, -0.55, k);
      t.lShR = lerp(t.lShR, 0.22, k);
      t.rShR = lerp(t.rShR, -0.22, k);
      t.lElb = lerp(t.lElb, -1.1, k);
      t.rElb = lerp(t.rElb, -1.1, k);
      t.headPitch = lerp(t.headPitch, 0.02, k);
      t.headYaw = lerp(t.headYaw, Math.sin(this.breathe * 0.5) * 0.12, k);
    }

    // ── emote overlay (when standing still or manually triggered) ───
    if (bl.emote > 0.001 && this.currentEmote) {
      const ep = this._emotePose(this.currentEmote, this.emoteTime);
      const k = bl.emote;
      for (const key in ep) {
        t[key] = lerp(t[key], ep[key], k);
      }
    }

    // ── crouch overlay ─────────────────────────────────────────────
    if (bl.crouch > 0.01) {
      t.lHipP += bl.crouch * 0.62;
      t.rHipP += bl.crouch * 0.62;
      t.lKnee -= bl.crouch * 1.25;
      t.rKnee -= bl.crouch * 1.25;
      t.lAnkle += bl.crouch * 0.42;
      t.rAnkle += bl.crouch * 0.42;
      t.lShP += bl.crouch * 0.2;
      t.rShP += bl.crouch * 0.2;
    }

    // ── airborne overlay (overrides the gait) ──────────────────────
    if (bl.air > 0.01) {
      const a = this._airPose(vy);
      const k = bl.air;
      for (const key in a) t[key] = lerp(t[key], a[key], k);
    }

    // ── fall overlay (vehicle knockdown & get up) ─────────────────
    if (bl.fall > 0.001) {
      const fp = this._fallPose(this.fallTime);
      const k = bl.fall;
      for (const key in fp) {
        t[key] = lerp(t[key], fp[key], k);
      }
    }

    // ── launch anticipation (still grounded, about to leave) ───────
    if (this.jump.state === "launch") {
      const k = 1 - this.jump.t / LAUNCH_T;
      t.hipY -= k * 0.2;
      t.lKnee -= k * 1.1;
      t.rKnee -= k * 1.1;
      t.lHipP += k * 0.55;
      t.rHipP += k * 0.55;
      t.spinePitch += k * 0.3;
      t.lShP += k * 0.7;
      t.rShP += k * 0.7;
    }

    // ── damp everything toward the target, then apply ──────────────
    const L = grounded ? 18 : 13;
    for (const key in this.j) this.j[key] = damp(this.j[key], t[key], L, dt);
    this.landImpact = damp(this.landImpact, 0, 7, dt);

    this._apply();
  }

  _tickJump(dt, grounded, vy) {
    const J = this.jump;
    J.t += dt;
    if (J.state === "launch" && (J.t >= LAUNCH_T || !grounded)) J.state = "air";
    if (!grounded && J.state !== "air") J.state = "air";
    if (grounded && this._wasGrounded === false) {
      // touchdown — absorb proportional to how hard we hit
      this.landImpact = THREE.MathUtils.clamp(Math.abs(vy) / 9, 0.25, 1);
      J.state = "land";
      J.t = 0;
    }
    if (J.state === "land" && J.t > 0.28) J.state = "none";
    this._wasGrounded = grounded;
  }

  /** Called by the controller the instant a jump is committed. */
  triggerJump() {
    this.jump.state = "launch";
    this.jump.t = 0;
  }

  _fallPose(t) {
    if (t < 0.35) {
      // 1. Airborne knockback fling (0.0s - 0.35s)
      const k = t / 0.35;
      return {
        ...ZERO,
        hipY: 0.14 * Math.sin(k * Math.PI),
        hipPitch: -k * 1.15,
        spinePitch: -0.55 * k,
        headPitch: -0.45 * k,
        lHipP: 0.75 * k,
        rHipP: 0.55 * k,
        lKnee: -0.6 * k,
        rKnee: -0.85 * k,
        lShP: -1.75 * k,
        rShP: -1.75 * k,
        lShR: 0.9 * k,
        rShR: -0.9 * k,
        lElb: -0.45 * k,
        rElb: -0.45 * k,
      };
    } else if (t < 1.15) {
      // 2. Flat on back on ground & groggy shake (0.35s - 1.15s)
      const headGrogginess = Math.sin((t - 0.35) * 7);
      const headShake = Math.sin((t - 0.35) * 4);
      return {
        ...ZERO,
        hipY: -0.48 / this.vScale,
        hipPitch: -Math.PI * 0.48,
        spinePitch: 0.05,
        headPitch: 0.42 + (t > 0.6 ? headGrogginess * 0.12 : 0),
        headYaw: t > 0.6 ? headShake * 0.28 : 0,
        lHipP: -0.08,
        rHipP: -0.08,
        lKnee: -0.05,
        rKnee: -0.05,
        lAnkle: 0.1,
        rAnkle: 0.1,
        lShP: -0.5,
        rShP: -0.5,
        lShR: 1.35,
        rShR: -1.35,
        lElb: -0.15,
        rElb: -0.15,
      };
    } else if (t < 1.65) {
      // 3. Rolling forward, kneeling & pushing off ground (1.15s - 1.65s)
      const k = (t - 1.15) / 0.5;
      const easeK = k * k * (3 - 2 * k); // smoothstep
      return {
        ...ZERO,
        hipY: lerp(-0.48 / this.vScale, -0.2 / this.vScale, easeK),
        hipPitch: lerp(-Math.PI * 0.48, 0.3, easeK),
        spinePitch: lerp(0.05, 0.45, easeK),
        headPitch: lerp(0.42, -0.25, easeK),
        lHipP: lerp(-0.08, 0.65, easeK),
        rHipP: lerp(-0.08, 0.65, easeK),
        lKnee: -lerp(0.05, 1.4, easeK),
        rKnee: -lerp(0.05, 1.4, easeK),
        lShP: lerp(-0.5, 0.8, easeK),
        rShP: lerp(-0.5, 0.8, easeK),
        lShR: lerp(1.35, 0.25, easeK),
        rShR: lerp(-1.35, -0.25, easeK),
        lElb: -lerp(0.15, 1.2, easeK),
        rElb: -lerp(0.15, 1.2, easeK),
      };
    } else {
      // 4. Standing up tall & brushing off shoulders (1.65s - 1.9s)
      const k = Math.min(1, (t - 1.65) / 0.25);
      const easeK = k * k * (3 - 2 * k);
      const brush = Math.sin(k * Math.PI * 3);
      return {
        ...ZERO,
        hipY: lerp(-0.2 / this.vScale, 0, easeK),
        hipPitch: lerp(0.3, 0, easeK),
        spinePitch: lerp(0.45, 0.05, easeK),
        chestYaw: brush * 0.15,
        headPitch: lerp(-0.25, 0, easeK),
        headYaw: brush * 0.2,
        lHipP: lerp(0.65, 0, easeK),
        rHipP: lerp(0.65, 0, easeK),
        lKnee: -lerp(1.4, 0, easeK),
        rKnee: -lerp(1.4, 0, easeK),
        lShP: lerp(0.8, 0, easeK),
        rShP: lerp(0.8, 0, easeK),
        lShR: lerp(0.25, 0.1, easeK),
        rShR: lerp(-0.25, -0.1, easeK),
        lElb: -lerp(1.2, 0.1, easeK),
        rElb: -lerp(1.2, 0.1, easeK),
      };
    }
  }

  _airPose(vy) {
    // rising -> tuck & reach up;  falling -> extend legs, arms out for balance
    const rising = THREE.MathUtils.clamp(vy / 7, 0, 1);
    const falling = THREE.MathUtils.clamp(-vy / 9, 0, 1);
    return {
      ...ZERO,
      hipY: -0.05,
      hipPitch: 0,
      hipRoll: 0,
      hipYaw: 0,
      spinePitch: 0.16 + rising * 0.14 - falling * 0.18,
      spineRoll: 0,
      chestYaw: 0,
      headPitch: -0.1 + falling * 0.2,
      headYaw: 0,
      // trailing leg tucks, lead leg reaches
      lHipP: lerp(-0.15, 0.5, rising) - falling * 0.35,
      rHipP: lerp(0.55, 0.1, rising) + falling * 0.1,
      lKnee: -lerp(0.35, 1.5, rising) * (1 - falling * 0.6),
      rKnee: -lerp(1.2, 0.5, rising) * (1 - falling * 0.5),
      lAnkle: 0.25 - falling * 0.45,
      rAnkle: 0.15 - falling * 0.4,
      // arms up on the way up, out to the sides on the way down
      lShP: -1.45 * rising + 0.35 * falling,
      rShP: -1.45 * rising + 0.35 * falling,
      lShR: 0.25 + falling * 0.75,
      rShR: -0.25 - falling * 0.75,
      lElb: -0.45 - rising * 0.5,
      rElb: -0.45 - rising * 0.5,
    };
  }

  _apply() {
    const { rig, j } = this;
    rig.hip.position.y = this.baseHipY + j.hipY * this.vScale;
    rig.hip.rotation.x = j.hipPitch;
    rig.hip.rotation.z = j.hipRoll;
    rig.hip.rotation.y = j.hipYaw;
    rig.spine.rotation.x = j.spinePitch * 0.45;
    rig.spine.rotation.z = j.spineRoll;
    rig.chest.rotation.x = j.spinePitch * 0.55;
    rig.chest.rotation.y = j.chestYaw;
    rig.head.rotation.x = j.headPitch;
    rig.head.rotation.y = j.headYaw;

    rig.legL.hipJoint.rotation.x = j.lHipP;
    rig.legR.hipJoint.rotation.x = j.rHipP;
    rig.legL.knee.rotation.x = j.lKnee;
    rig.legR.knee.rotation.x = j.rKnee;
    rig.legL.ankle.rotation.x = j.lAnkle;
    rig.legR.ankle.rotation.x = j.rAnkle;

    rig.armL.shoulder.rotation.x = j.lShP;
    rig.armR.shoulder.rotation.x = j.rShP;
    rig.armL.shoulder.rotation.z = j.lShR;
    rig.armR.shoulder.rotation.z = j.rShR;
    rig.armL.elbow.rotation.x = j.lElb;
    rig.armR.elbow.rotation.x = j.rElb;
  }

  _emotePose(name, t) {
    const clamp01 = (v) => THREE.MathUtils.clamp(v, 0, 1);

    switch (name) {
      case "wave": {
        // Friendly wave with right hand, smiling & subtle sway
        const enterK = clamp01(t / 0.35);
        const waveOsc = Math.sin(t * 11);
        return {
          ...ZERO,
          hipRoll: Math.sin(t * 4) * 0.04,
          spineRoll: Math.sin(t * 4) * 0.03,
          chestYaw: Math.sin(t * 4) * 0.06,
          headPitch: -0.05,
          headYaw: 0.15,
          lShP: 0.08,
          lShR: 0.24,
          lElb: -0.22,
          rShP: lerp(0.08, -2.1, enterK),
          rShR: lerp(-0.24, -0.42 + waveOsc * 0.36, enterK),
          rElb: lerp(-0.22, -1.25 + Math.cos(t * 11) * 0.2, enterK),
        };
      }

      case "stretch": {
        // Raising both arms overhead, arching spine back
        const archK = Math.sin(clamp01(t / 3.2) * Math.PI);
        return {
          ...ZERO,
          hipY: 0.035 * archK,
          spinePitch: -0.22 * archK,
          headPitch: -0.38 * archK,
          lShP: lerp(0.08, -2.6, archK),
          rShP: lerp(0.08, -2.6, archK),
          lShR: lerp(0.24, 0.3, archK),
          rShR: lerp(-0.24, -0.3, archK),
          lElb: lerp(-0.22, -0.35, archK),
          rElb: lerp(-0.22, -0.35, archK),
        };
      }

      case "dance_step": {
        // Joyful rhythmic groove / bounce
        const b = Math.sin(t * 7);
        const b2 = Math.cos(t * 7);
        return {
          ...ZERO,
          hipY: -Math.abs(b) * 0.05,
          hipRoll: b * 0.08,
          hipYaw: b2 * 0.12,
          chestYaw: -b2 * 0.14,
          headPitch: Math.sin(t * 14) * 0.08,
          headYaw: b * 0.12,
          lHipP: b * 0.12,
          rHipP: -b * 0.12,
          lKnee: -Math.max(0, b) * 0.3,
          rKnee: -Math.max(0, -b) * 0.3,
          lShP: -0.45 + b * 0.38,
          rShP: -0.45 - b * 0.38,
          lShR: 0.28 + b2 * 0.1,
          rShR: -0.28 + b2 * 0.1,
          lElb: -1.15 + b2 * 0.45,
          rElb: -1.15 - b2 * 0.45,
        };
      }

      case "check_phone": {
        // Left hand holds phone, right finger taps
        const enterK = clamp01(t / 0.4);
        const tap = Math.sin(t * 9) * 0.15;
        return {
          ...ZERO,
          spinePitch: 0.08,
          headPitch: 0.38,
          headYaw: -0.15,
          lShP: lerp(0.08, -1.2, enterK),
          lShR: lerp(0.24, 0.18, enterK),
          lElb: lerp(-0.22, -1.75, enterK),
          rShP: lerp(0.08, -1.05 + tap, enterK),
          rShR: lerp(-0.24, -0.18, enterK),
          rElb: lerp(-0.22, -1.6 + tap, enterK),
        };
      }

      case "look_around": {
        // Right hand visors brow, body slowly pans left & right
        const enterK = clamp01(t / 0.4);
        const sweep = Math.sin(t * 2.2);
        return {
          ...ZERO,
          chestYaw: sweep * 0.42,
          headYaw: sweep * 0.65,
          headPitch: -0.05,
          lShP: 0.08,
          lShR: 0.46,
          lElb: -1.1,
          rShP: lerp(0.08, -1.78, enterK),
          rShR: lerp(-0.24, -0.15, enterK),
          rElb: lerp(-0.22, -1.85, enterK),
        };
      }

      case "hands_on_hips": {
        // Hands planted on hips, proud chest & nodding
        const enterK = clamp01(t / 0.4);
        return {
          ...ZERO,
          spinePitch: -0.08,
          headPitch: Math.sin(t * 4) * 0.08,
          lShP: 0.12,
          rShP: 0.12,
          lShR: lerp(0.24, 0.54, enterK),
          rShR: lerp(-0.24, -0.54, enterK),
          lElb: lerp(-0.22, -1.62, enterK),
          rElb: lerp(-0.22, -1.62, enterK),
        };
      }

      case "yawn": {
        // Sleepy stretch with hand covering mouth
        const enterK = clamp01(t / 0.5);
        const ease = Math.sin(clamp01(t / 3.0) * Math.PI);
        return {
          ...ZERO,
          spinePitch: -0.16 * ease,
          headPitch: -0.28 * ease,
          lShP: 0.06,
          lShR: 0.26,
          lElb: -0.18,
          rShP: lerp(0.08, -1.48, enterK),
          rShR: lerp(-0.24, -0.16, enterK),
          rElb: lerp(-0.22, -1.8, enterK),
        };
      }

      case "cheer_fist_pump": {
        // Joyful celebrations & jumping fist pumps
        const p1 = Math.sin(t * 9);
        const p2 = Math.cos(t * 9);
        return {
          ...ZERO,
          hipY: -Math.abs(p1) * 0.045,
          spinePitch: -0.06,
          headPitch: -0.18,
          lShP: -2.05 + p1 * 0.45,
          rShP: -2.05 + p2 * 0.45,
          lShR: 0.22,
          rShR: -0.22,
          lElb: -1.35 + p1 * 0.35,
          rElb: -1.35 + p2 * 0.35,
        };
      }

      case "peace_sign": {
        // Victory V pose with playful head tilt
        const enterK = clamp01(t / 0.35);
        return {
          ...ZERO,
          spineRoll: 0.08,
          headPitch: -0.06,
          headYaw: 0.18,
          lShP: 0.25,
          lShR: 0.32,
          lElb: -0.6,
          rShP: lerp(0.08, -1.7, enterK),
          rShR: lerp(-0.24, -0.38, enterK),
          rElb: lerp(-0.22, -1.68, enterK),
        };
      }

      case "inspect_shoes": {
        // Looking down, brushing shoe/pant
        const enterK = clamp01(t / 0.4);
        const brush = Math.sin(t * 6);
        return {
          ...ZERO,
          spinePitch: lerp(0.05, 0.42, enterK),
          headPitch: lerp(0, 0.58, enterK),
          rHipP: lerp(0, -0.28, enterK),
          rKnee: lerp(0, -0.55, enterK),
          lShR: 0.28,
          lElb: -0.22,
          rShP: lerp(0.08, -0.68, enterK),
          rShR: -0.25,
          rElb: lerp(-0.22, -0.92 + brush * 0.28, enterK),
        };
      }

      case "warmup_jumps": {
        // Athletic boxer / runner bounce
        const hop = Math.sin(t * 11);
        return {
          ...ZERO,
          hipY: -Math.abs(hop) * 0.055,
          lKnee: -Math.abs(hop) * 0.3,
          rKnee: -Math.abs(hop) * 0.3,
          lShP: -0.85 + hop * 0.25,
          rShP: -0.85 - hop * 0.25,
          lShR: 0.22,
          rShR: -0.22,
          lElb: -1.45,
          rElb: -1.45,
        };
      }

      case "clap": {
        // Clapping hands in front of chest
        const clapOsc = Math.sin(t * 10);
        return {
          ...ZERO,
          spinePitch: 0.04,
          headPitch: Math.sin(t * 10) * 0.06,
          lShP: -0.92,
          rShP: -0.92,
          lShR: -0.22 + clapOsc * 0.26,
          rShR: 0.22 - clapOsc * 0.26,
          lElb: -1.35,
          rElb: -1.35,
        };
      }

      case "shrug": {
        // Raising shoulders, open palms out
        const enterK = clamp01(t / 0.35);
        return {
          ...ZERO,
          hipY: 0.02 * enterK,
          spinePitch: 0.06,
          headPitch: -0.14,
          headYaw: 0.16,
          lShP: -0.18,
          rShP: -0.18,
          lShR: lerp(0.24, 0.62, enterK),
          rShR: lerp(-0.24, -0.62, enterK),
          lElb: lerp(-0.22, -0.95, enterK),
          rElb: lerp(-0.22, -0.95, enterK),
        };
      }

      case "deep_breath": {
        // Deep refreshing breath with chest expansion
        const b = Math.sin(clamp01(t / 3.2) * Math.PI);
        return {
          ...ZERO,
          hipY: 0.025 * b,
          spinePitch: -0.12 * b,
          headPitch: -0.24 * b,
          lShP: 0.08,
          rShP: 0.08,
          lShR: 0.24 + b * 0.32,
          rShR: -0.24 - b * 0.32,
          lElb: -0.22 - b * 0.35,
          rElb: -0.22 - b * 0.35,
        };
      }

      case "traffic_stick_raise": {
        // Traffic Police Officer directing traffic with stick:
        // - Raises right arm high with stick/baton (5-second commanding gesture)
        // - Turns head & chest vigilance to look across the intersection
        // - Left hand signals stop/go with commanding wave
        const enterK = clamp01(t / 0.6);
        const exitK = t > 4.2 ? clamp01((5.0 - t) / 0.8) : 1.0;
        const k = enterK * exitK;
        const sweep = Math.sin(t * 1.8);
        const batonWave = Math.sin(t * 3.5);
        return {
          ...ZERO,
          chestYaw: sweep * 0.35 * k,
          headYaw: sweep * 0.55 * k,
          headPitch: -0.06 * k,
          spinePitch: -0.04 * k,
          // Left arm gesturing / traffic control wave
          lShP: lerp(0.08, -0.65 + Math.sin(t * 2.5) * 0.25, k),
          lShR: lerp(0.24, 0.52, k),
          lElb: lerp(-0.22, -1.15, k),
          // Right arm raised holding traffic stick high
          rShP: lerp(0.08, -1.95 + batonWave * 0.15, k),
          rShR: lerp(-0.24, -0.42, k),
          rElb: lerp(-0.22, -0.95 + batonWave * 0.22, k),
        };
      }

      case "point_ahead":
      default: {
        // Pointing straight ahead into distance
        const enterK = clamp01(t / 0.35);
        return {
          ...ZERO,
          headPitch: -0.04,
          headYaw: 0.06,
          lShP: 0.12,
          lShR: 0.46,
          lElb: -1.2,
          rShP: lerp(0.08, -1.58, enterK),
          rShR: lerp(-0.24, 0.05, enterK),
          rElb: lerp(-0.22, -0.15, enterK),
        };
      }
    }
  }
}

export const EMOTES = [
  "wave",
  "stretch",
  "dance_step",
  "check_phone",
  "look_around",
  "hands_on_hips",
  "yawn",
  "cheer_fist_pump",
  "peace_sign",
  "inspect_shoes",
  "warmup_jumps",
  "clap",
  "shrug",
  "deep_breath",
  "point_ahead",
  "traffic_stick_raise",
];

export const EMOTE_DURATIONS = {
  wave: 2.8,
  stretch: 3.2,
  dance_step: 3.5,
  check_phone: 3.0,
  look_around: 3.4,
  hands_on_hips: 2.8,
  yawn: 3.0,
  cheer_fist_pump: 2.6,
  peace_sign: 2.5,
  inspect_shoes: 3.2,
  warmup_jumps: 2.8,
  clap: 2.6,
  shrug: 2.5,
  deep_breath: 3.2,
  point_ahead: 2.8,
  traffic_stick_raise: 5.0,
};

const LAUNCH_T = 0.09;

const ZERO = {
  hipY: 0, hipPitch: 0, hipRoll: 0, hipYaw: 0,
  spinePitch: 0, spineRoll: 0, chestYaw: 0,
  headPitch: 0, headYaw: 0,
  lHipP: 0, lKnee: 0, lAnkle: 0,
  rHipP: 0, rKnee: 0, rAnkle: 0,
  lShP: 0, lShR: 0, lElb: 0,
  rShP: 0, rShR: 0, rElb: 0,
};
