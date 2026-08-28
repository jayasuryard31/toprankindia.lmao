import * as THREE from "three";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import { avenues, streets, worldBounds } from "./cityGrid.js";
import { finishTex, mulberry } from "./cityProps.js";
import { createNpcModel } from "../../../game/characters/npc/NpcModel.js";
import { PlayerAnimator } from "../../../game/characters/player/PlayerAnimator.js";

/**
 * railway.js - the Velora Harbor loop line.
 *
 * A single street-running light-rail loop that circles the whole city and cuts
 * straight through Times Square, with one train shuttling between three
 * stations.
 *
 * ── Why it never collides with the roads ────────────────────────────────
 * The track is laid on ROAD CENTRELINES, and the traffic system parks every
 * vehicle in an offset lane - ±ROAD_W_AVENUE/4 on avenues, ±ROAD_W_STREET/4 on
 * streets - so the centre strip of each carriageway is permanently empty. That
 * is the corridor the rails occupy, which is also exactly how a real
 * street-running tram shares a road. The four corner curves use a 9m radius,
 * chosen so each arc's bounding box stays inside the road intersection and
 * never reaches the building blocks (they begin 11m from the centreline).
 *
 * Because the line is flush street track there is no ballast or sleepers -
 * just grooved rails and a slightly darker track bed, the way tram track is
 * actually laid into tarmac.
 *
 * ── The train is scenery ────────────────────────────────────────────────
 * The player can never board it. There is no interaction prompt, and the cars
 * are fed to the engine as dynamic solids, so walking into one stops you the
 * same way a bus does.
 */

// Loop geometry, in world units. Both legs sit on real road centrelines:
// x = ±231 are avenues 2 and 5, z = ±850 are streets 1 and 18.
const LOOP_X = 231;
const LOOP_Z = 850;
const CORNER_R = 9;

const RAIL_GAUGE = 1.44; // centre-to-centre of the two rails
const RAIL_Y = 0.2;
const BED_HALF = 1.7;

const CRUISE = 15; // m/s
const ACCEL = 3.2;
const BRAKE = 2.6;
const DWELL = 7.0; // seconds stopped, doors open

const CAR_LEN = 17;
const CAR_GAP = 1.4;
const CAR_W = 2.6;
const CAR_H = 3.2;
const CARS = 3;

/** The three stops, given as arc positions resolved once the path is built. */
const STATIONS = [
  {
    id: "times-square",
    name: "TIMES SQUARE",
    x: LOOP_X,
    z: 700,
    side: 1, // which side of the track the headhouse sits on
    headhouse: false, // the square is its own concourse
  },
  {
    id: "harbor-gate",
    name: "HARBOR GATE",
    x: LOOP_X,
    z: -300,
    side: 1,
    headhouse: true,
  },
  {
    id: "velora-central",
    name: "VELORA CENTRAL",
    x: -LOOP_X,
    z: -500,
    side: 1,
    headhouse: true,
    grand: true, // the main terminus, outside Times Square
  },
];

// ── Path construction ─────────────────────────────────────────────────

/**
 * The closed loop, sampled into a polyline with cumulative arc length so the
 * train can be driven by distance rather than by curve parameter (which would
 * make it speed up round the corners).
 */
function buildLoopPath() {
  const pts = [];
  const push = (x, z) => {
    const last = pts[pts.length - 1];
    if (last && Math.hypot(last.x - x, last.z - z) < 0.01) return;
    pts.push({ x, z });
  };

  const straight = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(2, Math.round(len / 4));
    for (let i = 0; i <= n; i++) push(x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n);
  };
  const arc = (ccx, ccz, a0, a1) => {
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      push(ccx + Math.cos(a) * CORNER_R, ccz + Math.sin(a) * CORNER_R);
    }
  };

  const X = LOOP_X;
  const Z = LOOP_Z;
  const R = CORNER_R;
  const D = Math.PI / 180;

  // Clockwise from the north end of the east avenue.
  straight(X, -Z + R, X, Z - R);
  arc(X - R, Z - R, 0, 90 * D);
  straight(X - R, Z, -X + R, Z);
  arc(-X + R, Z - R, 90 * D, 180 * D);
  straight(-X, Z - R, -X, -Z + R);
  arc(-X + R, -Z + R, 180 * D, 270 * D);
  straight(-X + R, -Z, X - R, -Z);
  arc(X - R, -Z + R, 270 * D, 360 * D);

  // cumulative arc length, closing the loop back onto point 0
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum[i] = cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
  }
  const total =
    cum[cum.length - 1] +
    Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].z - pts[pts.length - 1].z);

  return { pts, cum, total };
}

