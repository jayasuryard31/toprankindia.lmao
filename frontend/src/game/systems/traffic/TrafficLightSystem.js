import * as THREE from "three";
import { GRID, intersections, plazaRect, parkRect } from "../../../components/map/three/cityGrid.js";
import { createTrafficPoliceModel } from "../../characters/npc/TrafficPoliceModel.js";
import { PlayerAnimator } from "../../characters/player/PlayerAnimator.js";

/**
 * Full-Featured Working Traffic Light System.
 *
 * Implements:
 * 1. 3D Traffic Light Posts with working Red, Yellow, Green LED signals.
 * 2. Painted Road Zigzag lines & Stop Lines at traffic signal crossings.
 * 3. 4-Phase Synchronized Traffic Signal cycle (Red -> Yellow -> Green -> Yellow).
 * 4. Intelligent Vehicle Speed Control (Stop on Red, Ready on Yellow, Go on Green + Anti-Collision).
 * 5. Traffic Police Officer NPC stationed at the traffic light with a 5-second stick-raising emote every 10 seconds.
 */
export class TrafficLightSystem {
  constructor(engine) {
    this.engine = engine;
    this.group = new THREE.Group();
    this.group.name = "traffic-light-system";

    this.lights = [];
    this.junctions = [];
    this.policeOfficers = [];
    this.cycleTime = 0;
    this.totalCycleDuration = 24.0; // 9s green + 3s yellow + 9s red + 3s yellow

    this._setupJunctions();
    this._buildRoadMarkings();
    this._buildTrafficLightPosts();
    this._spawnTrafficPolice();

    this.engine.environmentGroup.add(this.group);
  }

  _setupJunctions() {
    const pk = parkRect();
    const pz = plazaRect();
    const inRes = (x, z) =>
      (x > pk.x0 && x < pk.x1 && z > pk.z0 && z < pk.z1) ||
      (x > pz.x0 && x < pz.x1 && z > pz.z0 && z < pz.z1);

    const halfA = GRID.ROAD_W_AVENUE / 2; // 11
    const halfS = GRID.ROAD_W_STREET / 2; // 7

    // Find key major intersections across the grid
    intersections().forEach(([x, z, major], idx) => {
      if (inRes(x, z)) return;
      // Include all major intersections and every 2nd intersection
      if (!major && idx % 2 !== 0) return;

      const junction = {
        id: `junction_${idx}_${x | 0}_${z | 0}`,
        x,
        z,
        // Stop line coordinates
        stopLines: {
          // Avenue Northbound (moving -Z -> stops at south edge of intersection)
          zNorthbound: z + halfS + 3.2,
          // Avenue Southbound (moving +Z -> stops at north edge of intersection)
          zSouthbound: z - halfS - 3.2,
          // Street Westbound (moving -X -> stops at east edge of intersection)
          xWestbound: x + halfA + 3.2,
          // Street Eastbound (moving +X -> stops at west edge of intersection)
          xEastbound: x - halfA - 3.2,
        },
        avenueState: "GREEN", // "GREEN" | "YELLOW" | "RED"
        streetState: "RED",
        posts: [],
      };

      this.junctions.push(junction);
    });
  }

