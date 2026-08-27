import * as THREE from "three";
import { forEachBlock, plazaRect, timesSquareRect } from "../../../components/map/three/cityGrid.js";
import { createNpcModel } from "../../characters/npc/NpcModel.js";
import { PlayerAnimator } from "../../characters/player/PlayerAnimator.js";

/**
 * Animated Pedestrian & NPC Crowds System.
 *
 * Spawns dynamic, lively pedestrians walking along city sidewalks, central park
 * stone roads, and plaza promenades. Each NPC is uniquely constructed with its
 * own clothing archetype (hoodie, business suit, summer activewear, cozy sweater,
 * urban jacket, chic beret), distinct hairstyle/headwear, eyewear, accessories,
 * color palette, and procedural walk animation.
 */

export class NpcSystem {
  /** Pedestrians farther than this from the camera are not drawn at all. */
  static CULL_DIST = 420;

  constructor(engine) {
    this.engine = engine;
    this.agents = [];
    this.group = new THREE.Group();
    this.group.name = "animated-npc-crowd";

    this._initWaypoints();
    this._spawnNpcs();
    this.engine.environmentGroup.add(this.group);
  }

  _initWaypoints() {
    this.routes = [];

    // 1. Sidewalk routes around city blocks
    forEachBlock((blk) => {
      if (!blk.buildable) return;
      const margin = 2.4;
      const x0 = blk.x0 - margin;
      const x1 = blk.x1 + margin;
      const z0 = blk.z0 - margin;
      const z1 = blk.z1 + margin;

      // Clockwise perimeter loop
      this.routes.push([
        { x: x0, z: z0 },
        { x: x1, z: z0 },
        { x: x1, z: z1 },
        { x: x0, z: z1 },
      ]);
      // Counter-clockwise perimeter loop
      this.routes.push([
        { x: x0, z: z1 },
        { x: x1, z: z1 },
        { x: x1, z: z0 },
        { x: x0, z: z0 },
      ]);
    });

    // 2. Central Park pathways & fountain promenade
    const p = plazaRect();
    const cx = p.cx;
    const cz = p.cz;

    // Outer promenade circle routes (CW and CCW)
    const outerPtsCW = [];
    const outerPtsCCW = [];
    const numOuter = 16;
    for (let i = 0; i < numOuter; i++) {
      const a = (i / numOuter) * Math.PI * 2;
      outerPtsCW.push({ x: cx + Math.cos(a) * 56, z: cz + Math.sin(a) * 56 });
      const aCCW = ((numOuter - i) / numOuter) * Math.PI * 2;
      outerPtsCCW.push({ x: cx + Math.cos(aCCW) * 56, z: cz + Math.sin(aCCW) * 56 });
    }
    this.routes.push(outerPtsCW);
    this.routes.push(outerPtsCCW);

    // Inner fountain promenade routes (CW and CCW)
    const innerPtsCW = [];
    const innerPtsCCW = [];
    const numInner = 12;
    for (let i = 0; i < numInner; i++) {
      const a = (i / numInner) * Math.PI * 2;
      innerPtsCW.push({ x: cx + Math.cos(a) * 26, z: cz + Math.sin(a) * 26 });
      const aCCW = ((numInner - i) / numInner) * Math.PI * 2;
      innerPtsCCW.push({ x: cx + Math.cos(aCCW) * 26, z: cz + Math.sin(aCCW) * 26 });
    }
    this.routes.push(innerPtsCW);
    this.routes.push(innerPtsCCW);

    // 3. Radial avenues through the park connecting cardinal gates
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      this.routes.push([
        { x: cx + cos * 66, z: cz + sin * 66 },
        { x: cx + cos * 22, z: cz + sin * 22 },
        { x: cx - sin * 22, z: cz + cos * 22 },
        { x: cx - sin * 66, z: cz + cos * 66 },
      ]);
    }

    // 4. TIMES SQUARE — kept in its own list because the square gets its own
    // (much larger) share of the crowd. The park had a countable handful of
    // walkers; the crossroads is meant to feel shoulder-to-shoulder.
    this.tsRoutes = [];
    const ts = timesSquareRect();
    const tx = ts.cx;
    const tz = ts.cz;
    const tw = (ts.x1 - ts.x0) * 0.5;
    const td = (ts.z1 - ts.z0) * 0.5;