/** World position + heading at arc distance `s` (wraps around the loop). */
function sampleAt(path, s) {
  const { pts, cum, total } = path;
  let d = s % total;
  if (d < 0) d += total;

  // binary search the segment
  let lo = 0;
  let hi = cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (cum[mid] <= d) lo = mid;
    else hi = mid - 1;
  }
  const a = pts[lo];
  const b = pts[(lo + 1) % pts.length];
  const segLen = Math.max(1e-4, (lo + 1 < cum.length ? cum[lo + 1] : total) - cum[lo]);
  const t = Math.min(1, (d - cum[lo]) / segLen);

  const x = a.x + (b.x - a.x) * t;
  const z = a.z + (b.z - a.z) * t;
  const yaw = Math.atan2(b.x - a.x, b.z - a.z);
  return { x, z, yaw };
}

/** Arc distance of the point on the loop nearest (x, z). */
function nearestS(path, x, z) {
  let best = 0;
  let bestD = Infinity;
  path.pts.forEach((p, i) => {
    const d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return path.cum[best];
}

/**
 * A flat ribbon following the polyline - used for the rails and the track bed.
 * Cheap: two vertices per sample, one draw call for the whole loop.
 */
function ribbon(pts, halfWidth, y, lateral = 0) {
  const n = pts.length;
  const position = new Float32Array(n * 2 * 3);
  const normal = new Float32Array(n * 2 * 3);
  const uv = new Float32Array(n * 2 * 2);
  const index = [];

  let run = 0;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    const prev = pts[(i - 1 + n) % n];
    // averaged tangent so the seams at corners stay smooth
    const tx = q.x - prev.x;
    const tz = q.z - prev.z;
    const tl = Math.hypot(tx, tz) || 1;
    const nx = -tz / tl;
    const nz = tx / tl;
    const cxp = p.x + nx * lateral;
    const czp = p.z + nz * lateral;

    const o = i * 6;
    position[o] = cxp - nx * halfWidth;
    position[o + 1] = y;
    position[o + 2] = czp - nz * halfWidth;
    position[o + 3] = cxp + nx * halfWidth;
    position[o + 4] = y;
    position[o + 5] = czp + nz * halfWidth;

    normal[o + 1] = 1;
    normal[o + 4] = 1;

    run += Math.hypot(q.x - p.x, q.z - p.z);
    uv[i * 4] = 0;
    uv[i * 4 + 1] = run / 6;
    uv[i * 4 + 2] = 1;
    uv[i * 4 + 3] = run / 6;

    const a = i * 2;
    const b = ((i + 1) % n) * 2;
    index.push(a, b, a + 1, a + 1, b, b + 1);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(position, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(normal, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setIndex(index);
  return g;
}

// ── Station furniture ─────────────────────────────────────────────────

function stationSignTexture(name) {
  const W = 1024;
  const H = 256;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#0d1b2e";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 8;
  ctx.strokeRect(14, 14, W - 28, H - 28);
  ctx.fillStyle = "#e8f4ff";
  ctx.font = "900 92px 'Inter', Impact, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name, W / 2, H / 2 - 14);
  ctx.fillStyle = "#7dd3fc";
  ctx.font = "bold 34px 'Inter', sans-serif";
  ctx.fillText("VELORA HARBOR LOOP LINE", W / 2, H / 2 + 62);
  return finishTex(cv);
}

// ── The system ────────────────────────────────────────────────────────

export class RailwaySystem {
  constructor(engine) {
    this.engine = engine;
    this.group = new THREE.Group();
    this.group.name = "railway";

    this.path = buildLoopPath();
    this.stations = STATIONS.map((st) => ({
      ...st,
      s: nearestS(this.path, st.x, st.z),
    })).sort((a, b) => a.s - b.s);

    this._buildTrack();
    this._buildCrossings();
    this._buildCatenary();
    this.stations.forEach((st) => this._buildStation(st));
    this._buildTrain();
    this._buildPassengers();

    // Train state machine
    this.s = this.stations[0].s - 260;
    this.speed = CRUISE;
    this.targetIndex = 0;
    this.dwellLeft = 0;
    this.doorOpen = 0;
    this._t = 0;

    engine.environmentGroup.add(this.group);
  }

  // ── Track ───────────────────────────────────────────────────────────
  _buildTrack() {
    const pts = this.path.pts;
    const atmo = this.engine.atmo;

    // Track bed: a slightly darker, smoother strip inlaid into the tarmac.
    const bed = new THREE.Mesh(
      ribbon(pts, BED_HALF, 0.155),
      new THREE.MeshStandardMaterial({
        color: this.engine.theme === "dark" ? 0x1a1d23 : 0x4a4f57,
        roughness: 0.88,
        metalness: 0.05,
      })
    );
    bed.receiveShadow = true;
    this.group.add(bed);

    // Two grooved rail heads. Polished steel, so they catch the key light and
    // read as rails even from the map camera.
    const railMat = new THREE.MeshStandardMaterial({
      color: 0xb9c0c8,
      roughness: 0.24,
      metalness: 0.92,
      envMapIntensity: 1.4,
    });
    [-1, 1].forEach((side) => {
      const rail = new THREE.Mesh(ribbon(pts, 0.09, RAIL_Y, (side * RAIL_GAUGE) / 2), railMat);
      this.group.add(rail);
    });
    void atmo;
  }

  /**
   * Level crossings wherever the loop cuts a perpendicular carriageway. The
   * markings are what tell a driver (and the player) that the rails have
   * priority through the junction.
   */
  _buildCrossings() {
    const geos = [];
    const av = avenues();
    const st = streets();
    const b = worldBounds();

    const plate = (x, z, alongX) => {
      for (let k = -3; k <= 3; k++) {
        const g = new THREE.PlaneGeometry(alongX ? 1.1 : 4.6, alongX ? 4.6 : 1.1);
        g.rotateX(-Math.PI / 2);
        g.translate(alongX ? x + k * 1.5 : x, 0.175, alongX ? z : z + k * 1.5);
        geos.push(g);
      }
    };

    // The two avenue legs cross every street.
    st.forEach((s) => {
      if (Math.abs(s.z) > LOOP_Z - 1) return;
      [-LOOP_X, LOOP_X].forEach((x) => plate(x, s.z, true));
    });
    // The two street legs cross every avenue.
    av.forEach((a) => {
      if (Math.abs(a.x) > b.halfW) return;
      if (Math.abs(a.x) >= LOOP_X - 1 && Math.abs(a.x) <= LOOP_X + 1) return; // corners
      [-LOOP_Z, LOOP_Z].forEach((z) => plate(a.x, z, false));
    });

    if (!geos.length) return;
    const mesh = new THREE.Mesh(
      BufferGeometryUtils.mergeGeometries(geos, false),
      new THREE.MeshBasicMaterial({ color: 0xf2f5f7, transparent: true, opacity: 0.85 })
    );
    geos.forEach((g) => g.dispose());
    this.group.add(mesh);
  }

  /** Overhead line and its masts - the giveaway that this is electrified rail. */
  _buildCatenary() {
    const pts = this.path.pts;
    const wire = new THREE.BufferGeometry().setFromPoints(
      pts.map((p) => new THREE.Vector3(p.x, 6.3, p.z)).concat([new THREE.Vector3(pts[0].x, 6.3, pts[0].z)])
    );
    const line = new THREE.Line(
      wire,
      new THREE.LineBasicMaterial({ color: this.engine.theme === "dark" ? 0x2a3038 : 0x3c434c })
    );
    this.group.add(line);

    const mastGeo = new THREE.CylinderGeometry(0.12, 0.18, 6.6, 6);
    const armGeo = new THREE.BoxGeometry(2.4, 0.12, 0.12);
    const mat = new THREE.MeshStandardMaterial({ color: 0x4a515a, roughness: 0.5, metalness: 0.7 });
    const step = 11; // every ~44m at 4m sampling
    const count = Math.ceil(pts.length / step) * 2;
    const masts = new THREE.InstancedMesh(mastGeo, mat, count);
    const arms = new THREE.InstancedMesh(armGeo, mat, count);
    const d = new THREE.Object3D();
    let n = 0;
    for (let i = 0; i < pts.length; i += step) {
      const p = pts[i];
      const q = pts[(i + 1) % pts.length];
      const yaw = Math.atan2(q.x - p.x, q.z - p.z);
      const nx = Math.cos(yaw);
      const nz = -Math.sin(yaw);
      const side = (i / step) % 2 === 0 ? 1 : -1;
      const mx = p.x + nx * side * 9.4;
      const mz = p.z + nz * side * 9.4;

      d.position.set(mx, 3.3, mz);
      d.rotation.set(0, 0, 0);
      d.updateMatrix();
      masts.setMatrixAt(n, d.matrix);

      d.position.set(mx - nx * side * 1.2, 6.4, mz - nz * side * 1.2);
      d.rotation.set(0, yaw, 0);
      d.updateMatrix();
      arms.setMatrixAt(n, d.matrix);
      n++;

      this.engine.propColliders.push({ cx: mx, cz: mz, hw: 0.25, hd: 0.25, h: 6.6, prop: true });
    }
    masts.count = n;
    arms.count = n;
    masts.instanceMatrix.needsUpdate = true;
    arms.instanceMatrix.needsUpdate = true;
    masts.castShadow = true;
    this.group.add(masts, arms);
  }

  // ── Stations ────────────────────────────────────────────────────────
  _buildStation(st) {
    const atmo = this.engine.atmo;
    const sample = sampleAt(this.path, st.s);
    const yaw = sample.yaw;
    const nx = Math.cos(yaw); // lateral unit vector
    const nz = -Math.sin(yaw);

    const g = new THREE.Group();
    g.position.set(sample.x, 0, sample.z);
    g.rotation.y = yaw;

    const PLAT_L = 44;
    const PLAT_W = 4.2;
    const PLAT_H = 0.85;

    // Island platform sitting in the empty centre strip of the carriageway.
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(PLAT_W, PLAT_H, PLAT_L),
      new THREE.MeshStandardMaterial({ color: 0xbdb6a8, roughness: 0.92 })
    );
    slab.position.y = PLAT_H / 2;
    slab.receiveShadow = true;
    slab.castShadow = true;
    g.add(slab);

    // Yellow tactile edge strips down both platform faces.
    [-1, 1].forEach((side) => {
      const edge = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.06, PLAT_L),
        new THREE.MeshStandardMaterial({ color: 0xe8b32c, roughness: 0.8 })
      );
      edge.position.set(side * (PLAT_W / 2 - 0.3), PLAT_H + 0.03, 0);
      g.add(edge);
    });

    // Canopy on slim posts.
    const steel = new THREE.MeshStandardMaterial({ color: 0x39414b, roughness: 0.45, metalness: 0.7 });
    for (let k = -2; k <= 2; k++) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 3.4, 8), steel);
      post.position.set(0, PLAT_H + 1.7, k * 9);
      post.castShadow = true;
      g.add(post);
    }
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(PLAT_W + 1.6, 0.18, PLAT_L * 0.82),
      new THREE.MeshStandardMaterial({ color: 0x2b323b, roughness: 0.6, metalness: 0.35 })
    );
    canopy.position.y = PLAT_H + 3.5;
    canopy.castShadow = true;
    g.add(canopy);

    // Under-canopy strip lighting.
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.06, PLAT_L * 0.78),
      new THREE.MeshStandardMaterial({
        color: 0xfff4d6,
        emissive: new THREE.Color(0xffe9b0),
        emissiveIntensity: atmo.dark ? 2.0 : 0.3,
      })
    );
    strip.position.y = PLAT_H + 3.36;
    strip.userData.bloom = true;
    strip.layers.enable(1);
    g.add(strip);

    // Hanging name signs, readable from an approaching train.
    const signTex = stationSignTexture(st.name);
    const signMat = new THREE.MeshStandardMaterial({
      map: signTex,
      emissiveMap: signTex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: atmo.dark ? 0.8 : 0.25,
      side: THREE.DoubleSide,
    });
    [-1, 1].forEach((side) => {
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.6), signMat);
      sign.position.set(0, PLAT_H + 2.5, side * 12);
      sign.rotation.y = side > 0 ? 0 : Math.PI;
      g.add(sign);
    });

    // Platform benches.
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x8a6242, roughness: 0.85 });
    [-14, -4, 6, 16].forEach((oz) => {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.16, 3.0), benchMat);
      bench.position.set(0, PLAT_H + 0.55, oz);
      bench.castShadow = true;
      g.add(bench);
      const legs = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 2.6), steel);
      legs.position.set(0, PLAT_H + 0.25, oz);
      g.add(legs);
    });

    this.group.add(g);

    // The platform is solid - you walk along it, not through it.
    this.engine.propColliders.push({
      cx: sample.x,
      cz: sample.z,
      hw: PLAT_W / 2,
      hd: PLAT_L / 2,
      h: PLAT_H,
      rot: yaw,
      prop: true,
    });

    // ── Headhouse on the pavement beside the line ─────────────────────
    if (st.headhouse) {
      const hx = sample.x + nx * st.side * 17;
      const hz = sample.z + nz * st.side * 17;
      this._buildHeadhouse(st, hx, hz, yaw + (st.side > 0 ? -Math.PI / 2 : Math.PI / 2));
      // Clear any pre-built stock standing where the station now is.
      this.engine.clearLotsNear?.(hx, hz, 26);
    }

    st.platform = { x: sample.x, z: sample.z, yaw, nx, nz, len: PLAT_L, h: PLAT_H };
  }

  _buildHeadhouse(st, x, z, yaw) {
    const atmo = this.engine.atmo;
    const grand = !!st.grand;
    const W = grand ? 26 : 16;
    const D = grand ? 14 : 10;
    const H = grand ? 13 : 9;

    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = yaw;

    const stone = new THREE.MeshStandardMaterial({ color: 0xd8cfbd, roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), stone);
    body.position.y = H / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);

    // Cornice and a shallow pitched roof.
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(W + 1.2, 0.8, D + 1.2), stone);
    cornice.position.y = H + 0.4;
    g.add(cornice);
    const roof = new THREE.Mesh(
      new THREE.CylinderGeometry(D * 0.56, D * 0.56, W, 3, 1, false, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x3c4a52, roughness: 0.75, metalness: 0.2 })
    );
    roof.rotation.z = Math.PI / 2;
    roof.position.y = H + 0.8;
    g.add(roof);

    // Arched glazing across the front - lit from inside after dark.
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xffe9c4,
      emissive: new THREE.Color(0xffd79a),
      emissiveIntensity: atmo.dark ? 1.05 : 0.2,
      roughness: 0.2,
    });
    const bays = grand ? 5 : 3;
    for (let i = 0; i < bays; i++) {
      const bw = (W / bays) * 0.66;
      const arch = new THREE.Mesh(new THREE.PlaneGeometry(bw, H * 0.52), glassMat);
      arch.position.set((i / (bays - 1) - 0.5) * W * 0.76, H * 0.42, D / 2 + 0.06);
      g.add(arch);
      const top = new THREE.Mesh(new THREE.CircleGeometry(bw / 2, 14, 0, Math.PI), glassMat);
      top.position.set((i / (bays - 1) - 0.5) * W * 0.76, H * 0.68, D / 2 + 0.06);
      g.add(top);
    }

    // Name board over the entrance.
    const tex = stationSignTexture(st.name);
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(W * 0.7, W * 0.7 * 0.25),
      new THREE.MeshStandardMaterial({
        map: tex,
        emissiveMap: tex,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: atmo.dark ? 0.85 : 0.28,
      })
    );
    board.position.set(0, H * 0.86, D / 2 + 0.1);
    g.add(board);

    // A station clock, because every terminus has one.
    if (grand) {
      const clock = new THREE.Mesh(
        new THREE.CircleGeometry(1.5, 24),
        new THREE.MeshStandardMaterial({
          color: 0xf6f2e8,
          emissive: new THREE.Color(0xf6f2e8),
          emissiveIntensity: atmo.dark ? 0.7 : 0.1,
        })
      );
      clock.position.set(0, H + 2.4, D * 0.1);
      g.add(clock);
    }

    this.group.add(g);
    this.engine.propColliders.push({ cx: x, cz: z, hw: W / 2, hd: D / 2, h: H, rot: yaw, prop: true });
  }

  // ── Rolling stock ───────────────────────────────────────────────────
  _buildTrain() {
    const atmo = this.engine.atmo;
    this.cars = [];

    const shell = new THREE.MeshStandardMaterial({ color: 0xe8edf2, roughness: 0.35, metalness: 0.3 });
    const livery = new THREE.MeshStandardMaterial({ color: 0xf05a38, roughness: 0.4, metalness: 0.25 });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x16212e,
      emissive: new THREE.Color(0xbfe3ff),
      emissiveIntensity: atmo.dark ? 0.85 : 0.22,
      roughness: 0.12,
      metalness: 0.5,
    });
    const steel = new THREE.MeshStandardMaterial({ color: 0x39414b, roughness: 0.45, metalness: 0.75 });

    for (let c = 0; c < CARS; c++) {
      const car = new THREE.Group();

      const body = new THREE.Mesh(new THREE.BoxGeometry(CAR_W, CAR_H - 0.7, CAR_LEN), shell);
      body.position.y = 1.35 + (CAR_H - 0.7) / 2;
      body.castShadow = true;
      car.add(body);

      // rounded roof cap
      const roof = new THREE.Mesh(
        new THREE.CylinderGeometry(CAR_W / 2, CAR_W / 2, CAR_LEN, 10, 1, false, 0, Math.PI),
        shell
      );
      roof.rotation.z = Math.PI / 2;
      roof.rotation.y = Math.PI / 2;
      roof.position.y = 1.35 + (CAR_H - 0.7);
      car.add(roof);

      // livery band along the waist
      const band = new THREE.Mesh(new THREE.BoxGeometry(CAR_W + 0.04, 0.5, CAR_LEN), livery);
      band.position.y = 1.6;
      car.add(band);

      // continuous window strip both sides
      [-1, 1].forEach((side) => {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(CAR_LEN * 0.82, 1.15), glass);
        win.position.set(side * (CAR_W / 2 + 0.02), 2.75, 0);
        win.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        car.add(win);
      });

      // Two double doors per side. These are the ones that open at a stop.
      car.userData.doors = [];
      [-1, 1].forEach((side) => {
        [-1, 1].forEach((end) => {
          [-1, 1].forEach((leaf) => {
            const panel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.0, 0.78), livery);
            const zBase = end * CAR_LEN * 0.26;
            panel.position.set(side * (CAR_W / 2 + 0.03), 2.25, zBase + leaf * 0.4);
            car.add(panel);
            car.userData.doors.push({ mesh: panel, zBase, leaf });
          });
        });
      });

      // skirt + bogies
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(CAR_W - 0.3, 0.7, CAR_LEN - 0.6), steel);
      skirt.position.y = 1.0;
      car.add(skirt);
      [-1, 1].forEach((end) => {
        const bogie = new THREE.Mesh(new THREE.BoxGeometry(CAR_W - 0.5, 0.7, 3.2), steel);
        bogie.position.set(0, 0.62, end * CAR_LEN * 0.3);
        car.add(bogie);
      });

      // pantograph on the middle car only
      if (c === 1) {
        const pan = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.1), steel);
        pan.position.y = 6.25;
        car.add(pan);
        [-1, 1].forEach((s2) => {
          const armM = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.6, 0.08), steel);
          armM.position.set(0, 5.0, s2 * 0.5);
          armM.rotation.x = s2 * 0.22;
          car.add(armM);
        });
      }

      // head and tail lights
      if (c === 0 || c === CARS - 1) {
        const front = c === 0 ? 1 : -1;
        const lampMat = new THREE.MeshBasicMaterial({ color: c === 0 ? 0xfff6de : 0xff4a3d });
        [-1, 1].forEach((s2) => {
          const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), lampMat);
          lamp.position.set(s2 * 0.8, 1.9, front * (CAR_LEN / 2 + 0.06));
          lamp.userData.bloom = true;
          lamp.layers.enable(1);
          car.add(lamp);
        });
      }

      this.group.add(car);
      this.cars.push(car);
    }
  }

  /**
   * A small pool of figures reused for every stop: some step off the train and
   * walk down the platform, some walk from the platform into a door. Reusing a
   * pool keeps this to a dozen models no matter how many stations there are.
   */
  _buildPassengers() {
    this.passengers = [];
    const r = mulberry(6060);
    for (let i = 0; i < 12; i++) {
      const model = createNpcModel({ seed: 900 + i * 13.7, archetypeIndex: i % 6 });
      model.group.visible = false;
      this.group.add(model.group);
      this.passengers.push({
        model,
        animator: new PlayerAnimator(model.rig),
        active: false,
        mode: null,
        from: { x: 0, z: 0 },
        to: { x: 0, z: 0 },
        t: 0,
        dur: 1,
        speed: 1.1 + r() * 0.5,
      });
    }
    this.group;
  }

  /** Kick off one round of alighting and boarding at the given station. */
  _startExchange(st) {
    const { x, z, yaw, nx, nz, len, h } = st.platform;
    const alongX = Math.sin(yaw);
    const alongZ = Math.cos(yaw);
    let i = 0;

    const doorPoint = (k) => {
      const off = (k - 1.5) * (CAR_LEN * 0.52);
      return { x: x + alongX * off + nx * 1.3, z: z + alongZ * off + nz * 1.3 };
    };
    const platPoint = (k) => {
      const off = (k / 5 - 0.5) * len * 0.8;
      return { x: x + alongX * off - nx * 0.9, z: z + alongZ * off - nz * 0.9 };
    };

    // Alighting first - real platforms clear before they fill.
    for (let k = 0; k < 4 && i < this.passengers.length; k++, i++) {
      const p = this.passengers[i];
      p.active = true;
      p.mode = "exit";
      p.from = doorPoint(k);
      p.to = platPoint(k + 0.5);
      p.t = 0;
      p.dur = 1.6 + k * 0.25;
      p.delay = 0.3 + k * 0.2;
      p.y = h;
      p.model.group.visible = true;
    }
    // Boarding follows, staggered behind them.
    for (let k = 0; k < 4 && i < this.passengers.length; k++, i++) {
      const p = this.passengers[i];
      p.active = true;
      p.mode = "enter";
      p.from = platPoint(k + 2.5);
      p.to = doorPoint(k);
      p.t = 0;
      p.dur = 1.8 + k * 0.2;
      p.delay = 2.4 + k * 0.3;
      p.y = h;
      p.model.group.visible = true;
    }
  }

  _updatePassengers(dt) {
    for (const p of this.passengers) {
      if (!p.active) continue;
      if (p.delay > 0) {
        p.delay -= dt;
        // wait out of sight inside the car, or standing still on the platform
        p.model.group.visible = p.mode === "enter";
        if (p.mode === "enter") {
          p.model.group.position.set(p.from.x, p.y, p.from.z);
          p.animator.update(dt, { state: "idle", speed: 0, grounded: true, vy: 0 });
        }
        continue;
      }
      p.model.group.visible = true;
      p.t = Math.min(1, p.t + dt / p.dur);
      const e = p.t * p.t * (3 - 2 * p.t); // smoothstep, so nobody teleports
      const px = p.from.x + (p.to.x - p.from.x) * e;
      const pz = p.from.z + (p.to.z - p.from.z) * e;
      p.model.group.position.set(px, p.y, pz);
      p.model.group.rotation.y = Math.atan2(p.to.x - p.from.x, p.to.z - p.from.z);
      p.animator.update(dt, { state: "walk", speed: p.speed, grounded: true, vy: 0 });

      if (p.t >= 1) {
        p.active = false;
        // Boarders vanish into the car; alighters melt into the crowd.
        p.model.group.visible = false;
      }
    }
  }

  _clearPassengers() {
    for (const p of this.passengers) {
      p.active = false;
      p.model.group.visible = false;
    }
  }

  // ── Per-frame ───────────────────────────────────────────────────────
  update(dt) {
    if (!this.cars) return;
    this._t += dt;

    const target = this.stations[this.targetIndex];

    if (this.dwellLeft > 0) {
      // Stopped: hold position, run the doors and the platform exchange.
      this.dwellLeft -= dt;
      this.doorOpen = Math.min(1, this.doorOpen + dt * 1.6);
      this._updatePassengers(dt);
      if (this.dwellLeft <= 0) {
        this._clearPassengers();
        this.targetIndex = (this.targetIndex + 1) % this.stations.length;
        this.speed = 0.001;
      }
    } else {
      this.doorOpen = Math.max(0, this.doorOpen - dt * 1.6);

      // Distance still to run to the next platform, forward around the loop.
      let remain = target.s - this.s;
      while (remain < 0) remain += this.path.total;

      // Brake late, the way a train actually does: hold cruise until the
      // stopping distance for the current speed is all that is left.
      const stopDist = (this.speed * this.speed) / (2 * BRAKE);
      if (remain <= stopDist + 0.5) {
        this.speed = Math.max(0, this.speed - BRAKE * dt);
      } else {
        this.speed = Math.min(CRUISE, this.speed + ACCEL * dt);
      }

      this.s += this.speed * dt;

      if (remain <= 0.8 || (this.speed <= 0.05 && remain < 30)) {
        this.s = target.s;
        this.speed = 0;
        this.dwellLeft = DWELL;
        this._startExchange(target);
      }
    }

    // Place each car by its own arc position, so the set articulates round the
    // corners instead of rotating as one rigid block.
    for (let c = 0; c < this.cars.length; c++) {
      const offset = (c - (CARS - 1) / 2) * (CAR_LEN + CAR_GAP);
      const p = sampleAt(this.path, this.s - offset);
      const car = this.cars[c];
      car.position.set(p.x, 0, p.z);
      car.rotation.y = p.yaw;

      // slide the door leaves apart
      for (const d of car.userData.doors) {
        d.mesh.position.z = d.zBase + d.leaf * (0.4 + this.doorOpen * 0.75);
      }
    }
  }

  /**
   * Car bodies as dynamic solids. The train is scenery - there is no board
   * prompt anywhere - and this is what physically stops the player from
   * walking into (or through) it.
   */
  getSolids() {
    const out = [];
    if (!this.cars) return out;
    for (let c = 0; c < this.cars.length; c++) {
      const car = this.cars[c];
      out.push({
        cx: car.position.x,
        cz: car.position.z,
        hw: CAR_W / 2 + 0.2,
        hd: CAR_LEN / 2 + 0.2,
        h: CAR_H + 1.4,
        rot: car.rotation.y,
        vehicle: true,
        vx: 0,
        vz: 0,
      });
    }
    return out;
  }

  dispose() {
    this.passengers?.forEach((p) => p.model?.dispose?.());
    this.passengers = [];
    this.cars = [];
    this.group.clear();
  }
}

export { LOOP_X, LOOP_Z };