  _buildRoadMarkings() {
    const zigzagMat = new THREE.MeshBasicMaterial({
      color: this.engine.theme === "dark" ? 0xdddddd : 0xf8f8f8,
      side: THREE.DoubleSide,
    });
    const stopLineMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
    });

    const markings = [];
    const stopLines = [];

    const halfA = GRID.ROAD_W_AVENUE / 2;
    const halfS = GRID.ROAD_W_STREET / 2;

    this.junctions.forEach((j) => {
      // 1. Stop Lines on Avenue approaches
      [-1, 1].forEach((sN) => {
        const stopZ = j.z + sN * (halfS + 3.2);
        const slA = new THREE.PlaneGeometry(GRID.ROAD_W_AVENUE - 2.5, 0.75);
        slA.rotateX(-Math.PI / 2);
        slA.translate(j.x, 0.16, stopZ);
        stopLines.push(slA);

        // Zigzag Lines along Avenue approach (both sides of the lane)
        const laneW = GRID.ROAD_W_AVENUE / 2 - 1.0;
        [-laneW, 0, laneW].forEach((laneXOffset) => {
          const numZigs = 7;
          const segLen = 2.4;
          const zigAmp = 0.45;
          for (let k = 0; k < numZigs; k++) {
            const zStart = stopZ + sN * (k * segLen + 0.4);
            const zEnd = stopZ + sN * ((k + 1) * segLen + 0.4);
            const zigX0 = j.x + laneXOffset + ((k % 2 === 0) ? -zigAmp : zigAmp);
            const zigX1 = j.x + laneXOffset + ((k % 2 === 0) ? zigAmp : -zigAmp);

            const dx = zigX1 - zigX0;
            const dz = zEnd - zStart;
            const len = Math.hypot(dx, dz);
            const ang = Math.atan2(dx, dz);

            const zg = new THREE.PlaneGeometry(0.24, len);
            zg.rotateX(-Math.PI / 2);
            zg.rotateY(ang);
            zg.translate((zigX0 + zigX1) / 2, 0.15, (zStart + zEnd) / 2);
            markings.push(zg);
          }
        });
      });

      // 2. Stop Lines on Street approaches
      [-1, 1].forEach((sN) => {
        const stopX = j.x + sN * (halfA + 3.2);
        const slS = new THREE.PlaneGeometry(0.75, GRID.ROAD_W_STREET - 2.5);
        slS.rotateX(-Math.PI / 2);
        slS.translate(stopX, 0.16, j.z);
        stopLines.push(slS);

        // Zigzag Lines along Street approach
        const laneW = GRID.ROAD_W_STREET / 2 - 0.8;
        [-laneW, 0, laneW].forEach((laneZOffset) => {
          const numZigs = 6;
          const segLen = 2.4;
          const zigAmp = 0.45;
          for (let k = 0; k < numZigs; k++) {
            const xStart = stopX + sN * (k * segLen + 0.4);
            const xEnd = stopX + sN * ((k + 1) * segLen + 0.4);
            const zigZ0 = j.z + laneZOffset + ((k % 2 === 0) ? -zigAmp : zigAmp);
            const zigZ1 = j.z + laneZOffset + ((k % 2 === 0) ? zigAmp : -zigAmp);

            const dx = xEnd - xStart;
            const dz = zigZ1 - zigZ0;
            const len = Math.hypot(dx, dz);
            const ang = Math.atan2(dz, dx);

            const zg = new THREE.PlaneGeometry(len, 0.24);
            zg.rotateX(-Math.PI / 2);
            zg.rotateY(-ang);
            zg.translate((xStart + xEnd) / 2, 0.15, (zigZ0 + zigZ1) / 2);
            markings.push(zg);
          }
        });
      });
    });

    if (stopLines.length) {
      this.group.add(new THREE.Mesh(this._mergeGeometries(stopLines), stopLineMat));
    }
    if (markings.length) {
      this.group.add(new THREE.Mesh(this._mergeGeometries(markings), zigzagMat));
    }
  }

  _mergeGeometries(geos) {
    let totalVerts = 0;
    let totalIndices = 0;
    geos.forEach((g) => {
      totalVerts += g.attributes.position.count;
      if (g.index) totalIndices += g.index.count;
    });

    const posArray = new Float32Array(totalVerts * 3);
    const indexArray = new (totalVerts > 65535 ? Uint32Array : Uint16Array)(totalIndices);

    let vOffset = 0;
    let iOffset = 0;
    let indexBase = 0;

    geos.forEach((g) => {
      const p = g.attributes.position.array;
      posArray.set(p, vOffset * 3);
      if (g.index) {
        const ind = g.index.array;
        for (let i = 0; i < ind.length; i++) {
          indexArray[iOffset + i] = ind[i] + indexBase;
        }
        iOffset += ind.length;
      }
      indexBase += g.attributes.position.count;
      vOffset += g.attributes.position.count;
    });

    const merged = new THREE.BufferGeometry();
    merged.setAttribute("position", new THREE.BufferAttribute(posArray, 3));
    if (totalIndices > 0) {
      merged.setIndex(new THREE.BufferAttribute(indexArray, 1));
    }
    return merged;
  }

  _buildTrafficLightPosts() {
    const halfA = GRID.ROAD_W_AVENUE / 2 + 1.2;
    const halfS = GRID.ROAD_W_STREET / 2 + 1.2;

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x333842,
      metalness: 0.85,
      roughness: 0.35,
    });
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0x181a1f,
      metalness: 0.5,
      roughness: 0.5,
    });
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x111215,
      roughness: 0.6,
    });

    // ── Why this is instanced ──────────────────────────────────────────
    // Every junction used to be 68 individual meshes (4 posts x 17 parts) and
    // 24 freshly-minted lens materials. Across the grid that was ~7,300 meshes
    // and ~4,000 draw calls a frame - measured as the single largest cost in
    // the whole renderer, more than everything else combined.
    //
    // Every post is geometrically identical; only its transform differs. And
    // crucially the SIGNAL STATE IS GLOBAL - `_updateLightVisuals` drives every
    // junction from one `avenueState`/`streetState` pair, so the whole city
    // only ever shows two distinct lens states at once. That means the lenses
    // need exactly six shared materials (axis x colour), not one set per head.
    //
    // Same geometry, same materials, same positions, same emissive behaviour -
    // 11 draw calls instead of ~4,000.
    const lens = (on, off) => ({ on, off });
    // colour / emissive pairs lifted verbatim from the previous per-head materials
    this.LENS_SPEC = {
      red: lens({ e: 0xff1111, i: 2.4, c: 0xff3333 }, { e: 0x220000, i: 0.15, c: 0x330000 }),
      yellow: lens({ e: 0xffaa00, i: 2.4, c: 0xffcc00 }, { e: 0x221a00, i: 0.15, c: 0x332600 }),
      green: lens({ e: 0x00ff66, i: 2.4, c: 0x33ff88 }, { e: 0x002208, i: 0.15, c: 0x003311 }),
    };

    // Six shared lens materials: one per (axis, colour). These are what
    // `_updateLightVisuals` now writes to - six assignments a frame, not 2,568.
    this.lensMats = {};
    for (const axis of ["avenue", "street"]) {
      this.lensMats[axis] = {};
      for (const col of ["red", "yellow", "green"]) {
        const off = this.LENS_SPEC[col].off;
        this.lensMats[axis][col] = new THREE.MeshStandardMaterial({
          color: off.c,
          emissive: off.e,
          emissiveIntensity: off.i,
          roughness: 0.3,
        });
      }
    }

    const corners = this.junctions.length * 4;
    const mk = (geo, mat, count, bloom = false) => {
      const m = new THREE.InstancedMesh(geo, mat, count);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.count = 0; // filled in below
      if (bloom) {
        m.userData.bloom = true;
        m.layers.enable(1);
      }
      m.frustumCulled = false; // posts blanket the whole grid; per-instance culling is not a thing
      this.group.add(m);
      return m;
    };

    const baseIM = mk(new THREE.CylinderGeometry(0.38, 0.45, 0.5, 12), steelMat, corners);
    const poleIM = mk(new THREE.CylinderGeometry(0.14, 0.18, 5.4, 12), steelMat, corners);
    const armIM = mk(new THREE.CylinderGeometry(0.09, 0.11, 4.2, 8), steelMat, corners);
    const boxIM = mk(new THREE.BoxGeometry(0.55, 1.45, 0.42), boxMat, corners * 2);
    const hoodIM = mk(
      new THREE.CylinderGeometry(0.2, 0.2, 0.22, 12, 1, true, 0, Math.PI),
      visorMat,
      corners * 6
    );
    const lensGeo = new THREE.SphereGeometry(0.16, 12, 10);
    const lensIM = {
      avenue: {}, street: {},
    };
    for (const axis of ["avenue", "street"]) {
      for (const col of ["red", "yellow", "green"]) {
        lensIM[axis][col] = mk(lensGeo, this.lensMats[axis][col], corners, true);
      }
    }

    // Local part offsets, identical to the old per-post group layout.
    const LENS_Y = { red: 0.42, yellow: 0.0, green: -0.42 };
    const HEADS = [
      { x: 0, y: 3.8 },
      { x: 3.4, y: 5.0 },
    ];

    const post = new THREE.Object3D(); // the old postGroup transform
    const part = new THREE.Object3D(); // a part, in post-local space
    const world = new THREE.Matrix4();
    const push = (im, m) => { im.setMatrixAt(im.count++, m); };
    const place = (im, px, py, pz, rot, scale) => {
      part.position.set(px, py, pz);
      part.rotation.set(rot?.x || 0, rot?.y || 0, rot?.z || 0);
      part.scale.set(scale?.x ?? 1, scale?.y ?? 1, scale?.z ?? 1);
      part.updateMatrix();
      world.multiplyMatrices(post.matrix, part.matrix);
      push(im, world);
    };

    this.junctions.forEach((j) => {
      const cornerDefs = [
        { x: j.x + halfA, z: j.z + halfS, rotY: Math.PI },
        { x: j.x - halfA, z: j.z - halfS, rotY: 0 },
        { x: j.x + halfA, z: j.z - halfS, rotY: -Math.PI / 2 },
        { x: j.x - halfA, z: j.z + halfS, rotY: Math.PI / 2 },
      ];

      cornerDefs.forEach((c, cIdx) => {
        post.position.set(c.x, 0, c.z);
        post.rotation.set(0, c.rotY, 0);
        post.scale.set(1, 1, 1);
        post.updateMatrix();

        place(baseIM, 0, 0.25, 0);
        place(poleIM, 0, 2.7, 0);
        place(armIM, 2.1, 5.2, 0, { z: -Math.PI / 2 });

        const axis = cIdx % 2 === 0 ? "avenue" : "street";
        HEADS.forEach((h) => {
          place(boxIM, h.x, h.y, 0);
          for (const col of ["red", "yellow", "green"]) {
            const ly = LENS_Y[col];
            // lens: flattened sphere, sitting proud of the housing
            place(lensIM[axis][col], h.x, h.y + ly, 0.2, null, { x: 1, y: 1, z: 0.45 });
            // sun visor hood above each lens
            place(hoodIM, h.x, h.y + ly + 0.06, 0.24, { x: Math.PI / 2 });
          }
        });

        // `lights` is kept so the rest of the system (and any future per-junction
        // logic) still has a handle on each post, but it no longer owns meshes.
        this.lights.push({ junction: j, axis });
      });
    });

    [baseIM, poleIM, armIM, boxIM, hoodIM].forEach((m) => (m.instanceMatrix.needsUpdate = true));
    for (const axis of ["avenue", "street"]) {
      for (const col of ["red", "yellow", "green"]) {
        lensIM[axis][col].instanceMatrix.needsUpdate = true;
      }
    }
  }

  _spawnTrafficPolice() {
    // Select key junctions for Traffic Police officers (e.g. Central Gate, Downtown Avenue)
    const centralJunctions = this.junctions.slice(0, 4);

    centralJunctions.forEach((j, i) => {
      const halfA = GRID.ROAD_W_AVENUE / 2 + 2.0;
      const halfS = GRID.ROAD_W_STREET / 2 + 2.0;

      // Stand on corner traffic island / sidewalk next to the traffic light
      const posX = i % 2 === 0 ? j.x + halfA : j.x - halfA;
      const posZ = i < 2 ? j.z + halfS : j.z - halfS;
      const lookAtYaw = Math.atan2(j.x - posX, j.z - posZ);

      const model = createTrafficPoliceModel({
        skinColor: [0xdfab82, 0xc68c5d, 0xf8d7bd, 0xa7683e][i % 4],
        isKhaki: i % 2 === 1,
      });

      const animator = new PlayerAnimator(model.rig);
      model.group.position.set(posX, 0.10, posZ);
      model.group.rotation.y = lookAtYaw;

      this.group.add(model.group);

      this.policeOfficers.push({
        id: `traffic_cop_${i}`,
        model,
        animator,
        posX,
        posZ,
        yaw: lookAtYaw,
        timer: i * 3.5, // staggered initial offset
        emoteDuration: 5.0, // 5 seconds stick-raising emote
        interval: 15.0, // 10s alert stand + 5s stick-raise emote
      });
    });
  }

  update(dt) {
    dt = Math.min(dt, 0.05);
    this.cycleTime = (this.cycleTime + dt) % this.totalCycleDuration;

    // ── 1. Traffic Signal Cycle State Machine ────────────────────────
    // Phase 0 [0 - 9s]:   Avenue GREEN (Cars move), Street RED (Cars stopped)
    // Phase 1 [9 - 12s]:  Avenue YELLOW (Cars slow/ready), Street YELLOW (Cars get ready)
    // Phase 2 [12 - 21s]: Avenue RED (Cars stopped), Street GREEN (Cars move)
    // Phase 3 [21 - 24s]: Avenue YELLOW (Cars get ready), Street YELLOW (Cars slow/ready)

    const t = this.cycleTime;
    let avenueState = "RED";
    let streetState = "RED";

    if (t < 9.0) {
      avenueState = "GREEN";
      streetState = "RED";
    } else if (t < 12.0) {
      avenueState = "YELLOW";
      streetState = "YELLOW";
    } else if (t < 21.0) {
      avenueState = "RED";
      streetState = "GREEN";
    } else {
      avenueState = "YELLOW";
      streetState = "YELLOW";
    }

    this.junctions.forEach((j) => {
      j.avenueState = avenueState;
      j.streetState = streetState;
    });

    // Update the six shared lens materials. Signal state is global, so this
    // is six writes a frame - it used to walk every head and touch ~2,568
    // material objects.
    const applyLens = (axis, state) => {
      for (const col of ["red", "yellow", "green"]) {
        const lit = state === col.toUpperCase();
        const spec = lit ? this.LENS_SPEC[col].on : this.LENS_SPEC[col].off;
        const mat = this.lensMats[axis][col];
        mat.emissive.setHex(spec.e);
        mat.emissiveIntensity = spec.i;
        mat.color.setHex(spec.c);
      }
    };
    applyLens("avenue", avenueState);
    applyLens("street", streetState);

    // ── 2. Traffic Police Officers Animation ─────────────────────────
    // Every 10s standing, raises stick for 5s (total cycle 15s)
    this.policeOfficers.forEach((cop) => {
      cop.timer = (cop.timer + dt) % cop.interval;
      const isEmoting = cop.timer >= 10.0;
      const emoteTime = isEmoting ? (cop.timer - 10.0) : 0;

      cop.animator.update(dt, {
        state: "idle",
        speed: 0,
        grounded: true,
        vy: 0,
        emote: isEmoting ? "traffic_stick_raise" : null,
        emoteTime,
      });
    });
  }

  /**
   * Evaluates vehicle target speed based on traffic lights and lead vehicles.
   *
   * @param {Object} car - Current traffic car { x, z, axis, dir, speed, ... }
   * @param {Array} allCars - List of all traffic cars for anti-collision check
   * @param {number} carIdx - Index of current car
   * @returns {number} Target speed factor (0.0 to 1.0)
   */
  getVehicleSpeedFactor(car, allCars = [], carIdx = -1) {
    const isZ = car.axis === "z";
    const dir = car.dir; // +1 or -1
    const carPos = isZ ? car.z : car.x;
    const lanePos = isZ ? car.x : car.z;

    let minSpeedFactor = 1.0;

    // 1. Check Upcoming Traffic Light Junctions
    for (let i = 0; i < this.junctions.length; i++) {
      const j = this.junctions[i];
      const jLane = isZ ? j.x : j.z;

      // Check if junction is on the same road axis
      if (Math.abs(lanePos - jLane) > (isZ ? GRID.ROAD_W_AVENUE : GRID.ROAD_W_STREET) / 2 + 2) {
        continue;
      }

      // Stop line position for this direction
      let stopPos = 0;
      if (isZ) {
        stopPos = dir > 0 ? j.stopLines.zSouthbound : j.stopLines.zNorthbound;
      } else {
        stopPos = dir > 0 ? j.stopLines.xEastbound : j.stopLines.xWestbound;
      }

      // Distance from car to stop line along movement direction
      const distToStop = (stopPos - carPos) * dir;

      // Only consider stop lines that are ahead within 32m and not already crossed
      if (distToStop > -1.5 && distToStop < 32.0) {
        const signalState = isZ ? j.avenueState : j.streetState;

        if (signalState === "RED") {
          if (distToStop <= 0.8) {
            // Already right at stop line
            return 0.0;
          }
          // Smooth deceleration to stop before the line
          const brakeFactor = Math.max(0.0, Math.min(1.0, (distToStop - 0.8) / 20.0));
          minSpeedFactor = Math.min(minSpeedFactor, brakeFactor * brakeFactor);
        } else if (signalState === "YELLOW") {
          // If close, stop / get ready; if far, maintain cautious speed
          if (distToStop < 16.0) {
            const brakeFactor = Math.max(0.0, Math.min(1.0, (distToStop - 0.8) / 14.0));
            minSpeedFactor = Math.min(minSpeedFactor, brakeFactor);
          } else {
            minSpeedFactor = Math.min(minSpeedFactor, 0.7);
          }
        } else if (signalState === "GREEN") {
          // Move smoothly forward
          minSpeedFactor = Math.min(minSpeedFactor, 1.0);
        }
      }
    }

    // 2. Anti-Collision / Car Following: Maintain gap with vehicle ahead in same lane
    if (allCars && allCars.length) {
      for (let k = 0; k < allCars.length; k++) {
        if (k === carIdx) continue;
        const other = allCars[k];
        if (other.axis !== car.axis || other.dir !== car.dir) continue;

        const otherLane = isZ ? other.x : other.z;
        if (Math.abs(lanePos - otherLane) > 2.5) continue; // Different lane

        const otherPos = isZ ? other.z : other.x;
        const distToLead = (otherPos - carPos) * dir;

        // If other car is ahead within 14m
        if (distToLead > 0 && distToLead < 14.0) {
          const safeGap = 4.5;
          if (distToLead <= safeGap) {
            return 0.0; // Stop behind lead car
          }
          const followFactor = Math.max(0.0, Math.min(1.0, (distToLead - safeGap) / 8.0));
          minSpeedFactor = Math.min(minSpeedFactor, followFactor);
        }
      }
    }

    return minSpeedFactor;
  }

  dispose() {
    this.policeOfficers.forEach((cop) => {
      if (cop.model) cop.model.dispose();
    });
    this.group.clear();
    this.lights = [];
    this.junctions = [];
    this.policeOfficers = [];
  }
}