    // Concentric pedestrian loops around the bow-tie plaza, both directions.
    [0.9, 0.72, 0.54, 0.36].forEach((k, ri) => {
      const cwPts = [];
      const ccwPts = [];
      const N = 20;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        cwPts.push({ x: tx + Math.cos(a) * tw * k, z: tz + Math.sin(a) * td * k });
        const b = ((N - i) / N) * Math.PI * 2;
        ccwPts.push({ x: tx + Math.cos(b) * tw * k, z: tz + Math.sin(b) * td * k });
      }
      this.tsRoutes.push(cwPts);
      if (ri % 2 === 0) this.tsRoutes.push(ccwPts);
    });

    // Crossing shuttles: people cutting straight across the square, plus the
    // four approach sidewalks feeding into it.
    for (let i = 0; i < 6; i++) {
      const off = (i / 5 - 0.5) * td * 1.3;
      this.tsRoutes.push([
        { x: tx - tw * 1.5, z: tz + off },
        { x: tx + tw * 1.5, z: tz + off },
      ]);
      const offX = (i / 5 - 0.5) * tw * 1.3;
      this.tsRoutes.push([
        { x: tx + offX, z: tz - td * 1.5 },
        { x: tx + offX, z: tz + td * 1.5 },
      ]);
    }
    // Sidewalk perimeter just outside the bollard ring.
    this.tsRoutes.push([
      { x: tx - tw * 1.12, z: tz - td * 1.12 },
      { x: tx + tw * 1.12, z: tz - td * 1.12 },
      { x: tx + tw * 1.12, z: tz + td * 1.12 },
      { x: tx - tw * 1.12, z: tz + td * 1.12 },
    ]);
    this.tsRoutes.push([
      { x: tx - tw * 1.12, z: tz + td * 1.12 },
      { x: tx + tw * 1.12, z: tz + td * 1.12 },
      { x: tx + tw * 1.12, z: tz - td * 1.12 },
      { x: tx - tw * 1.12, z: tz - td * 1.12 },
    ]);
  }

  _spawnNpcs() {
    // A city this size looked deserted with 60 walkers. The general grid keeps
    // ~220 walkers; Times Square gets 180 of its own on top, so the square is
    // visibly the crowded part of town rather than one more quiet block.
    const cityCount = Math.min(150, this.routes.length * 3);
    // The square carries more walkers than the whole rest of the grid. It is
    // backed by a static instanced crowd too (see timesSquare.js buildCrowd) —
    // these are the ones that move through it.
    const tsCount = 230;
    const count = cityCount + tsCount;

    for (let i = 0; i < count; i++) {
      const inTs = i >= cityCount;
      const pool = inTs ? this.tsRoutes : this.routes;
      const routeIdx = inTs
        ? (i * 5 + Math.floor(i / pool.length)) % pool.length
        : (i * 7 + Math.floor(i / pool.length)) % pool.length;
      const route = pool[routeIdx];
      const startWpIdx = Math.floor(Math.random() * route.length);
      const nextWpIdx = (startWpIdx + 1) % route.length;

      const p0 = route[startWpIdx];
      const p1 = route[nextWpIdx];
      const lerpT = Math.random();

      // Wider lateral jitter on the square so the crowd fills the plaza
      // instead of tracing four visible conga lines.
      const jitter = inTs ? 4.5 : 1.0;
      const x = p0.x + (p1.x - p0.x) * lerpT + (Math.random() - 0.5) * jitter;
      const z = p0.z + (p1.z - p0.z) * lerpT + (Math.random() - 0.5) * jitter;
      const dx = p1.x - p0.x;
      const dz = p1.z - p0.z;
      const yaw = Math.atan2(dx, dz);

      // Create unique NPC model with pseudo-random seed
      const seed = i * 79.19 + 42.13;
      const model = createNpcModel({ seed, archetypeIndex: i % 6 });
      const animator = new PlayerAnimator(model.rig);

      // Ensure model shoes sit on top of road/sidewalk surface
      model.group.position.set(x, 0.10, z);
      model.group.rotation.y = yaw;
      this.group.add(model.group);

      const speed = 1.15 + Math.random() * 0.55; // 1.15 to 1.70 m/s

      const agent = {
        id: i,
        model,
        animator,
        x,
        z,
        y: 0.10,
        yaw,
        speed,
        route,
        wpIdx: nextWpIdx,
        pauseTimer: Math.random() > 0.8 ? Math.random() * 3 : 0,
        animState: "walk",
      };

      this.agents.push(agent);
    }
  }

  update(dt) {
    if (!this.agents.length) return;
    dt = Math.min(dt, 0.05);

    const camPos = this.engine.camera?.position;

    for (let i = 0; i < this.agents.length; i++) {
      const a = this.agents[i];

      // Distance from camera for LOD optimization
      let distToCam = 0;
      if (camPos) {
        distToCam = Math.hypot(camPos.x - a.x, camPos.z - a.z);
      }

      // Two-stage LOD. Beyond CULL_DIST a pedestrian is well under a pixel, so
      // the whole body is hidden — that is what pays for the much larger Times
      // Square crowd. Between the two thresholds the model still draws but the
      // per-bone walk cycle is skipped.
      const visible = distToCam < NpcSystem.CULL_DIST;
      if (a.model.group.visible !== visible) a.model.group.visible = visible;
      if (!visible) continue;
      const isClose = distToCam < 160;

      // Occasional pause/idle to admire the city, fountain, or check phone
      if (a.pauseTimer > 0) {
        a.pauseTimer -= dt;
        a.animState = "idle";
      } else {
        // Move towards current target waypoint
        const target = a.route[a.wpIdx];
        const tx = target.x;
        const tz = target.z;
        const dx = tx - a.x;
        const dz = tz - a.z;
        const dist = Math.hypot(dx, dz);

        if (dist < 1.5) {
          a.wpIdx = (a.wpIdx + 1) % a.route.length;
          // 15% chance to pause at a sidewalk / park vista
          if (Math.random() < 0.15) {
            a.pauseTimer = 2.0 + Math.random() * 3.0;
            a.animState = "idle";
          }
        } else {
          a.animState = "walk";
          const targetYaw = Math.atan2(dx, dz);

          // Shortest angle rotation
          let dy = targetYaw - a.yaw;
          while (dy < -Math.PI) dy += Math.PI * 2;
          while (dy > Math.PI) dy -= Math.PI * 2;
          a.yaw += dy * Math.min(1, dt * 5.5);

          const step = a.speed * dt;
          a.x += Math.sin(a.yaw) * step;
          a.z += Math.cos(a.yaw) * step;
        }
      }

      // Update model group transform
      a.model.group.position.set(a.x, a.y, a.z);
      a.model.group.rotation.y = a.yaw;

      // Drive procedural animation
      if (isClose) {
        a.animator.update(dt, {
          state: a.animState,
          speed: a.animState === "walk" ? a.speed : 0,
          grounded: true,
          vy: 0,
        });
      }
    }
  }

  dispose() {
    this.agents.forEach((a) => {
      if (a.model) a.model.dispose();
    });
    this.group.clear();
    this.agents = [];
  }
}


