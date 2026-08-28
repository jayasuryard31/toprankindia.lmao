import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { Water } from "three/addons/objects/Water.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import {
  GRID,
  BLOCK_COLS,
  BLOCK_ROWS,
  getBlock,
  getLots,
  avenues,
  streets,
  intersections,
  roadSegments,
  lotAt,
  ocean,
  greenbelt,
  worldBounds,
  parkRect,
  plazaRect,
  timesSquareRect,
  lotForRank,
  crownLot,
  districtPrimeLot,
  forEachLot,
  forEachBlock,
  TOTAL_LOTS,
  DISTRICTS,
  districtForBlock,
  districtRect,
  districtCenter,
  hash2,
} from "./cityGrid";
import { makeTower, disposeGroup, setAnisotropy, setTowerTheme, setTowerWindowGlow } from "./towerFactory";
import { currentTimeOfDay, presetFor } from "./timeOfDay";
import { createPostFX, shouldEnablePostFX } from "./postfx";
import {
  MAT,
  makeTreeField,
  createTrafficFleet,
  createFountain,
  carColors,
  makeVessel,
  makeStreetlight,
  grassTexture,
  fieldTexture,
  sandTexture,
  cloudTexture,
  setPropAnisotropy,
  disposeDeep,
  finishTex,
  normalFromCanvas,
  brickPathTexture,
  grassNormal,
  setLampIntensity,
} from "./cityProps";
import {
  makeBrandOwnershipBoard,
  makeBrandRoofMesh,
  makeCityBillboard,
  makeFacadeBillboard,
  CITY_BILLBOARD_LOCATIONS,
  loadClaimedBillboards,
  saveClaimedBillboards,
  setCrispAnisotropy,
  setSignageMode,
} from "./brandShowcase";
import { buildTimesSquare as buildTimesSquareScene } from "./timesSquare";
import { RailwaySystem } from "./railway";
import { NpcSystem } from "../../../game/systems/npc/NpcSystem.js";
import { TrafficLightSystem } from "../../../game/systems/traffic/TrafficLightSystem.js";

/**
 * TOPRANKINDIA - planned 3D metropolis engine.
 *
 * Spatial truth lives in cityGrid.js: an avenue/street grid carved into blocks,
 * each block subdivided into lots with a sidewalk setback and grouped into named
 * DISTRICTS with a build archetype (downtown / midtown / residential / waterfront).
 * Product rank N lands on lot N (spiral out from the central plaza) so a tower is
 * ALWAYS inside a block, never on a road, and never overlapping a neighbour.
 */

const DISTRICT_META = DISTRICTS.map((d) => {
  const c = districtCenter(d);
  return { ...d, center: [c.cx, c.cz] };
});

// Back-compat export (old code imported DISTRICT_POLYGONS).
export const DISTRICT_POLYGONS = DISTRICT_META;

const V0 = new THREE.Vector3();

export class ThreeCityEngine {
  constructor(canvasContainer, options = {}) {
    this.container = canvasContainer;
    this.options = options;

    // The city and the site chrome are ALWAYS in the same mode. `uiTheme` is
    // the master switch (itself clock-driven - see ThemeContext), and the wall
    // clock only chooses which *light* look to use: midday sun or golden hour.
    this.uiTheme = options.theme || "light";
    this.tod = this._resolveTod();
    this.atmo = presetFor(this.tod);
    this.theme = this.atmo.dark ? "dark" : "light";

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.animFrameId = null;
    this._lastTime = typeof performance !== "undefined" ? performance.now() : Date.now();
    this._fps = 60;
    if (typeof window !== "undefined") window.__triEngine = this;

    this.target = new THREE.Vector3(0, 0, 0);
    this.spherical = new THREE.Spherical(2050, Math.PI / 3.5, Math.PI * 0.18);
    this.isDragging = false;
    this.isRotating = false;
    this.previousMousePosition = { x: 0, y: 0 };

    this.trafficCars = [];
    this.movingBoats = [];
    this.waters = [];
    this.flags = [];

    this.brandTowersGroup = new THREE.Group();
    this.brandPlotsGroup = this.brandTowersGroup; // alias for older callers
    this.brandBillboardsGroup = new THREE.Group();
    this.environmentGroup = new THREE.Group();
    this.fillerGroup = new THREE.Group();

    this.products = [];
    this.districtTotals = {};
    this.onSelectProduct = options.onSelectProduct || (() => {});
    this.onSelectPlot = options.onSelectPlot || (() => {});
    this.onSelectBillboard = options.onSelectBillboard || (() => {});
    this.onProjectUpdate = options.onProjectUpdate || (() => {});

    this.clouds = [];
    this.skyBodies = [];
    this.gameMode = false;
    this.gameHook = null;
    this.viewMode = "3D";
    this._heatOn = false;
    this._solids = null;
    this.propColliders = [];
    this.parkBenches = [];
    this._groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.claimedPlots = loadClaimedPlots();
    this.claimedBillboards = loadClaimedBillboards();

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.init();
  }

  init() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.scene = new THREE.Scene();

    this.renderer = new THREE.WebGLRenderer({ antialias: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    // this.renderer.shadowMap.enabled = true;
    // this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.atmo.exposure;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    setAnisotropy(maxAniso);
    setPropAnisotropy(maxAniso);
    setCrispAnisotropy(maxAniso);

    this.camera = new THREE.PerspectiveCamera(30, width / height, 0.5, 900000);
    this.updateCameraFromSpherical();

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const b = worldBounds();
    this._fog = new THREE.Fog(this.atmo.fogColor, b.cityD * 2.2, b.cityD * 11);
    this.scene.fog = this._fog;

    this.buildAll();

    this.scene.add(this.environmentGroup);
    this.scene.add(this.fillerGroup);
    this.scene.add(this.brandTowersGroup);
    this.scene.add(this.brandBillboardsGroup);

    this._setupHoverHighlightSystem();

    this.usePostFX = shouldEnablePostFX();
    if (this.usePostFX) {
      try {
        this.postfx = createPostFX(this.renderer, this.scene, this.camera);
      } catch (e) {
        console.warn("postfx disabled:", e);
        this.usePostFX = false;
      }
    }

    this.setupEventListeners();
    this.animate();
  }

  /**
   * Build the world in two parts.
   *
   * CORE is synchronous and is everything you need to recognise the city:
   * sky, light, ground, the road grid and the skyline. It is what the first
   * frame shows.
   *
   * Everything else - the park, the square, the coast, street furniture,
   * traffic and ~350 pedestrians - is queued and built one chunk per idle
   * slice. Building it all up front is what made "Enter City" feel like the
   * tab had hung: several hundred procedural models and a dozen canvas
   * textures on one blocking call. Queued, the map is interactive in a single
   * frame and fills in over the next second while the user is still reading
   * the page.
   */
  buildAll() {
    setTowerTheme(this.theme === "dark");
    // Shared material banks (towers, lamps, signage) are module-level, so the
    // clock is applied once here rather than per-object.
    setTowerWindowGlow(this.atmo.windowEmissive);
    setLampIntensity(this.atmo.lampIntensity);
    setSignageMode(this.atmo);

    // ── core ────────────────────────────────────────────────────────────
    this.setupSky();
    this.setupLighting();
    this.buildTerrain();
    this.buildRoads();
    this.buildDistrictPlots();
    this.buildFillerCity();

    // ── deferred, heaviest last ─────────────────────────────────────────
    this._cancelBuildQueue();
    this._buildQueue = [
      () => { this.buildCentralPlaza(); this.buildPark(); },
      () => this.buildTimesSquare(),
      () => { this.buildCoastline(); this.buildGreenbelt(); },
      () => this.buildTreesAndProps(),
      () => {
        this.buildTraffic();
        this.trafficLightSystem = new TrafficLightSystem(this);
        // every Water surface exists by now (coastline + greenbelt + park pond)
        this._throttleWaterReflections();
      },
      () => { this.railway = new RailwaySystem(this); },
      () => { this.npcSystem = new NpcSystem(this); },
    ];
    this._pumpBuildQueue();
  }

  /** Run the next deferred chunk, then schedule the one after it. */
  _pumpBuildQueue() {
    if (!this._buildQueue || !this._buildQueue.length) {
      this._buildQueue = null;
      this._buildHandle = null;
      return;
    }
    const step = this._buildQueue.shift();
    const run = () => {
      this._buildHandle = null;
      if (this._destroyed) return;
      // One failing chunk must never take the rest of the city with it. An
      // uncaught throw here used to abort the whole queue silently, so a small
      // mistake deep in one builder left the map missing Times Square, the
      // traffic, the railway AND the crowds with nothing in the console to
      // say which one broke.
      try {
        step();
      } catch (err) {
        console.error("[ThreeCityEngine] build step failed:", err);
      }
      this.invalidateSolids();
      this.postfx?.invalidate();
      this.onProjectUpdate();
      this._pumpBuildQueue();
    };
    this._buildHandle =
      typeof requestIdleCallback === "function"
        ? { idle: requestIdleCallback(run, { timeout: 250 }) }
        : { raf: requestAnimationFrame(run) };
  }

  _cancelBuildQueue() {
    const h = this._buildHandle;
    if (h?.idle != null && typeof cancelIdleCallback === "function") cancelIdleCallback(h.idle);
    if (h?.raf != null) cancelAnimationFrame(h.raf);
    this._buildHandle = null;
    this._buildQueue = null;
  }

  /**
   * Finish the deferred build right now. Called before anything that needs a
   * complete world - walking into the city needs its colliders, its traffic
   * and its crowds present, not arriving a beat later.
   */
  ensureBuilt() {
    if (!this._buildQueue) return;
    const queue = this._buildQueue;
    this._cancelBuildQueue();
    queue.forEach((step) => step());
    this.invalidateSolids();
    this.onProjectUpdate();
  }

  // ── Sky & sun ────────────────────────────────────────────────────────
  setupSky() {
    const a = this.atmo;
    const isDark = this.theme === "dark";
    this.sky = new Sky();
    this.sky.scale.setScalar(450000);
    const u = this.sky.material.uniforms;
    u.turbidity.value = a.turbidity;
    u.rayleigh.value = a.rayleigh;
    u.mieCoefficient.value = a.mieCoefficient;
    u.mieDirectionalG.value = a.mieDirectionalG;

    // At night the Sky shader's "sun" is parked just below the horizon so the
    // dome goes deep blue; the moon (and the key light) live on their own
    // vector. At dusk it hangs low and wide to smear the whole sky orange.
    const skySun = new THREE.Vector3().setFromSphericalCoords(
      1,
      THREE.MathUtils.degToRad(90 - a.skyElevation),
      THREE.MathUtils.degToRad(a.skyAzimuth)
    );
    u.sunPosition.value.copy(skySun);

    this.sunVec = new THREE.Vector3().setFromSphericalCoords(
      1,
      THREE.MathUtils.degToRad(90 - a.sunElevation),
      THREE.MathUtils.degToRad(a.sunAzimuth)
    );

    this.scene.add(this.sky);
    this.scene.background = null;

    this.buildCelestials(isDark);
    this.buildClouds();
  }

  buildCelestials(isDark) {
    const dist = 9000;
    const pos = this.sunVec.clone().multiplyScalar(dist);

    if (isDark) {
      const moon = new THREE.Mesh(
        new THREE.SphereGeometry(150, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xf4f5fa, fog: false })
      );
      moon.position.copy(pos);
      moon.userData.bloom = true;
      this.scene.add(moon);
      this.skyBodies.push(moon);
      const shade = new THREE.Mesh(
        new THREE.SphereGeometry(151, 24, 24),
        new THREE.MeshBasicMaterial({ color: 0xbfc4d6, transparent: true, opacity: 0.3, fog: false })
      );
      shade.position.copy(pos).add(new THREE.Vector3(34, -22, 12));
      this.scene.add(shade);
      this.skyBodies.push(shade);
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(230, 24, 24),
        new THREE.MeshBasicMaterial({ color: 0xcdd6ff, transparent: true, opacity: 0.1, depthWrite: false, fog: false })
      );
      halo.position.copy(pos);
      this.scene.add(halo);
      this.skyBodies.push(halo);

      // starfield on a dome
      const N = 1600;
      const arr = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const v = new THREE.Vector3().randomDirection().multiplyScalar(12000);
        if (v.y < 800) v.y = Math.abs(v.y) + 800;
        arr.set([v.x, v.y, v.z], i * 3);
      }
      const stars = new THREE.Points(
        new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(arr, 3)),
        new THREE.PointsMaterial({ color: 0xffffff, size: 60, sizeAttenuation: true, transparent: true, opacity: 0.95, depthWrite: false, fog: false })
      );
      this.scene.add(stars);
      this.skyBodies.push(stars);
    } else {
      const sun = new THREE.Mesh(
        new THREE.SphereGeometry(210, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false })
      );
      sun.position.copy(pos);
      sun.userData.bloom = true;
      this.scene.add(sun);
      this.skyBodies.push(sun);
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(this.atmo.id === "evening" ? 680 : 460, 24, 24),
        new THREE.MeshBasicMaterial({
          color: this.atmo.id === "evening" ? 0xff9a4d : 0xffe9b0,
          transparent: true,
          opacity: this.atmo.id === "evening" ? 0.42 : 0.3,
          depthWrite: false,
          fog: false,
        })
      );
      glow.position.copy(pos);
      this.scene.add(glow);
      this.skyBodies.push(glow);
    }
  }

  buildClouds() {
    const a = this.atmo;
    const b = worldBounds();

    // The cloud deck must sit ABOVE the whole skyline, otherwise sprites cut
    // across the top of the tallest towers whenever the camera looks up. The
    // ceiling is derived from the tallest thing the city can ever build, not
    // hard-coded, so a 200-floor #1 landmark still clears it.
    const CLOUD_BASE = MAX_FLOORS * FLOOR_HEIGHT + 420; // ~1.1km
    for (let i = 0; i < a.cloudCount; i++) {
      const high = i % 3 !== 0;
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: cloudTexture(i * 7 + 1),
          transparent: true,
          depthWrite: false,
          fog: false,
          opacity: a.cloudOpacity * (high ? 1 : 0.6),
          color: a.cloudColor,
        })
      );
      const w = 1400 + Math.random() * 2600;
      sprite.scale.set(w, w * 0.5, 1);
      sprite.position.set(
        -b.cityW * 1.6 + Math.random() * b.cityW * 3.2,
        high ? CLOUD_BASE + 900 + Math.random() * 1200 : CLOUD_BASE + Math.random() * 320,
        -b.cityD * 1.4 + Math.random() * b.cityD * 3.2
      );
      sprite.renderOrder = 2;
      sprite.userData.drift = 3 + Math.random() * 7;
      sprite.userData.wrapX = b.cityW * 2.2;
      this.clouds.push(sprite);
      this.scene.add(sprite);
    }
  }

  setupLighting() {
    const a = this.atmo;
    const b = worldBounds();

    this.hemi = new THREE.HemisphereLight(a.hemiSky, a.hemiGround, a.hemiIntensity);
    this.scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(a.sunColor, a.sunIntensity);
    const d = Math.max(b.halfW, b.halfD) * 1.25;
    this.sun.position.copy(this.sunVec).multiplyScalar(2400).add(new THREE.Vector3(0, 500, 0));
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 300;
    this.sun.shadow.camera.far = 6800;
    this.sun.shadow.camera.left = -d;
    this.sun.shadow.camera.right = d;
    this.sun.shadow.camera.top = d;
    this.sun.shadow.camera.bottom = -d;
    this.sun.shadow.bias = -0.00018;
    this.sun.shadow.normalBias = 0.7;
    this.scene.add(this.sun, this.sun.target);
  }

  // ── Terrain: island grass + sidewalks ────────────────────────────────
  buildTerrain() {
    const isDark = this.theme === "dark";
    const b = worldBounds();

    // ocean-bed plane far below everything
    const bed = new THREE.Mesh(
      new THREE.PlaneGeometry(b.cityW * 8, b.cityD * 5),
      new THREE.MeshStandardMaterial({ color: isDark ? 0x0a1a26 : 0x2f5f86, roughness: 1 })
    );
    bed.rotation.x = -Math.PI / 2;
    bed.position.y = -8;
    this.environmentGroup.add(bed);

    // island soil / grass base
    const soilTex = grassTexture(isDark, false);
    soilTex.repeat.set(90, 90);
    const soilNrm = grassNormal(soilTex);
    soilNrm.repeat.copy(soilTex.repeat);
    const island = new THREE.Mesh(
      new THREE.PlaneGeometry(b.cityW + GRID.SHORE_MARGIN * 2 + 120, b.cityD + GRID.STREET_SPACING * 6),
      new THREE.MeshStandardMaterial({ map: soilTex, normalMap: soilNrm, normalScale: new THREE.Vector2(0.6, 0.6), color: this.atmo.islandTint, roughness: 0.96 })
    );
    island.rotation.x = -Math.PI / 2;
    island.position.set(-30, -0.15, 0);
    island.receiveShadow = true;
    this.environmentGroup.add(island);

    // sidewalk pads per block (concrete apron around each lot cluster)
    const padMat = new THREE.MeshStandardMaterial({ color: isDark ? 0x2b2f36 : 0xc3bfb4, roughness: 0.95 });
    const grassMat = new THREE.MeshStandardMaterial({ color: isDark ? 0x1f3325 : 0x5f9146, roughness: 1 });
    const pads = [];
    const yards = [];
    for (let bx = 0; bx < BLOCK_COLS; bx++) {
      for (let bz = 0; bz < BLOCK_ROWS; bz++) {
        const blk = getBlock(bx, bz);
        if (!blk.buildable) continue;
        const g = new THREE.PlaneGeometry(blk.w, blk.d);
        g.rotateX(-Math.PI / 2);
        g.translate(blk.cx, 0.04, blk.cz);
        pads.push(g);
        // planted verge inside the pad
        const yg = new THREE.PlaneGeometry(blk.w - 10, blk.d - 8);
        yg.rotateX(-Math.PI / 2);
        yg.translate(blk.cx, 0.06, blk.cz);
        yards.push(yg);
      }
    }
    if (pads.length) {
      const m = new THREE.Mesh(mergeSimple(pads), padMat);
      m.receiveShadow = true;
      this.environmentGroup.add(m);
    }
    if (yards.length) {
      const m = new THREE.Mesh(mergeSimple(yards), grassMat);
      m.receiveShadow = true;
      this.environmentGroup.add(m);
    }
  }

  // ── Roads: asphalt + lane dashes + crosswalks ────────────────────────
  makeAsphaltTexture() {
    if (this._asphaltTex) return this._asphaltTex;
    const S = 512;
    const cv = document.createElement("canvas");
    cv.width = cv.height = S;
    const ctx = cv.getContext("2d");
    const isDark = this.theme === "dark";
    ctx.fillStyle = isDark ? "#15181e" : "#3b4048";
    ctx.fillRect(0, 0, S, S);

    // aggregate - thousands of individually visible stones
    for (let i = 0; i < 26000; i++) {
      const g = Math.random();
      const shade = isDark ? 26 + g * 40 : 62 + g * 74;
      ctx.fillStyle = `rgba(${shade},${shade + 2},${shade + 6},${0.16 + g * 0.4})`;
      const r = 0.7 + Math.random() * 2.1;
      ctx.fillRect(Math.random() * S, Math.random() * S, r, r);
    }
    // darker tar patches
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = isDark ? "rgba(6,8,12,0.35)" : "rgba(30,33,38,0.3)";
      ctx.beginPath();
      ctx.ellipse(Math.random() * S, Math.random() * S, 12 + Math.random() * 46, 8 + Math.random() * 30, Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // hairline cracks
    ctx.strokeStyle = isDark ? "rgba(0,0,0,0.6)" : "rgba(22,24,28,0.45)";
    for (let i = 0; i < 26; i++) {
      let x = Math.random() * S;
      let y = Math.random() * S;
      ctx.lineWidth = 0.6 + Math.random() * 0.9;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 7; k++) {
        x += (Math.random() - 0.5) * 60;
        y += (Math.random() - 0.5) * 60;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // polished wheel tracks
    [S * 0.3, S * 0.7].forEach((cx) => {
      const g = ctx.createLinearGradient(cx - 30, 0, cx + 30, 0);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.5, isDark ? "rgba(120,130,150,0.07)" : "rgba(255,255,255,0.09)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(cx - 30, 0, 60, S);
    });

    const t = finishTex(cv);
    this._asphaltTex = t;
    this._asphaltNormal = normalFromCanvas(cv, 0.9);
    return t;
  }

  buildRoads() {
    const isDark = this.theme === "dark";
    const roadMat = new THREE.MeshStandardMaterial({ map: this.makeAsphaltTexture(), normalMap: this._asphaltNormal, normalScale: new THREE.Vector2(0.7, 0.7), color: 0xffffff, roughness: 0.94, metalness: 0.02 });
    const dashMat = new THREE.MeshBasicMaterial({ color: isDark ? 0x6b6a44 : 0xe6d79a });
    const zebraMat = new THREE.MeshBasicMaterial({ color: isDark ? 0xb9b9c4 : 0xeef0f2 });

    const roads = [];
    const dashes = [];
    const zebra = [];

    const segs = roadSegments();
    this._roadSegs = segs;
    const ROAD_TILE = 11; // world units per asphalt tile
    segs.avenues.forEach((a) => {
      const len = a.z1 - a.z0;
      if (len < 8) return;
      const g = new THREE.PlaneGeometry(a.w, len);
      scaleUV(g, a.w / ROAD_TILE, len / ROAD_TILE);
      g.rotateX(-Math.PI / 2);
      g.translate(a.x, 0.09, (a.z0 + a.z1) / 2);
      roads.push(g);
      const seg = 6;
      for (let z = a.z0 + 10; z < a.z1 - 10; z += seg * 2.4) {
        const dg = new THREE.PlaneGeometry(0.6, seg);
        dg.rotateX(-Math.PI / 2);
        dg.translate(a.x, 0.14, z);
        dashes.push(dg);
      }
    });
    segs.streets.forEach((s) => {
      const len = s.x1 - s.x0;
      if (len < 8) return;
      const g = new THREE.PlaneGeometry(len, s.w);
      scaleUV(g, len / ROAD_TILE, s.w / ROAD_TILE);
      g.rotateX(-Math.PI / 2);
      g.translate((s.x0 + s.x1) / 2, 0.08, s.z);
      roads.push(g);
    });

    const pk = parkRect();
    const pz = plazaRect();
    const inRes = (x, z) =>
      (x > pk.x0 && x < pk.x1 && z > pk.z0 && z < pk.z1) ||
      (x > pz.x0 && x < pz.x1 && z > pz.z0 && z < pz.z1);

    // zebra crossings on the four approaches of every intersection
    intersections().forEach(([x, z, major]) => {
      if (inRes(x, z)) return;
      if (!major && hash2(x | 0, z | 0) > 0.55) return;
      const halfA = GRID.ROAD_W_AVENUE / 2 + 4;
      const halfS = GRID.ROAD_W_STREET / 2 + 4;
      [-1, 1].forEach((sN) => {
        for (let k = -2; k <= 2; k++) {
          const sg = new THREE.PlaneGeometry(1.3, GRID.ROAD_W_AVENUE - 5);
          sg.rotateX(-Math.PI / 2);
          sg.translate(x + k * 2.4, 0.17, z + sN * halfS);
          zebra.push(sg);
        }
        for (let k = -2; k <= 2; k++) {
          const sg = new THREE.PlaneGeometry(GRID.ROAD_W_STREET - 5, 1.3);
          sg.rotateX(-Math.PI / 2);
          sg.translate(x + sN * halfA, 0.17, z + k * 2.4);
          zebra.push(sg);
        }
      });
    });

    this.environmentGroup.add(new THREE.Mesh(mergeSimple(roads), roadMat));
    if (dashes.length) this.environmentGroup.add(new THREE.Mesh(mergeSimple(dashes), dashMat));
    if (zebra.length) this.environmentGroup.add(new THREE.Mesh(mergeSimple(zebra), zebraMat));
  }

  // ── District colour plots ────────────────────────────────────────────
  buildDistrictPlots() {
    const isDark = this.theme === "dark";
    DISTRICT_META.forEach((d) => {
      const r = districtRect(d);
      const w = r.x1 - r.x0;
      const dep = r.z1 - r.z0;
      const col = new THREE.Color(d.color);

      // translucent tint wash
      const wash = new THREE.Mesh(
        new THREE.PlaneGeometry(w, dep),
        new THREE.MeshBasicMaterial({
          color: col,
          transparent: true,
          opacity: isDark ? 0.1 : 0.08,
          depthWrite: false,
        })
      );
      wash.rotation.x = -Math.PI / 2;
      wash.position.set((r.x0 + r.x1) / 2, 0.045, (r.z0 + r.z1) / 2);
      wash.renderOrder = 1;
      this.environmentGroup.add(wash);

      // glowing perimeter border
      const pts = [
        new THREE.Vector3(r.x0, 0.6, r.z0),
        new THREE.Vector3(r.x1, 0.6, r.z0),
        new THREE.Vector3(r.x1, 0.6, r.z1),
        new THREE.Vector3(r.x0, 0.6, r.z1),
        new THREE.Vector3(r.x0, 0.6, r.z0),
      ];
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: col })
      );
      line.userData.bloom = true;
      this.environmentGroup.add(line);

      // painted district boundary line - flush with the ground
      const kerb = new THREE.Mesh(
        new THREE.PlaneGeometry(w, 1.1),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.5, depthWrite: false })
      );
      kerb.rotation.x = -Math.PI / 2;
      kerb.position.set((r.x0 + r.x1) / 2, 0.19, r.z0);
      this.environmentGroup.add(kerb);
      const kerb2 = kerb.clone();
      kerb2.position.z = r.z1;
      this.environmentGroup.add(kerb2);
    });
  }

  // ── Central Fountain Botanical Park & Plaza ───────────────────────────
  /**
   * Victorian double-globe lamp post - the park/plaza street furniture.
   * Shares MAT.lampGlobe so the city clock can dim every globe at once, and
   * registers itself as a collider so the player can't walk through the pole.
   *
   * `scale` > 1 gives the taller Times Square variant.
   */
  /**
   * three.js `Water` re-renders the ENTIRE scene into a reflection target from
   * its own onBeforeRender. Measured on an M1: three water surfaces (ocean,
   * park pond, greenbelt river) cost 78ms of a 90ms frame - 87% of the whole
   * render - because that is three extra full-scene renders. With post-processing
   * on it is SIX, since the bloom composer and the final composer each trigger
   * them.
   *
   * Two observations make this nearly free to fix, with no visual change:
   *   1. During the bloom pass every water surface is swapped to a flat black
   *      material, so the reflection it just computed is thrown away. Skip it.
   *   2. Water is rippling, normal-mapped and distorted. A reflection refreshed
   *      every 3rd frame is indistinguishable from one refreshed every frame,
   *      and the three surfaces are staggered so only one updates per frame.
   */
  _throttleWaterReflections() {
    // 6 with three staggered surfaces = one reflection render every other
    // frame, rather than three every frame. The water's own normal-map
    // animation still advances every frame, so the surface never looks frozen;
    // only the reflected image (an essentially static skyline) refreshes slower.
    const EVERY = 6;
    this.waters.forEach((w, i) => {
      if (w.userData._reflectThrottled) return;
      w.userData._reflectThrottled = true;
      const orig = w.onBeforeRender;
      let n = i; // stagger: at most one surface refreshes on any given frame
      w.onBeforeRender = (...args) => {
        // postfx marks the bloom pass; water is black there, reflection unused
        if (this.scene.userData.bloomPass) return;
        if (n++ % EVERY !== 0) return;
        orig.apply(w, args);
      };
    });
  }

  makeVictorianLamp(x, z, { yaw = 0, scale = 1, collide = true } = {}) {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.5, metalness: 0.7 });
    const lamp = new THREE.Group();
    lamp.position.set(x, 0.16, z);
    lamp.rotation.y = yaw;

    const h = 4.5 * scale;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * scale, 0.22 * scale, h, 8), poleMat);
    pole.position.y = h / 2;
    pole.castShadow = true;
    lamp.add(pole);

    [-0.6 * scale, 0.6 * scale].forEach((lx) => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.6 * scale), poleMat);
      arm.position.set(lx * 0.5, h - 0.2, 0);
      lamp.add(arm);

      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.3 * scale, 12, 10), MAT.lampGlobe);
      globe.position.set(lx, h - 0.2, 0);
      globe.userData.bloom = true;
      globe.layers.enable(1);
      lamp.add(globe);
    });

    this.environmentGroup.add((lamp));
    if (collide) {
      if (!this.propColliders) this.propColliders = [];
      this.propColliders.push({ cx: x, cz: z, hw: 0.3, hd: 0.3, h, prop: true });
    }
    return lamp;
  }

  makeStonePaversTexture() {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 256;
    const ctx = cv.getContext("2d");
    const isDark = this.theme === "dark";
    ctx.fillStyle = isDark ? "#232730" : "#9c8d79";
    ctx.fillRect(0, 0, 256, 256);

    const cols = 8, rows = 8;
    const cw = 256 / cols, ch = 256 / rows;
    for (let r = 0; r < rows; r++) {
      const xOff = (r % 2) * (cw * 0.5);
      for (let c = -1; c <= cols; c++) {
        const px = c * cw + xOff;
        const py = r * ch;
        const rnd = (Math.random() * 24 - 12);
        ctx.fillStyle = isDark
          ? `rgb(${44 + rnd}, ${48 + rnd}, ${56 + rnd})`
          : `rgb(${182 + rnd}, ${172 + rnd}, ${158 + rnd})`;
        ctx.beginPath();
        ctx.roundRect(px + 2, py + 2, cw - 4, ch - 4, 3);
        ctx.fill();
        ctx.strokeStyle = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.16)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 6);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  makeArchedGateSignTexture(title = "VELORA CENTRAL PARK") {
    // 2048×512 so the lettering stays razor-sharp when you stand under the
    // arch. Text is set STRAIGHT on an arched plaque - per-letter rotation
    // along a curve was what made the old sign hard to read.
    const W = 2048;
    const H = 512;
    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext("2d");
    ctx.textRendering = "geometricPrecision";
    ctx.clearRect(0, 0, W, H);

    // ── arched plaque ────────────────────────────────────────────────
    const plaque = () => {
      ctx.beginPath();
      ctx.moveTo(60, H - 40);
      ctx.lineTo(60, 210);
      ctx.quadraticCurveTo(W / 2, -70, W - 60, 210);
      ctx.lineTo(W - 60, H - 40);
      ctx.closePath();
    };
    plaque();
    const body = ctx.createLinearGradient(0, 0, 0, H);
    body.addColorStop(0, "#0d3325");
    body.addColorStop(0.55, "#14513a");
    body.addColorStop(1, "#08251b");
    ctx.fillStyle = body;
    ctx.fill();

    // brushed-brass double frame
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#c9a047";
    ctx.lineWidth = 14;
    ctx.stroke();
    ctx.strokeStyle = "#ffe9a8";
    ctx.lineWidth = 5;
    ctx.stroke();

    // inner hairline
    ctx.save();
    plaque();
    ctx.clip();
    ctx.strokeStyle = "rgba(255,233,168,0.45)";
    ctx.lineWidth = 3;
    ctx.strokeRect(96, 236, W - 192, H - 300);
    ctx.restore();

    // ── title: straight, wide-tracked, high contrast ─────────────────
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const titleY = 330;

    // letter-spacing (not supported everywhere) → draw glyph by glyph
    const drawTracked = (text, y, font, fill, tracking, stroke) => {
      ctx.font = font;
      const widths = [...text].map((c) => ctx.measureText(c).width);
      const total = widths.reduce((a, b) => a + b, 0) + tracking * (text.length - 1);
      let x = W / 2 - total / 2;
      for (let i = 0; i < text.length; i++) {
        const cxp = x + widths[i] / 2;
        if (stroke) {
          ctx.lineWidth = 9;
          ctx.strokeStyle = stroke;
          ctx.strokeText(text[i], cxp, y);
        }
        ctx.fillStyle = fill;
        ctx.fillText(text[i], cxp, y);
        x += widths[i] + tracking;
      }
    };

    ctx.shadowColor = "rgba(0,0,0,0.9)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    drawTracked(title, titleY, "900 118px Georgia, 'Times New Roman', serif", "#ffdf8a", 10, "#3b2606");
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // ── rule + subtitle ──────────────────────────────────────────────
    ctx.strokeStyle = "rgba(255,223,138,0.6)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 380, 398);
    ctx.lineTo(W / 2 + 380, 398);
    ctx.stroke();

    drawTracked("EST. 2024  ·  BOTANICAL GARDENS", 445, "bold 44px Georgia, serif", "#f3e4b8", 8, null);

    // corner rosettes
    [[150, 300], [W - 150, 300]].forEach(([rx, ry]) => {
      ctx.beginPath();
      ctx.arc(rx, ry, 24, 0, Math.PI * 2);
      ctx.fillStyle = "#c9a047";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(rx, ry, 12, 0, Math.PI * 2);
      ctx.fillStyle = "#ffe9a8";
      ctx.fill();
    });

    return finishTex(cv);
  }

  buildArchedGate(cx, cz, outerR, ang, title) {
    const isDark = this.theme === "dark";
    const gateGroup = new THREE.Group();
    const gx = cx + Math.cos(ang) * outerR;
    const gz = cz + Math.sin(ang) * outerR;
    gateGroup.position.set(gx, 0, gz);
    gateGroup.rotation.y = -ang + Math.PI / 2;

    const stoneMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x383d47 : 0xe4dac8,
      roughness: 0.85,
    });
    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1e,
      roughness: 0.5,
      metalness: 0.7,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xe5b85a,
      roughness: 0.35,
      metalness: 0.8,
    });
    const lampGlowMat = new THREE.MeshBasicMaterial({
      color: 0xffe899,
    });

    const span = 13.5;
    const pillarH = 6.4;

    // Twin neoclassical stone pillars
    [-span / 2, span / 2].forEach((px) => {
      const pillar = new THREE.Group();
      pillar.position.set(px, 0, 0);

      // Base plinth
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.2, 1.9), stoneMat);
      base.position.y = 0.6;
      base.castShadow = true;
      base.receiveShadow = true;
      pillar.add(base);

      // Shaft
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(1.4, pillarH - 2.0, 1.4), stoneMat);
      shaft.position.y = 1.2 + (pillarH - 2.0) / 2;
      shaft.castShadow = true;
      shaft.receiveShadow = true;
      pillar.add(shaft);

      // Capital
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 1.8), stoneMat);
      cap.position.y = pillarH - 0.4;
      cap.castShadow = true;
      pillar.add(cap);

      // Glowing spherical lantern on pillar top
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), lampGlowMat);
      globe.position.y = pillarH + 0.45;
      globe.userData.bloom = true;
      pillar.add(globe);

      gateGroup.add(pillar);

      // Register collider for pillar
      const worldPx = gx + (-Math.sin(ang) * px);
      const worldPz = gz + (Math.cos(ang) * px);
      this.propColliders.push({
        cx: worldPx,
        cz: worldPz,
        hw: 1.0,
        hd: 1.0,
        h: pillarH,
        prop: true,
      });
    });

    // Sweeping 3D Wrought-Iron Arch
    const archCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-span / 2, pillarH - 0.3, 0),
      new THREE.Vector3(0, pillarH + 3.8, 0),
      new THREE.Vector3(span / 2, pillarH - 0.3, 0)
    );
    const archGeo = new THREE.TubeGeometry(archCurve, 32, 0.14, 8, false);
    const archMesh = new THREE.Mesh(archGeo, ironMat);
    archMesh.castShadow = true;
    gateGroup.add(archMesh);

    // Secondary lower arch tube for truss structure
    const lowerCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-span / 2, pillarH - 1.1, 0),
      new THREE.Vector3(0, pillarH + 2.6, 0),
      new THREE.Vector3(span / 2, pillarH - 1.1, 0)
    );
    const lowerArchMesh = new THREE.Mesh(
      new THREE.TubeGeometry(lowerCurve, 32, 0.10, 8, false),
      ironMat
    );
    lowerArchMesh.castShadow = true;
    gateGroup.add(lowerArchMesh);

    // Decorative vertical balusters connecting the double arches
    for (let b = -5; b <= 5; b++) {
      const bx = (b / 6) * (span / 2 - 0.8);
      const t = (bx + span / 2) / span;
      const topY = archCurve.getPoint(t).y;
      const botY = lowerCurve.getPoint(t).y;
      const h = topY - botY;
      if (h > 0.1) {
        const baluster = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, h, 6), ironMat);
        baluster.position.set(bx, botY + h / 2, 0);
        baluster.castShadow = true;
        gateGroup.add(baluster);
      }
    }

    // Gold decorative apex finial
    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.1, 8), goldMat);
    finial.position.set(0, pillarH + 4.3, 0);
    finial.castShadow = true;
    gateGroup.add(finial);

    // ── Solid arched name board, mounted clear of the arch tube ───────
    const signW = 11.4;
    const signH = 3.1;
    const signY = pillarH + 1.35;

    // dark backing slab (gives the sign real thickness + kills z-fighting)
    const backing = new THREE.Mesh(
      new THREE.BoxGeometry(signW + 0.5, signH + 0.45, 0.42),
      new THREE.MeshStandardMaterial({ color: isDark ? 0x14201a : 0x1d3327, roughness: 0.75 })
    );
    backing.position.set(0, signY, 0);
    backing.castShadow = true;
    gateGroup.add(backing);

    // brass frame
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(signW + 0.85, signH + 0.8, 0.24),
      goldMat
    );
    frame.position.set(0, signY, -0.02);
    gateGroup.add(frame);

    // the artwork, on BOTH faces, standing proud of the backing
    const signTex = this.makeArchedGateSignTexture(title);
    const signMat = new THREE.MeshStandardMaterial({
      map: signTex,
      transparent: true,
      roughness: 0.42,
      metalness: 0.1,
      emissive: new THREE.Color(0xffe9a8),
      emissiveMap: signTex,
      emissiveIntensity: isDark ? 0.55 : 0.14,
    });
    [0.23, -0.23].forEach((zOff) => {
      const face = new THREE.Mesh(new THREE.PlaneGeometry(signW, signH), signMat);
      face.position.set(0, signY, zOff);
      if (zOff < 0) face.rotation.y = Math.PI;
      face.userData.bloom = true;
      gateGroup.add(face);
    });

    // two gooseneck lamps washing the board
    [-signW * 0.3, signW * 0.3].forEach((lx) => {
      const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 6), ironMat);
      armL.position.set(lx, signY + signH / 2 + 0.55, 0.55);
      armL.rotation.x = Math.PI / 2.6;
      gateGroup.add(armL);
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.42, 12, 1, true), ironMat);
      shade.position.set(lx, signY + signH / 2 + 0.32, 0.95);
      shade.rotation.x = Math.PI * 0.78;
      gateGroup.add(shade);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), lampGlowMat);
      bulb.position.set(lx, signY + signH / 2 + 0.18, 0.95);
      bulb.userData.bloom = true;
      gateGroup.add(bulb);
    });

    // ── Open wrought-iron gate leaves (vertical balusters, not slabs) ──
    [-1, 1].forEach((side) => {
      const leaf = new THREE.Group();
      leaf.position.set(side * (span / 2 - 0.7), 0, -0.9);
      leaf.rotation.y = side * -0.72;

      const leafW = 3.0;
      const leafH = 3.4;
      // top & bottom rails
      [0.25, leafH].forEach((ry) => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(leafW, 0.16, 0.16), ironMat);
        rail.position.set((side * leafW) / 2, ry, 0);
        leaf.add(rail);
      });
      // balusters with spear tips
      for (let i = 0; i <= 7; i++) {
        const bx = side * (i / 7) * leafW;
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, leafH, 6), ironMat);
        bar.position.set(bx, leafH / 2 + 0.1, 0);
        leaf.add(bar);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.32, 6), goldMat);
        tip.position.set(bx, leafH + 0.28, 0);
        leaf.add(tip);
      }
      gateGroup.add(leaf);
    });

    this.environmentGroup.add(gateGroup);
  }

  buildCentralPlaza() {
    const isDark = this.theme === "dark";
    const p = plazaRect();
    const cx = p.cx;
    const cz = p.cz;
    const outerR = Math.min(p.x1 - p.x0, p.z1 - p.z0) * 0.46;

    // 1. Surrounding asphalt ring road for vehicles
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(outerR, outerR + 16, 56),
      new THREE.MeshStandardMaterial({ map: this.makeAsphaltTexture(), normalMap: this._asphaltNormal, normalScale: new THREE.Vector2(0.7, 0.7), color: 0xffffff, roughness: 0.94, metalness: 0.02 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(cx, 0.09, cz);
    ring.receiveShadow = true;
    this.environmentGroup.add(ring);

    // 2. Base park botanical lawn
    const lawnTex = grassTexture(isDark, true);
    lawnTex.repeat.set(30, 30);
    const lawnNrm = grassNormal(lawnTex);
    lawnNrm.repeat.copy(lawnTex.repeat);
    const lawn = new THREE.Mesh(
      new THREE.CircleGeometry(outerR - 0.5, 64),
      new THREE.MeshStandardMaterial({ map: lawnTex, normalMap: lawnNrm, normalScale: new THREE.Vector2(0.7, 0.7), color: this.atmo.grassTint, roughness: 0.95 })
    );
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.set(cx, 0.12, cz);
    lawn.receiveShadow = true;
    this.environmentGroup.add(lawn);

    // 3. Stone Pavers Materials & Network of Park Roads / Walkways
    const stoneTex = this.makeStonePaversTexture();
    // Tinted DOWN, never left at pure white: an untinted paver texture under
    // the key light is what made every park walkway read as a blown-out white
    // ribbon from the air.
    const stoneRoadMat = new THREE.MeshStandardMaterial({
      map: stoneTex,
      color: this.atmo.paverTint,
      roughness: 0.95,
      metalness: 0,
    });

    // Outer cobblestone promenade ring road
    const outerPromenade = new THREE.Mesh(
      new THREE.RingGeometry(outerR - 16, outerR - 4, 64),
      stoneRoadMat
    );
    outerPromenade.rotation.x = -Math.PI / 2;
    outerPromenade.position.set(cx, 0.14, cz);
    outerPromenade.receiveShadow = true;
    this.environmentGroup.add(outerPromenade);

    // Inner fountain plaza cobblestone apron
    const fountainApron = new THREE.Mesh(
      new THREE.RingGeometry(17, 31, 56),
      stoneRoadMat
    );
    fountainApron.rotation.x = -Math.PI / 2;
    fountainApron.position.set(cx, 0.15, cz);
    fountainApron.receiveShadow = true;
    this.environmentGroup.add(fountainApron);

    // 4 Cardinal Stone Avenues connecting outer gates to inner fountain
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2;
      const dist = (outerR - 4 + 17) / 2;
      const len = (outerR - 4) - 17;
      const roadMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(8.5, len + 2),
        stoneRoadMat
      );
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.rotation.z = -ang + Math.PI / 2;
      roadMesh.position.set(cx + Math.cos(ang) * dist, 0.145, cz + Math.sin(ang) * dist);
      roadMesh.receiveShadow = true;
      this.environmentGroup.add(roadMesh);
    }

    // 4 Diagonal Garden Stone Walkways
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const dist = (outerR - 12 + 20) / 2;
      const len = (outerR - 12) - 20;
      const pathMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(5.0, len),
        stoneRoadMat
      );
      pathMesh.rotation.x = -Math.PI / 2;
      pathMesh.rotation.z = -ang + Math.PI / 2;
      pathMesh.position.set(cx + Math.cos(ang) * dist, 0.142, cz + Math.sin(ang) * dist);
      pathMesh.receiveShadow = true;
      this.environmentGroup.add(pathMesh);
    }

    // 4. Centrepiece Fountain
    this.fountain = createFountain({ radius: 16, dark: isDark });
    this.fountain.group.position.set(cx, 0.16, cz);
    this.fountain.group.traverse((o) => {
      if (o.userData?.bloom) o.layers.enable(1);
    });
    this.environmentGroup.add((this.fountain.group));
    this.fountainCollider = {
      cx,
      cz,
      hw: this.fountain.radius + 0.4,
      hd: this.fountain.radius + 0.4,
      h: 1.6,
      prop: true,
    };

    // 5. Grand Arched Park Portals ("VELORA CENTRAL PARK") at North, South, East, West entrances
    const gateAngles = [
      { ang: -Math.PI / 2, title: "VELORA CENTRAL PARK" }, // North
      { ang: Math.PI / 2, title: "VELORA CENTRAL PARK" },  // South
      { ang: 0, title: "VELORA BOTANIC PARK" },            // East
      { ang: Math.PI, title: "VELORA BOTANIC PARK" },      // West
    ];
    gateAngles.forEach((g) => {
      this.buildArchedGate(cx, cz, outerR - 4, g.ang, g.title);
    });

    // 6. Perimeter Wrought Iron Fence & Stone Pillars
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.5, metalness: 0.7 });
    const postMat = new THREE.MeshStandardMaterial({ color: isDark ? 0x383d47 : 0xe4dac8, roughness: 0.85 });
    const numPosts = 32;
    for (let i = 0; i < numPosts; i++) {
      const a = (i / numPosts) * Math.PI * 2;
      // Skip near the 4 grand entrance gates
      const isGate = [0, Math.PI / 2, Math.PI, -Math.PI / 2].some((ga) => Math.abs(a - ga) < 0.22 || Math.abs(a - (ga + Math.PI * 2)) < 0.22);
      if (isGate) continue;

      const px = cx + Math.cos(a) * (outerR - 3.8);
      const pz = cz + Math.sin(a) * (outerR - 3.8);

      const post = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.2, 0.8), postMat);
      post.position.set(px, 1.1, pz);
      post.castShadow = true;
      this.environmentGroup.add(post);

      const panel = new THREE.Mesh(new THREE.BoxGeometry((outerR * Math.PI * 2 / numPosts) * 0.88, 1.6, 0.1), fenceMat);
      panel.position.set(px, 1.0, pz);
      panel.rotation.y = -a + Math.PI / 2;
      panel.castShadow = true;
      this.environmentGroup.add(panel);

      this.propColliders.push({
        cx: px,
        cz: pz,
        hw: 0.6,
        hd: 0.6,
        h: 2.2,
        prop: true,
      });
    }

    // 7. Abundant Park Benches (20+ benches)
    const benchMat = new THREE.MeshStandardMaterial({ color: isDark ? 0x4a3a2a : 0x8a6242, roughness: 0.85 });
    const benchLegMat = new THREE.MeshStandardMaterial({ color: isDark ? 0x2b2f36 : 0x55585e, roughness: 0.7, metalness: 0.4 });

    // Inner fountain ring benches (12 benches)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.25;
      const isNearRoad = [0, 1, 2, 3].some((k) => Math.abs(a - (k * Math.PI / 2)) < 0.25);
      if (isNearRoad) continue;

      const bx = cx + Math.cos(a) * (this.fountain.radius + 7.5);
      const bz = cz + Math.sin(a) * (this.fountain.radius + 7.5);
      const byaw = -a + Math.PI / 2;

      const bench = new THREE.Group();
      bench.position.set(bx, 0.18, bz);
      bench.rotation.y = byaw;

      const seat = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.2, 1.3), benchMat);
      seat.position.y = 0.85;
      seat.castShadow = true;
      bench.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.8, 0.16), benchMat);
      back.position.set(0, 1.3, -0.55);
      back.rotation.x = -0.15;
      back.castShadow = true;
      bench.add(back);

      [-1.8, 1.8].forEach((lx) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.85, 1.2), benchLegMat);
        leg.position.set(lx, 0.425, 0);
        leg.castShadow = true;
        bench.add(leg);
      });

      this.environmentGroup.add(bench);

      const sitX = bx + Math.sin(byaw) * 0.15;
      const sitZ = bz + Math.cos(byaw) * 0.15;
      const standX = bx + Math.sin(byaw) * 1.5;
      const standZ = bz + Math.cos(byaw) * 1.5;

      this.parkBenches.push({
        x: sitX,
        y: 0.10,
        z: sitZ,
        yaw: byaw,
        standX,
        standZ,
      });

      this.propColliders.push({
        cx: bx,
        cz: bz,
        hw: 2.4,
        hd: 0.85,
        h: 1.6,
        rot: byaw,
        prop: true,
      });
    }

    // Outer promenade benches (12 benches)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.35;
      const isNearGate = [0, 1, 2, 3].some((k) => Math.abs(a - (k * Math.PI / 2)) < 0.28);
      if (isNearGate) continue;

      const bx = cx + Math.cos(a) * (outerR - 14.5);
      const bz = cz + Math.sin(a) * (outerR - 14.5);
      const byaw = -a - Math.PI / 2; // facing inward toward garden

      const bench = new THREE.Group();
      bench.position.set(bx, 0.16, bz);
      bench.rotation.y = byaw;

      const seat = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.2, 1.3), benchMat);
      seat.position.y = 0.85;
      seat.castShadow = true;
      bench.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.8, 0.16), benchMat);
      back.position.set(0, 1.3, -0.55);
      back.rotation.x = -0.15;
      back.castShadow = true;
      bench.add(back);

      [-1.8, 1.8].forEach((lx) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.85, 1.2), benchLegMat);
        leg.position.set(lx, 0.425, 0);
        leg.castShadow = true;
        bench.add(leg);
      });

      this.environmentGroup.add(bench);

      const sitX = bx + Math.sin(byaw) * 0.15;
      const sitZ = bz + Math.cos(byaw) * 0.15;
      const standX = bx + Math.sin(byaw) * 1.5;
      const standZ = bz + Math.cos(byaw) * 1.5;

      this.parkBenches.push({
        x: sitX,
        y: 0.10,
        z: sitZ,
        yaw: byaw,
        standX,
        standZ,
      });

      this.propColliders.push({
        cx: bx,
        cz: bz,
        hw: 2.4,
        hd: 0.85,
        h: 1.6,
        rot: byaw,
        prop: true,
      });
    }

    // 8. Victorian Double-Globe Lamp Posts - dense enough that every walkway,
    // radial avenue and diagonal is actually lit end to end after dark.
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2 + 0.15;
      const rad = i % 2 === 0 ? outerR - 10 : 33;
      this.makeVictorianLamp(cx + Math.cos(a) * rad, cz + Math.sin(a) * rad, { yaw: -a });
    }
    // A pair flanking each cardinal stone avenue, walking outward from the
    // fountain apron to the promenade ring.
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2;
      const side = ang + Math.PI / 2;
      for (let r = 24; r < outerR - 8; r += 13) {
        [-6.5, 6.5].forEach((off) => {
          this.makeVictorianLamp(
            cx + Math.cos(ang) * r + Math.cos(side) * off,
            cz + Math.sin(ang) * r + Math.sin(side) * off,
            { yaw: -ang }
          );
        });
      }
    }

    // 9. Lush Park Trees & Flowering Cherry Blossoms
    const treePositions = [];
    // Outer lawn tree ring (16 shade trees)
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + 0.19;
      const isGate = [0, 1, 2, 3].some((k) => Math.abs(a - (k * Math.PI / 2)) < 0.2);
      if (isGate) continue;
      treePositions.push([
        cx + Math.cos(a) * (outerR - 9.5),
        cz + Math.sin(a) * (outerR - 9.5),
      ]);
    }
    // Mid garden lawn tree ring (12 flowering trees)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.28;
      const isRoad = [0, 1, 2, 3, 4, 5, 6, 7].some((k) => Math.abs(a - (k * Math.PI / 4)) < 0.18);
      if (isRoad) continue;
      treePositions.push([
        cx + Math.cos(a) * 42,
        cz + Math.sin(a) * 42,
      ]);
    }
    // Cypress trees flanking gate portals
    gateAngles.forEach((g) => {
      [-7.5, 7.5].forEach((offset) => {
        const sideAng = g.ang + Math.PI / 2;
        treePositions.push([
          cx + Math.cos(g.ang) * (outerR - 5.5) + Math.cos(sideAng) * offset,
          cz + Math.sin(g.ang) * (outerR - 5.5) + Math.sin(sideAng) * offset,
        ]);
      });
    });

    if (treePositions.length) {
      this.environmentGroup.add((makeTreeField(treePositions, { pineRatio: 0.25 })));
    }

    // 10. Colorful Flowerbeds & Trimmed Hedges
    const flowerColors = [0x9b5de5, 0xf15bb5, 0xe63946, 0xffb703, 0x4361ee];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const fDist = 41;
      const col = flowerColors[i % flowerColors.length];
      const bed = new THREE.Mesh(
        new THREE.CircleGeometry(4.2, 16),
        new THREE.MeshStandardMaterial({ color: isDark ? new THREE.Color(col).multiplyScalar(0.7) : col, roughness: 0.9 })
      );
      bed.rotation.x = -Math.PI / 2;
      bed.position.set(cx + Math.cos(a) * fDist, 0.155, cz + Math.sin(a) * fDist);
      bed.receiveShadow = true;
      this.environmentGroup.add(bed);

      // Low trimmed boxwood border ring
      const hedge = new THREE.Mesh(
        new THREE.RingGeometry(4.2, 5.0, 16),
        new THREE.MeshStandardMaterial({ color: isDark ? 0x1f3822 : 0x2e5e2e, roughness: 1 })
      );
      hedge.rotation.x = -Math.PI / 2;
      hedge.position.set(cx + Math.cos(a) * fDist, 0.16, cz + Math.sin(a) * fDist);
      hedge.receiveShadow = true;
      this.environmentGroup.add(hedge);
    }

    // 11. Radial connecting asphalt roads outward to surrounding avenues
    const roadMat = new THREE.MeshStandardMaterial({ map: this.makeAsphaltTexture(), normalMap: this._asphaltNormal, normalScale: new THREE.Vector2(0.7, 0.7), color: 0xffffff, roughness: 0.94, metalness: 0.02 });
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 + 0.2;
      const spoke = new THREE.Mesh(new THREE.PlaneGeometry(14, 150), roadMat);
      spoke.rotation.x = -Math.PI / 2;
      spoke.rotation.z = ang;
      spoke.position.set(cx + Math.cos(ang) * (outerR + 80), 0.09, cz + Math.sin(ang) * (outerR + 80));
      spoke.receiveShadow = true;
      this.environmentGroup.add(spoke);

      // Street lighting down every approach road, both kerbs, so the roads
      // feeding the fountain plaza are lit the way the plaza itself is.
      const side = ang + Math.PI / 2;
      for (let r = outerR + 14; r < outerR + 152; r += 26) {
        [-1, 1].forEach((sdir) => {
          const lx = cx + Math.cos(ang) * r + Math.cos(side) * sdir * 9.5;
          const lz = cz + Math.sin(ang) * r + Math.sin(side) * sdir * 9.5;
          const sl = makeStreetlight();
          sl.position.set(lx, 0, lz);
          sl.rotation.y = -ang + (sdir > 0 ? Math.PI : 0);
          sl.traverse((o) => { if (o.userData.bloom) o.layers.enable(1); });
          this.environmentGroup.add((sl));
          this.propColliders.push({ cx: lx, cz: lz, hw: 0.32, hd: 0.32, h: 8, prop: true });
        });
      }
    }

    // Lamps hugging the outer ring road itself.
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2 + 0.1;
      this.makeVictorianLamp(cx + Math.cos(a) * (outerR + 19), cz + Math.sin(a) * (outerR + 19), { yaw: -a });
    }
  }

  // ── Central Park ─────────────────────────────────────────────────────
  // One shared 256² normal map for every Water surface (pond, ocean, rivers) -
  // they still look distinct via per-surface distortionScale / colour.
  makeWaterNormals() {
    if (this._waterNormals) return this._waterNormals;
    // Multi-octave directional swell: three overlapping wave trains at
    // different scales + a fine chop octave, so the surface reads as real
    // moving water instead of a soft blur.
    const S = 512;
    const cv = document.createElement("canvas");
    cv.width = cv.height = S;
    const ctx = cv.getContext("2d");
    const img = ctx.createImageData(S, S);

    const trains = [
      { ax: 1.0, az: 0.22, k: 5, amp: 1.0 },
      { ax: -0.55, az: 1.0, k: 9, amp: 0.55 },
      { ax: 0.3, az: -0.85, k: 17, amp: 0.3 },
      { ax: 0.9, az: 0.75, k: 34, amp: 0.14 },
    ];
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const u = x / S;
        const v = y / S;
        let dx = 0;
        let dz = 0;
        for (const t of trains) {
          const ph = (u * t.ax + v * t.az) * Math.PI * 2 * t.k;
          const d = Math.cos(ph) * t.amp;
          dx += d * t.ax;
          dz += d * t.az;
        }
        const len = Math.hypot(dx, dz, 3.2);
        const i = (y * S + x) * 4;
        img.data[i] = ((dx / len) * 0.5 + 0.5) * 255;
        img.data[i + 1] = ((dz / len) * 0.5 + 0.5) * 255;
        img.data[i + 2] = ((3.2 / len) * 0.5 + 0.5) * 255;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 16;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
    this._waterNormals = t;
    return t;
  }


  // ── Times Square - the neon crossroads, deliberately far from the park ──
  // The whole square (sign wall, shopfronts, landmark stack, plaza furniture,
  // street clutter and the standing crowd) lives in timesSquare.js - it is a
  // big enough piece of authored place to be worth its own module.
  buildTimesSquare() {
    buildTimesSquareScene(this);
  }

  /**
   * A single park bench + its collider + a "sit here" hint for the game layer.
   * Extracted so the plaza ring and the park spine build identical furniture.
   */
  addParkBench(x, z, yaw) {
    const isDark = this.theme === "dark";
    const benchMat = new THREE.MeshStandardMaterial({ color: isDark ? 0x4a3a2a : 0x8a6242, roughness: 0.85 });
    const legMat = new THREE.MeshStandardMaterial({ color: isDark ? 0x2b2f36 : 0x55585e, roughness: 0.7, metalness: 0.4 });

    const bench = new THREE.Group();
    bench.position.set(x, 0.16, z);
    bench.rotation.y = yaw;

    const seat = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.2, 1.3), benchMat);
    seat.position.y = 0.85;
    seat.castShadow = true;
    bench.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.8, 0.16), benchMat);
    back.position.set(0, 1.3, -0.55);
    back.rotation.x = -0.15;
    back.castShadow = true;
    bench.add(back);

    [-1.6, 1.6].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.85, 1.2), legMat);
      leg.position.set(lx, 0.425, 0);
      leg.castShadow = true;
      bench.add(leg);
    });
    this.environmentGroup.add((bench));

    this.parkBenches.push({
      x: x + Math.sin(yaw) * 0.15,
      y: 0.1,
      z: z + Math.cos(yaw) * 0.15,
      yaw,
      standX: x + Math.sin(yaw) * 1.5,
      standZ: z + Math.cos(yaw) * 1.5,
    });
    this.propColliders.push({ cx: x, cz: z, hw: 2.2, hd: 0.85, h: 1.6, rot: yaw, prop: true });
    return bench;
  }

  buildPark() {
    const isDark = this.theme === "dark";
    const p = parkRect();
    const w = p.x1 - p.x0;
    const dep = p.z1 - p.z0;

    const gTex = grassTexture(isDark, true);
    gTex.repeat.set(20, 46);
    const gNrm = grassNormal(gTex);
    gNrm.repeat.copy(gTex.repeat);
    const grass = new THREE.Mesh(
      new THREE.PlaneGeometry(w, dep),
      new THREE.MeshStandardMaterial({ map: gTex, normalMap: gNrm, normalScale: new THREE.Vector2(0.7, 0.7), color: this.atmo.grassTint, roughness: 0.95 })
    );
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(p.cx, 0.08, p.cz);
    grass.receiveShadow = true;
    this.environmentGroup.add(grass);

    // soccer field
    const soccer = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.72, dep * 0.2),
      new THREE.MeshStandardMaterial({ map: fieldTexture("soccer"), roughness: 1 })
    );
    soccer.rotation.x = -Math.PI / 2;
    soccer.position.set(p.cx, 0.12, p.z0 + dep * 0.22);
    this.environmentGroup.add(soccer);

    // two tennis courts
    [-1, 1].forEach((s) => {
      const court = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 0.3, dep * 0.11),
        new THREE.MeshStandardMaterial({ map: fieldTexture("tennis"), roughness: 1 })
      );
      court.rotation.x = -Math.PI / 2;
      court.position.set(p.cx + s * w * 0.2, 0.12, p.z0 + dep * 0.44);
      this.environmentGroup.add(court);
    });

    // ── Brick-and-concrete park walkways ─────────────────────────────
    const PATH_W = 7.5;
    const brickTex = brickPathTexture(isDark);
    const brickNrm = normalFromCanvas(brickTex.userData.canvas, 1.5);
    const pathMat = new THREE.MeshStandardMaterial({
      map: brickTex,
      normalMap: brickNrm,
      normalScale: new THREE.Vector2(0.85, 0.85),
      color: this.atmo.brickPathTint,
      roughness: 0.97,
      metalness: 0,
    });

    // Build the meandering spine as overlapping quads that follow the curve,
    // each rotated to face along the path so bricks never shear across a bend.
    const pathPts = [];
    const SEG = 46;
    for (let i = 0; i <= SEG; i++) {
      const t = i / SEG;
      pathPts.push(
        new THREE.Vector2(p.cx + Math.sin(t * Math.PI * 3) * w * 0.28, p.z0 + t * dep)
      );
    }
    const pathGeos = [];
    for (let i = 0; i < pathPts.length - 1; i++) {
      const a = pathPts[i];
      const b = pathPts[i + 1];
      const dx = b.x - a.x;
      const dz = b.y - a.y;
      const len = Math.hypot(dx, dz) + 1.4; // overlap so joints never gap
      const g = new THREE.PlaneGeometry(PATH_W, len);
      scaleUV(g, PATH_W / 7.5, len / 7.5);
      g.rotateX(-Math.PI / 2);
      g.rotateY(-Math.atan2(dx, dz));
      g.translate((a.x + b.x) / 2, 0.11, (a.y + b.y) / 2);
      pathGeos.push(g);
    }
    // a cross-path east–west so the park reads as a real network
    for (let i = 0; i < 14; i++) {
      const zc = p.z0 + dep * 0.5;
      const xc = p.x0 + 4 + (i / 13) * (w - 8);
      const g = new THREE.PlaneGeometry((w - 8) / 14 + 1.2, PATH_W * 0.8);
      scaleUV(g, ((w - 8) / 14) / 7.5, (PATH_W * 0.8) / 7.5);
      g.rotateX(-Math.PI / 2);
      g.translate(xc, 0.11, zc);
      pathGeos.push(g);
    }
    if (pathGeos.length) {
      const pathMesh = new THREE.Mesh(mergeSimple(pathGeos), pathMat);
      pathMesh.receiveShadow = true;
      this.environmentGroup.add(pathMesh);
    }

    // ── Lamp posts ON the walkway itself ─────────────────────────────
    // Set just clear of the brick edge, alternating sides, following the same
    // curve as the path so the spine reads as a real lit promenade at night
    // and as proper street furniture by day.
    for (let i = 2; i < pathPts.length - 1; i += 3) {
      const a = pathPts[i];
      const b2 = pathPts[i + 1];
      const dx = b2.x - a.x;
      const dz = b2.y - a.y;
      const L = Math.hypot(dx, dz) || 1;
      // unit normal to the path direction
      const nx = -dz / L;
      const nz = dx / L;
      const side = i % 6 === 2 ? 1 : -1;
      const off = PATH_W / 2 + 1.6;
      this.makeVictorianLamp(a.x + nx * off * side, a.y + nz * off * side, {
        yaw: -Math.atan2(dx, dz),
      });
    }
    // …and down both kerbs of the east–west cross path.
    {
      const zc = p.z0 + dep * 0.5;
      for (let i = 0; i <= 12; i += 2) {
        const xc = p.x0 + 6 + (i / 12) * (w - 12);
        [-1, 1].forEach((sdir) => {
          this.makeVictorianLamp(xc, zc + sdir * (PATH_W * 0.4 + 1.8), { yaw: Math.PI / 2 });
        });
      }
    }
    // Benches + bins along the spine so the walk isn't just lamps.
    for (let i = 4; i < pathPts.length - 2; i += 7) {
      const a = pathPts[i];
      const b2 = pathPts[i + 1];
      const dx = b2.x - a.x;
      const dz = b2.y - a.y;
      const L = Math.hypot(dx, dz) || 1;
      const nx = -dz / L;
      const nz = dx / L;
      const side = i % 14 === 4 ? -1 : 1;
      const off = PATH_W / 2 + 2.2;
      this.addParkBench(a.x + nx * off * side, a.y + nz * off * side, -Math.atan2(dx, dz) + (side > 0 ? Math.PI : 0));
    }

    // reservoir pond
    const pond = new Water(new THREE.PlaneGeometry(w * 0.5, dep * 0.16), {
      textureWidth: 256, textureHeight: 256,
      waterNormals: this.makeWaterNormals(),
      sunDirection: this.sunVec.clone(),
      sunColor: isDark ? 0x7f95bd : 0x9db2c2,
      waterColor: isDark ? 0x0c2436 : 0x246f8c,
      distortionScale: 1.8,
      fog: true,
    });
    pond.rotation.x = -Math.PI / 2;
    pond.position.set(p.cx, 0.4, p.z1 - dep * 0.2);
    this.waters.push(pond);
    this.environmentGroup.add(pond);
  }

  // ── East coastline: ocean, beach, marina, lighthouse ─────────────────
  buildCoastline() {
    const isDark = this.theme === "dark";
    const o = ocean();

    const sea = new Water(new THREE.PlaneGeometry(o.w * 2.2, o.depthSpan), {
      textureWidth: 512, textureHeight: 512,
      waterNormals: this.makeWaterNormals(),
      sunDirection: this.sunVec.clone(),
      sunColor: isDark ? 0x8098c0 : 0x9fb4c4,
      waterColor: isDark ? 0x06202f : 0x0d6b8a,
      distortionScale: 2.0,
      fog: true,
    });
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(o.x, -0.4, 0);
    this.waters.push(sea);
    this.environmentGroup.add(sea);

    // sandy beach strip
    const sand = sandTexture();
    sand.repeat.set(5, 74);
    const sandNrm = normalFromCanvas(sand.userData.canvas, 1.3);
    sandNrm.repeat.copy(sand.repeat);
    const beach = new THREE.Mesh(
      new THREE.PlaneGeometry(GRID.SHORE_MARGIN + 24, o.depthSpan * 0.8),
      new THREE.MeshStandardMaterial({ map: sand, normalMap: sandNrm, normalScale: new THREE.Vector2(0.85, 0.85), color: isDark ? 0x8a7f63 : 0xe9d3a3, roughness: 0.95 })
    );
    beach.rotation.x = -Math.PI / 2;
    beach.position.set(o.shoreX - 6, 0.02, 0);
    beach.receiveShadow = true;
    this.environmentGroup.add(beach);

    // promenade wall
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(4, 5, o.depthSpan * 0.8),
      new THREE.MeshStandardMaterial({ color: isDark ? 0x2a2d33 : 0x9a9284, roughness: 0.9 })
    );
    wall.position.set(o.shoreX - GRID.SHORE_MARGIN * 0.5, 1.4, 0);
    wall.receiveShadow = true;
    this.environmentGroup.add(wall);

    // marina piers + moored small craft (jetskis, dinghies, sailboats)
    const pierMat = new THREE.MeshStandardMaterial({ color: isDark ? 0x3a3128 : 0xb39a76, roughness: 0.9 });
    const b = worldBounds();
    const moorKinds = ["jetski", "boat", "sailboat", "boat", "jetski"];
    for (let i = 0; i < 5; i++) {
      const pz = -b.halfD * 0.62 + i * (b.halfD * 0.31);
      const pier = new THREE.Mesh(new THREE.BoxGeometry(130, 3, 9), pierMat);
      pier.position.set(o.shoreX + 68, 1.1, pz);
      pier.castShadow = true;
      pier.receiveShadow = true;
      this.environmentGroup.add(pier);
      // pilings
      for (let px = -55; px <= 55; px += 22) {
        const pile = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 6, 6), pierMat);
        pile.position.set(o.shoreX + 68 + px, -1, pz + 5.5);
        this.environmentGroup.add(pile);
      }
      for (let k = 0; k < 4; k++) {
        const v = makeVessel(i * 31 + k * 7 + 1, moorKinds[(i + k) % moorKinds.length]);
        v.position.set(o.shoreX + 26 + k * 30, 0, pz + (k % 2 ? 11 : -11));
        v.rotation.y = Math.PI / 2 + (k % 2 ? 0.08 : -0.08);
        this.environmentGroup.add(v);
      }
    }

    // jetty + lighthouse
    const jetty = new THREE.Mesh(new THREE.BoxGeometry(150, 4, 20), pierMat);
    jetty.position.set(o.shoreX + 90, 1.5, b.halfD * 0.85);
    jetty.rotation.y = 0.2;
    jetty.castShadow = true;
    this.environmentGroup.add(jetty);
    const lhBase = new THREE.Mesh(
      new THREE.CylinderGeometry(6, 9, 34, 18),
      new THREE.MeshStandardMaterial({ color: 0xf3f3f3, roughness: 0.5 })
    );
    lhBase.position.set(o.shoreX + 150, 17, b.halfD * 0.9);
    lhBase.castShadow = true;
    this.environmentGroup.add(lhBase);
    const lhLamp = new THREE.Mesh(
      new THREE.CylinderGeometry(4, 4, 7, 16),
      new THREE.MeshStandardMaterial({ color: 0xf5b73b, emissive: 0xffb733, emissiveIntensity: 2.4 })
    );
    lhLamp.position.set(o.shoreX + 150, 37, b.halfD * 0.9);
    lhLamp.userData.bloom = true;
    this.environmentGroup.add(lhLamp);

    // traffic on the water: big ships far out, yachts & sailboats mid-water
    const lanes = [
      { kind: "ship", xoff: o.w * 0.42, n: 3, speed: 0.55 },
      { kind: "ship", xoff: o.w * 0.24, n: 2, speed: 0.4 },
      { kind: "yacht", xoff: 120, n: 4, speed: 0.7 },
      { kind: "sailboat", xoff: 62, n: 4, speed: 0.45 },
    ];
    lanes.forEach((lane, li) => {
      for (let m = 0; m < lane.n; m++) {
        const v = makeVessel(li * 97 + m * 13 + 7, lane.kind);
        const dir = (li + m) % 2 === 0 ? 1 : -1;
        v.position.set(o.shoreX + lane.xoff + (m % 2) * 26, 0, -o.depthSpan / 2 + m * (o.depthSpan / lane.n));
        v.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        v.userData = {
          speed: (lane.speed + Math.random() * 0.2) * dir,
          min: -o.depthSpan / 2,
          max: o.depthSpan / 2,
        };
        this.movingBoats.push(v);
        this.environmentGroup.add(v);
      }
    });
  }

  // ── West greenbelt: hills + river + bridges ──────────────────────────
  buildGreenbelt() {
    const isDark = this.theme === "dark";
    const gb = greenbelt();
    const b = worldBounds();

    const gTex = grassTexture(isDark, false);
    gTex.repeat.set(26, 90);
    const gNrm = grassNormal(gTex);
    gNrm.repeat.copy(gTex.repeat);
    const belt = new THREE.Mesh(
      new THREE.PlaneGeometry(gb.w + 400, gb.span + 400),
      new THREE.MeshStandardMaterial({ map: gTex, normalMap: gNrm, normalScale: new THREE.Vector2(0.55, 0.55), color: isDark ? 0x8a9b86 : 0xecf2e6, roughness: 0.96 })
    );
    belt.rotation.x = -Math.PI / 2;
    belt.position.set(gb.x - 180, -0.1, 0);
    belt.receiveShadow = true;
    this.environmentGroup.add(belt);

    // rolling hills
    const hillMat = new THREE.MeshStandardMaterial({ color: isDark ? 0x21402a : 0x4a7734, roughness: 1, flatShading: true });
    for (let i = 0; i < 9; i++) {
      const hz = -b.halfD + i * (b.cityD / 8);
      const hill = new THREE.Mesh(
        new THREE.SphereGeometry(70 + hash2(i, 3) * 70, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        hillMat
      );
      hill.scale.set(1, 0.4 + hash2(i, 7) * 0.4, 1);
      hill.position.set(gb.x - 120 - hash2(i, 1) * 120, -2, hz);
      hill.castShadow = true;
      hill.receiveShadow = true;
      this.environmentGroup.add(hill);
    }

    // winding river between belt and city
    const river = new Water(new THREE.PlaneGeometry(46, gb.span), {
      textureWidth: 256, textureHeight: 256,
      waterNormals: this.makeWaterNormals(),
      sunDirection: this.sunVec.clone(),
      sunColor: isDark ? 0x7f95bd : 0x9db2c2,
      waterColor: isDark ? 0x0a2233 : 0x226e88,
      distortionScale: 2.4,
      fog: true,
    });
    river.rotation.x = -Math.PI / 2;
    river.rotation.z = 0.05;
    river.position.set(gb.edgeX + 8, -0.5, 0);
    this.waters.push(river);
    this.environmentGroup.add(river);

    // arched bridges
    const deckMat = new THREE.MeshStandardMaterial({ color: isDark ? 0x3a3f47 : 0xa39a88, roughness: 0.8 });
    [-b.halfD * 0.5, 0, b.halfD * 0.55].forEach((z) => {
      const deck = new THREE.Mesh(new THREE.BoxGeometry(90, 3, 12), deckMat);
      deck.position.set(gb.edgeX + 8, 5, z);
      deck.castShadow = true;
      this.environmentGroup.add(deck);
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(20, 2.5, 8, 16, Math.PI),
        deckMat
      );
      arch.rotation.y = Math.PI / 2;
      arch.position.set(gb.edgeX + 8, 4, z);
      this.environmentGroup.add(arch);
    });
  }

  // ── Filler city: per-block archetypes ────────────────────────────────
  makeFacadeTex(kind, emissive) {
    const S = 512;
    const cv = document.createElement("canvas");
    cv.width = cv.height = S;
    const ctx = cv.getContext("2d");
    const isDark = this.theme === "dark";

    // wall base
    ctx.fillStyle = emissive ? "#000" : isDark ? "#2b3038" : "#bdb9b0";
    ctx.fillRect(0, 0, S, S);

    const cols = kind === "house" ? 5 : 9;
    const rows = kind === "house" ? 5 : 11;
    const cw = S / cols;
    const ch = S / rows;
    const pad = kind === "house" ? cw * 0.26 : cw * 0.16;

    if (!emissive) {
      // concrete grain on the wall itself
      for (let i = 0; i < 14000; i++) {
        const v = Math.random() * 30 - 15;
        ctx.fillStyle = `rgba(${140 + v},${138 + v},${134 + v},0.06)`;
        ctx.fillRect(Math.random() * S, Math.random() * S, 1.6, 1.6);
      }
      // horizontal floor slabs - the strongest real-world cue
      ctx.fillStyle = isDark ? "rgba(12,14,18,0.55)" : "rgba(96,92,86,0.4)";
      for (let r = 0; r <= rows; r++) ctx.fillRect(0, r * ch - 1.5, S, 3);
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cw + pad;
        const y = r * ch + pad;
        const w = cw - pad * 2;
        const h = ch - pad * 2;

        if (emissive) {
          if (Math.random() > (kind === "house" ? 0.26 : 0.2)) continue;
          const warm = Math.random();
          ctx.fillStyle = warm > 0.6 ? "#ffd79a" : warm > 0.3 ? "#fff2d4" : "#c3daff";
          ctx.globalAlpha = 0.6 + Math.random() * 0.4;
          ctx.fillRect(x, y, w, h);
          ctx.globalAlpha = 1;
          continue;
        }

        // recessed dark reveal, then the glass, then a sky reflection wedge
        ctx.fillStyle = isDark ? "#14181f" : "#4c545e";
        ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
        const gl = ctx.createLinearGradient(x, y, x + w, y + h);
        if (isDark) {
          gl.addColorStop(0, "#2c3644");
          gl.addColorStop(1, "#151b24");
        } else {
          gl.addColorStop(0, "#9fb6c9");
          gl.addColorStop(0.55, "#6f8496");
          gl.addColorStop(1, "#59707f");
        }
        ctx.fillStyle = gl;
        ctx.fillRect(x, y, w, h);
        // specular streak across the pane
        ctx.fillStyle = isDark ? "rgba(150,180,220,0.10)" : "rgba(255,255,255,0.24)";
        ctx.beginPath();
        ctx.moveTo(x, y + h * 0.62);
        ctx.lineTo(x + w * 0.55, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x, y + h);
        ctx.closePath();
        ctx.fill();
        // vertical mullion
        ctx.fillStyle = isDark ? "rgba(10,12,16,0.7)" : "rgba(70,76,84,0.55)";
        ctx.fillRect(x + w / 2 - 1, y, 2, h);
      }
    }

    const t = finishTex(cv, { srgb: !emissive });
    if (!emissive) t.userData = { canvas: cv };
    return t;
  }

  blockPlan(block, district) {
    const lots = getLots(block);
    const arche = district.archetype;
    const seed = block.bx * 1000 + block.bz;
    const bWeight = hash2(block.bx * 71 + 5, block.bz * 37 + 9); // per-block character
    const distN = Math.hypot(block.cx, block.cz);
    const near = 1 - Math.min(1, distN / (worldBounds().halfD * 1.0));

    // ── Occupancy budget ───────────────────────────────────────────────
    // Every block keeps AT MOST 1–2 pre-built structures. The remaining lots
    // stay genuinely empty so a player can walk up and claim them. Times
    // Square is the one exception - it is meant to feel wall-to-wall dense.
    const isTimesSquare = arche === "timessquare";
    const budget = isTimesSquare
      ? lots.length
      : bWeight > 0.62 ? 2 : bWeight > 0.22 ? 1 : 0;

    // Deterministically pick which lot indices get a building, spread apart so
    // the survivors don't clump in one corner of the block.
    const chosen = new Set();
    if (budget > 0) {
      const stride = Math.max(1, Math.floor(lots.length / budget));
      const start = Math.floor(hash2(seed, 991) * lots.length);
      for (let k = 0; k < budget; k++) chosen.add((start + k * stride) % lots.length);
    }

    return lots.map((lot, i) => {
      const r1 = hash2(seed + i * 7, block.bz * 3 + 11);
      const r2 = hash2(seed + i * 13, block.bx * 5 + 3);
      const fill = isTimesSquare ? r1 > 0.12 : chosen.has(i);

      if (isTimesSquare) {
        return {
          fill,
          kind: "tower",
          h: 120 + r1 * 210,
          wS: 1.05 + r2 * 0.3,
          roof: false,
        };
      }

      if (arche === "downtown") {
        return {
          fill,
          kind: r1 > 0.45 ? "tower" : "midrise",
          h: r1 > 0.45 ? 90 + near * 90 + Math.pow(r1, 1.5) * 170 : 34 + r1 * 40 + near * 26,
          wS: r1 > 0.45 ? 1.15 + r2 * 0.25 : 0.86 + r2 * 0.12,
          roof: false,
        };
      }

      if (arche === "midtown") {
        return {
          fill,
          kind: "midrise",
          h: 22 + r1 * 30 + near * 14,
          wS: 0.9 + r2 * 0.1,
          roof: r2 > 0.82,
        };
      }

      if (arche === "waterfront") {
        return {
          fill,
          kind: "warehouse",
          h: 9 + r1 * 14,
          wS: 0.9 + r2 * 0.08,
          roof: r2 > 0.7,
        };
      }

      // residential - a house or two per block, rest is open yard
      return {
        fill,
        kind: "house",
        h: 7 + r1 * 8 + (r2 > 0.85 ? 6 : 0),
        wS: 0.74 + r2 * 0.14,
        roof: true,
      };
    });
  }


  buildFillerCity() {
    const isDark = this.theme === "dark";
    const cap = Math.min(TOTAL_LOTS, 1500);

    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    const bodyMat = new THREE.MeshStandardMaterial({
      map: (() => { const m = this.makeFacadeTex("mid", false); this._facadeNormal = normalFromCanvas(m.userData.canvas, 1.6); return m; })(),
      normalMap: this._facadeNormal,
      normalScale: new THREE.Vector2(0.55, 0.55),
      emissiveMap: this.makeFacadeTex("mid", true),
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: this.atmo.windowEmissive,
      roughness: 0.52,
      metalness: 0.24,
      envMapIntensity: 1.15,
    });
    this.fillerBody = new THREE.InstancedMesh(geo, bodyMat, cap);
    this.fillerBody.castShadow = true;
    this.fillerBody.receiveShadow = true;
    this.fillerBody.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);

    const roofGeo = new THREE.ConeGeometry(0.72, 0.6, 4);
    roofGeo.rotateY(Math.PI / 4);
    roofGeo.translate(0, 0.3, 0);
    this.fillerRoof = new THREE.InstancedMesh(
      roofGeo,
      new THREE.MeshStandardMaterial({ roughness: 0.85 }),
      cap
    );
    this.fillerRoof.castShadow = true;
    this.fillerRoof.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);

    const bodyPal = {
      tower: isDark ? ["#3d4653", "#33404e", "#46515f"] : ["#9fb3c4", "#8ea2b3", "#aab8c6", "#7f97a9"],
      midrise: isDark ? ["#3a3f49", "#454b57", "#2f343d"] : ["#cdc7ba", "#bda98c", "#c7c2bb", "#b7bcc2"],
      house: isDark ? ["#4a4038", "#3f4a44", "#544a3e", "#3d4650"] : ["#e0c3a0", "#cf9a72", "#b7c8d8", "#e6d3b8", "#c9d3bd"],
      warehouse: isDark ? ["#3c3f45", "#45443e"] : ["#bdb6a8", "#a7a7a0", "#c6bcac"],
    };
    const roofPal = isDark ? ["#241f1c", "#2a2622"] : ["#8a4b38", "#7a4a3f", "#5c6b74", "#6b5847"];
    const flatRoof = new THREE.Color(isDark ? 0x22252b : 0x8b8b84);

    const dummy = new THREE.Object3D();
    const col = new THREE.Color();

    this.fillerSlots = new Array(cap).fill(null);
    this.lotIndexByKey = new Map();
    let idx = 0;

    forEachLot((lot, meta) => {
      if (idx >= cap) return;
      this.lotIndexByKey.set(keyOf(lot), idx);
      const block = getBlock(meta.bx, meta.bz);
      const district = districtForBlock(meta.bx, meta.bz);
      const plan = this.blockPlan(block, district)[meta.lotIndex];

      const w = lot.w * plan.wS;
      const dep = lot.d * plan.wS;
      const h = plan.h;

      if (plan.fill) {
        dummy.position.set(lot.cx, 0, lot.cz);
        dummy.scale.set(w, h, dep);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        this.fillerBody.setMatrixAt(idx, dummy.matrix);
        col.set(bodyPal[plan.kind][(meta.bx + meta.lotIndex) % bodyPal[plan.kind].length]);
        this.fillerBody.setColorAt(idx, col);

        if (plan.roof) {
          dummy.position.set(lot.cx, h, lot.cz);
          dummy.scale.set(w * 1.15, Math.min(w, dep) * 0.5, dep * 1.15);
          dummy.updateMatrix();
          this.fillerRoof.setMatrixAt(idx, dummy.matrix);
          this.fillerRoof.setColorAt(idx, col.set(roofPal[(meta.bx + meta.bz) % roofPal.length]));
        } else {
          dummy.position.set(lot.cx, h - 0.4, lot.cz);
          dummy.scale.set(w * 1.02, 0.8, dep * 1.02);
          dummy.updateMatrix();
          this.fillerRoof.setMatrixAt(idx, dummy.matrix);
          this.fillerRoof.setColorAt(idx, flatRoof);
        }
      } else {
        hideInstance(this.fillerBody, idx, dummy);
        hideInstance(this.fillerRoof, idx, dummy);
      }

      this.fillerSlots[idx] = { lot, meta, w, dep, h, plan };
      idx++;
    });

    this.fillerBody.count = idx;
    this.fillerRoof.count = idx;
    this.fillerBody.instanceMatrix.needsUpdate = true;
    this.fillerRoof.instanceMatrix.needsUpdate = true;
    if (this.fillerBody.instanceColor) this.fillerBody.instanceColor.needsUpdate = true;
    if (this.fillerRoof.instanceColor) this.fillerRoof.instanceColor.needsUpdate = true;
    this.fillerHidden = new Set();
    this.fillerGroup.add(this.fillerBody, this.fillerRoof);
  }

  /**
   * The pre-built (non-brand) building standing on the lot nearest (x, z), if
   * any. Every existing structure has a FIXED asking price derived from its
   * size - walk up to one and you can simply buy it outright.
   */
  getPrebuiltAt(x, z, radius = 12) {
    if (!this.fillerSlots) return null;
    let best = null;
    let bestD = radius;
    for (let i = 0; i < this.fillerSlots.length; i++) {
      const sl = this.fillerSlots[i];
      if (!sl || !sl.plan?.fill) continue;
      if (sl.reserved) continue; // a station or other landmark stands here
      if (this.fillerHidden?.has(i)) continue; // a brand tower replaced it
      const d = Math.hypot(sl.lot.cx - x, sl.lot.cz - z);
      if (d < bestD) {
        bestD = d;
        best = { slotIndex: i, slot: sl, distance: d };
      }
    }
    if (!best) return null;

    const info0 = lotAt(best.slot.lot.cx, best.slot.lot.cz);

    // Times Square towers are NOT stock. The square sells advertising, not
    // real estate: its buildings stay permanently owned by the city and the
    // only thing on the market there is the signage bolted to them.
    if (info0?.district?.archetype === "timessquare") return null;

    const floors = Math.max(1, Math.round(best.slot.h / FLOOR_HEIGHT));

    // Fixed ask by tier: ordinary blocks → $2 … $10.
    const t = Math.max(0, Math.min(1, (floors - 3) / 45));
    const priceUSD = Math.round(SMALL_PRICE_MIN + t * (SMALL_PRICE_MAX - SMALL_PRICE_MIN));

    const info = info0;
    return {
      ...best,
      floors,
      priceUSD,
      priceINR: Math.round(priceUSD * INR_PER_USD),
      kind: best.slot.plan.kind,
      worldX: best.slot.lot.cx,
      worldZ: best.slot.lot.cz,
      plotNumber: info?.plotNumber || "PLOT-????",
      district: info?.district,
    };
  }

  /**
   * Hide any pre-built stock standing within `radius` of a point, and take it
   * off the market. Used when an authored landmark (a station headhouse) is
   * dropped onto a block the procedural filler had already built on.
   */
  clearLotsNear(x, z, radius = 20) {
    if (!this.fillerSlots) return;
    for (let i = 0; i < this.fillerSlots.length; i++) {
      const sl = this.fillerSlots[i];
      if (!sl || !sl.plan?.fill) continue;
      if (Math.hypot(sl.lot.cx - x, sl.lot.cz - z) > radius) continue;
      this.setFillerVisible(i, false);
      this.fillerHidden?.add(i);
      sl.reserved = true; // never offered for sale again
    }
    this._solids = null;
  }

  setFillerVisible(slotIndex, visible) {
    const s = this.fillerSlots?.[slotIndex];
    if (!s || !this.fillerBody) return;
    const dummy = new THREE.Object3D();
    if (visible && s.plan.fill) {
      dummy.position.set(s.lot.cx, 0, s.lot.cz);
      dummy.scale.set(s.w, s.h, s.dep);
      dummy.updateMatrix();
      this.fillerBody.setMatrixAt(slotIndex, dummy.matrix);
      dummy.position.set(s.lot.cx, s.plan.roof ? s.h : s.h - 0.4, s.lot.cz);
      dummy.scale.set(s.w * 1.1, s.plan.roof ? Math.min(s.w, s.dep) * 0.5 : 0.8, s.dep * 1.1);
      dummy.updateMatrix();
      this.fillerRoof.setMatrixAt(slotIndex, dummy.matrix);
    } else {
      hideInstance(this.fillerBody, slotIndex, dummy);
      hideInstance(this.fillerRoof, slotIndex, dummy);
    }
    this.fillerBody.instanceMatrix.needsUpdate = true;
    this.fillerRoof.instanceMatrix.needsUpdate = true;
  }

  // ── Trees, streetlights, crowds ──────────────────────────────────────
  buildTreesAndProps() {
    const b = worldBounds();
    const p = parkRect();
    const gb = greenbelt();
    const treePos = [];

    // dense park canopy (kept clear of the sports fields near z0)
    for (let i = 0; i < 220; i++) {
      const x = p.x0 + Math.random() * (p.x1 - p.x0);
      const z = p.z0 + Math.random() * (p.z1 - p.z0);
      if (z < p.z0 + (p.z1 - p.z0) * 0.5 && Math.abs(x - p.cx) < (p.x1 - p.x0) * 0.4) continue;
      treePos.push([x, z]);
    }
    // avenue rows
    const av = avenues();
    const st = streets();
    for (let a = 1; a < av.length - 1; a++) {
      for (let s = 1; s < st.length - 1; s++) {
        if (hash2(a * 3, s * 5) > 0.62) continue;
        const side = hash2(a, s) > 0.5 ? 1 : -1;
        treePos.push([av[a].x + side * (GRID.ROAD_W_AVENUE / 2 + 4), st[s].z + 8]);
      }
    }
    // greenbelt scatter
    for (let i = 0; i < 160; i++) {
      treePos.push([gb.x - 60 - Math.random() * 200, -b.halfD + Math.random() * b.cityD]);
    }
    this.environmentGroup.add((makeTreeField(treePos)));

    // streetlights at major intersections
    if (!this.propColliders) this.propColliders = [];
    intersections().forEach(([x, z, major]) => {
      if (!major) return;
      const px = x + GRID.ROAD_W_AVENUE / 2 + 2;
      const pz = z + GRID.ROAD_W_STREET / 2 + 2;
      const sl = makeStreetlight();
      sl.position.set(px, 0, pz);
      sl.traverse((o) => { if (o.userData.bloom) o.layers.enable(1); });
      this.environmentGroup.add((sl));
      this.propColliders.push({ cx: px, cz: pz, hw: 0.32, hd: 0.32, h: 8, prop: true });
    });
    // tree trunks are solid too
    treePos.forEach(([x, z]) => {
      this.propColliders.push({ cx: x, cz: z, hw: 0.45, hd: 0.45, h: 5, prop: true });
    });
    if (this.fountainCollider) this.propColliders.push(this.fountainCollider);
    // NPC crowds are the single heaviest thing in the world, so they are the
    // last chunk of the deferred build queue rather than part of this pass.
  }

  // ── Traffic (strictly on drivable road segments, instanced fleet) ────
  buildTraffic() {
    const segs = this._roadSegs || roadSegments();
    const specs = [];
    this.trafficCars = []; // logical state only - geometry is the instanced fleet

    let seed = 3;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const MAX_CARS = 300; // dense enough that every avenue has moving traffic
    // Times Square is the busiest crossroads in the city - anything running
    // through (or alongside) the square carries roughly triple the traffic of
    // an ordinary block.
    const ts = timesSquareRect();
    const TS_PAD = 170;
    const nearTimesSquare = (seg, axis) =>
      axis === "z"
        ? seg.x > ts.x0 - TS_PAD && seg.x < ts.x1 + TS_PAD &&
          seg.z1 > ts.z0 - TS_PAD && seg.z0 < ts.z1 + TS_PAD
        : seg.z > ts.z0 - TS_PAD && seg.z < ts.z1 + TS_PAD &&
          seg.x1 > ts.x0 - TS_PAD && seg.x0 < ts.x1 + TS_PAD;

    const seeded = new Set();
    const spawn = (seg, axis) => {
      if (specs.length >= MAX_CARS) return;
      if (seeded.has(seg)) return; // the Times Square pass already filled it
      seeded.add(seg);
      const len = axis === "z" ? seg.z1 - seg.z0 : seg.x1 - seg.x0;
      if (len < 55) return;
      const busy = nearTimesSquare(seg, axis);
      const nCars = busy
        ? Math.min(16, 3 + Math.floor(len / 42))
        : Math.min(6, 1 + Math.floor(len / 110));
      for (let n = 0; n < nCars; n++) {
        if (specs.length >= MAX_CARS) return;
        const i = specs.length;
        const bus = i % 13 === 0;
        const carLen = bus ? 13 : 5.4 + rnd() * 1.4;
        const carWid = bus ? 3 : 2.5;
        // Around Times Square most of the traffic is cabs - it is a big part
        // of why the real crossroads reads yellow from above.
        const cab = !bus && busy && rnd() < 0.72;
        const colorHex = bus
          ? 0xf2b134
          : cab
            ? 0xf7c948
            : carColors[Math.floor(rnd() * carColors.length)];
        specs.push({ len: carLen, wid: carWid, bus, colorHex });

        const dir = (i + n) % 2 === 0 ? 1 : -1;
        const laneOff = dir > 0 ? -1 : 1;
        const speed = (bus ? 0.4 : 0.7) + rnd() * 0.6;
        if (axis === "z") {
          this.trafficCars.push({
            axis: "z", dir, speed,
            baseSpeed: speed,
            currentSpeed: speed,
            x: seg.x + laneOff * (GRID.ROAD_W_AVENUE / 4),
            z: seg.z0 + ((n + 0.5) / nCars) * len + (rnd() - 0.5) * (len / nCars) * 0.55,
            rotY: dir > 0 ? 0 : Math.PI,
            min: seg.z0 + 4, max: seg.z1 - 4,
          });
        } else {
          this.trafficCars.push({
            axis: "x", dir, speed,
            baseSpeed: speed,
            currentSpeed: speed,
            x: seg.x0 + ((n + 0.5) / nCars) * len + (rnd() - 0.5) * (len / nCars) * 0.55,
            z: seg.z + laneOff * (GRID.ROAD_W_STREET / 4),
            rotY: dir > 0 ? Math.PI / 2 : -Math.PI / 2,
            min: seg.x0 + 4, max: seg.x1 - 4,
          });
        }
      }
    };
    // Fill the square's approaches before the rest of the grid so the busiest
    // roads are never starved by the global car cap.
    segs.avenues.filter((s) => nearTimesSquare(s, "z")).forEach((s) => spawn(s, "z"));
    segs.streets.filter((s) => nearTimesSquare(s, "x")).forEach((s) => spawn(s, "x"));
    segs.avenues.forEach((s) => spawn(s, "z"));
    segs.streets.forEach((s) => spawn(s, "x"));

    this.fleet = createTrafficFleet(specs);
    this.trafficCars.forEach((c, i) => this.fleet.setCar(i, c.x, c.z, c.rotY));
    this.fleet.flush();
    this.environmentGroup.add((this.fleet.group));
  }

  // ── Data-driven towers ───────────────────────────────────────────────
  syncProducts(products = []) {
    this.products = products || [];
    this._solids = null;
    this._crownTower = null;

    while (this.brandTowersGroup.children.length) {
      const c = this.brandTowersGroup.children[0];
      this.brandTowersGroup.remove(c);
      disposeGroup(c);
    }
    this.fillerHidden?.forEach((i) => this.setFillerVisible(i, true));
    this.fillerHidden = new Set();

    if (!this.products.length) return;

    const sorted = [...this.products].sort((a, c) => (c.currentAmount || 0) - (a.currentAmount || 0));
    const top1 = sorted[0]?.currentAmount || 1;
    this.districtTotals = {};
    const placed = new Set();
    const nHeroes = DISTRICT_META.length;
    // how tall the runner-up will be - the #1 is kept clearly above it
    const runnerUpFloors = sorted[1]
      ? Math.max(MIN_BRAND_FLOORS, floorsForAmountINR(sorted[1].currentAmount || 0))
      : 0;

    if (!this.allocatedPlots) {
      this.allocatedPlots = loadAllocatedPlots();
    }

    sorted.forEach((product, i) => {
      const rank = product.rank || product.allTimeRank || i + 1;
      const amount = product.currentAmount || 0;
      const weight = Math.max(0.02, Math.min(1, amount / top1));

      // Stable plot allocation: A brand's physical plot never moves once assigned!
      const urlKey = String(product.normalizedUrl || product.websiteUrl || "").toLowerCase();
      const prodKey = String(product.id || urlKey).toLowerCase();
      let place = null;

      // 1) Plot explicitly acquired by owner
      const claim = (urlKey && this.claimedPlots[urlKey]) || (prodKey && this.claimedPlots[prodKey]);
      if (claim) {
        const info = lotAt(claim[0], claim[1]);
        if (info && !placed.has(keyOf(info.lot))) place = { lot: info.lot, bx: info.bx, bz: info.bz };
      }

      // 2) Saved plot coordinates from product database record
      if (!place && product.plotLng != null && product.plotLat != null) {
        const info = lotAt(product.plotLng, product.plotLat);
        if (info && !placed.has(keyOf(info.lot))) place = { lot: info.lot, bx: info.bx, bz: info.bz };
      }

      // 3) Previously allocated permanent plot for this brand
      const alloc = (prodKey && this.allocatedPlots[prodKey]) || (urlKey && this.allocatedPlots[urlKey]);
      if (!place && alloc) {
        const info = lotAt(alloc[0], alloc[1]);
        if (info && !placed.has(keyOf(info.lot))) place = { lot: info.lot, bx: info.bx, bz: info.bz };
      }

      // 4) New brand: allocate next stable lot in city and permanently lock it
      if (!place) {
        let k = i;
        do {
          place = lotForRank(k);
          k++;
        } while (placed.has(keyOf(place.lot)) && k < i + 80);

        if (place && place.lot) {
          if (prodKey) this.allocatedPlots[prodKey] = [place.lot.cx, place.lot.cz];
          if (urlKey) this.allocatedPlots[urlKey] = [place.lot.cx, place.lot.cz];
          saveAllocatedPlots(this.allocatedPlots);
        }
      }
      const { lot, bx, bz } = place;
      const key = keyOf(lot);
      placed.add(key);

      const dist = districtForBlock(bx, bz);
      this.districtTotals[dist.id] = (this.districtTotals[dist.id] || 0) + amount;

      const slotIndex = this.lotIndexByKey?.get(key);
      if (slotIndex != null) {
        this.setFillerVisible(slotIndex, false);
        this.fillerHidden.add(slotIndex);
      }

      const tier = rank === 1 ? "crown" : rank <= 3 ? "top3" : rank <= 10 ? "top10" : "standard";
      const lotMin = Math.min(lot.w, lot.d);
      const footprint = lotMin * (0.66 + weight * 0.24) * (rank === 1 ? 1.22 : 1);

      // Height is bid-driven: $5 = 1 floor. Every paid plot reflects its
      // true absolute floor level without artificial height inflation.
      const floors = Math.max(MIN_BRAND_FLOORS, floorsForAmountINR(amount));
      const height = floors * FLOOR_HEIGHT;

      const tower = makeTower({
        w: footprint,
        d: footprint,
        h: height,
        floors,
        tier,
        accentHex: new THREE.Color(dist.color).getHex(),
        seed: (product.id || rank) * 2654435761,
        isBrandTower: true,
      });
      tower.position.set(lot.cx, 0, lot.cz);
      tower.name = `brand-landmark-${product.id}`;

      // Attach street-level Brand Ownership Board in front of the building entrance
      const board = makeBrandOwnershipBoard({
        product,
        rank,
        amount,
        distColor: dist.color,
        w: footprint,
        d: footprint,
      });
      tower.add(board);

      // Attach Flat Brand Logo Roof directly on top of the building (matching reference design)
      const topRoofW = (rank === 1 && tower.userData?.topW) ? tower.userData.topW : footprint;
      const topRoofD = (rank === 1 && tower.userData?.topD) ? tower.userData.topD : footprint;
      const brandRoof = makeBrandRoofMesh({
        product,
        rank,
        color: dist.color,
        w: topRoofW,
        d: topRoofD,
        height,
      });
      tower.add(brandRoof);

      tower.userData = {
        product, rank, amount, floors,
        district: dist.name,
        districtId: dist.id,
        color: dist.color,
        colorHex: new THREE.Color(dist.color).getHex(),
        height: tower.userData.totalHeight || height,
        width: footprint,
        position: new THREE.Vector3(lot.cx, height, lot.cz),
        brandRoof,
      };
      // ── Giant billboard mounted FLAT ON the tower's wall ─────────────
      // Sized to the facade, repeated on all four faces so the owner is
      // identifiable from any approach - this is the ownership proof.
      const isCrown = rank === 1;
      const panelW = footprint * (isCrown ? 0.92 : 0.86);
      const panelH = isCrown
        ? Math.min(panelW * 0.72, height * 0.44)
        : Math.min(panelW * 0.62, height * 0.38);
      if (panelH > 2.5 && height >= 8) {
        const panelY = Math.max(panelH / 2 + 1.2, height * 0.50);
        const wallOffset = isCrown ? 0.45 : 0.3;
        const faces = [
          { rot: 0, dx: 0, dz: footprint / 2 + wallOffset },
          { rot: Math.PI, dx: 0, dz: -footprint / 2 - wallOffset },
          { rot: Math.PI / 2, dx: footprint / 2 + wallOffset, dz: 0 },
          { rot: -Math.PI / 2, dx: -footprint / 2 - wallOffset, dz: 0 },
        ];
        tower.userData.facadePanels = [];
        faces.forEach((f) => {
          const fb = makeFacadeBillboard({
            w: panelW,
            h: panelH,
            product,
            rank,
            amountText: formatMoneyShort(amount),
            color: dist.color,
          });
          fb.group.position.set(f.dx, panelY, f.dz);
          fb.group.rotation.y = f.rot;
          tower.add(fb.group);
          tower.userData.facadePanels.push(fb);
        });
      }

      tower.traverse((o) => { if (o.isMesh && o.userData.bloom) o.layers.enable(1); });
      this.brandTowersGroup.add(tower);
      if (rank === 1) this._crownTower = tower;
    });

    // Populate City-Wide Digital LED Billboards & Mega-Screens
    while (this.brandBillboardsGroup.children.length) {
      const c = this.brandBillboardsGroup.children[0];
      this.brandBillboardsGroup.remove(c);
      disposeGroup(c);
    }
    CITY_BILLBOARD_LOCATIONS.forEach((bbDef) => {
      const dbRecord = this.billboardRecords?.find(
        (b) => b.billboardNumber === bbDef.billboardNumber || b.code === bbDef.id
      );
      const claimedLocal = this.claimedBillboards?.[bbDef.id];

      const isOccupied = Boolean(
        (dbRecord && (dbRecord.isOccupied || dbRecord.paymentStatus === "PAID")) ||
        (claimedLocal && claimedLocal.isClaimed)
      );

      let prod = null;
      if (isOccupied) {
        prod = {
          id: dbRecord?.id || claimedLocal?.id || `bb_${bbDef.billboardNumber}`,
          websiteName: dbRecord?.brandName || claimedLocal?.websiteName || "Featured Brand Sponsor",
          websiteUrl: dbRecord?.websiteUrl || claimedLocal?.websiteUrl,
          tagline: dbRecord?.tagline || claimedLocal?.tagline,
          description: dbRecord?.description || claimedLocal?.description,
          logoUrl: dbRecord?.logoUrl || claimedLocal?.logoUrl,
          faviconUrl: dbRecord?.faviconUrl || claimedLocal?.faviconUrl,
          categoryName: dbRecord?.categoryName || claimedLocal?.categoryName || "Official Partner",
          color: dbRecord?.color || claimedLocal?.color || "#F05A38",
          isClaimed: true,
          isBought: true,
        };
      }

      const billboard = makeCityBillboard({
        billboardDef: bbDef,
        product: prod,
        billboardRecord: dbRecord,
      });
      billboard.traverse((o) => { if (o.isMesh && o.userData.bloom) o.layers.enable(1); });
      this.brandBillboardsGroup.add(billboard);
    });

    this._syncPlanTowers();
    // Towers/billboards were just torn down and rebuilt - the bloom occluder
    // cache is stale until this fires.
    this.postfx?.invalidate();
  }

  /** Rebuild the heat field after any bid/ownership change. */
  refreshHeatmap() {
    if (this._heatOn) this._buildHeatmap();
  }

  setBillboardRecords(records) {
    if (!Array.isArray(records)) return;
    this.billboardRecords = records;
    this.syncProducts(this.products);
  }

  /** World position of the current #1 landmark (for the intro fly-in). */
  getCrownFocus() {
    const t = this._crownTower;
    if (!t) return null;
    return {
      x: t.position.x,
      z: t.position.z,
      height: t.userData?.height || 60,
      product: t.userData?.product,
      rank: 1,
    };
  }

  // ── Screen projection for HTML overlays ──────────────────────────────
  getProjectedTowerBillboards() {
    if (!this.camera || !this.renderer) return [];
    const w = this.renderer.domElement.clientWidth;
    const h = this.renderer.domElement.clientHeight;
    const out = [];
    this.brandTowersGroup.children.forEach((tower) => {
      const data = tower.userData;
      if (!data || !data.product) return;
      const v = V0.set(tower.position.x, (data.height || 60) + 14, tower.position.z).project(this.camera);
      if (v.z > 1) return;
      out.push({
        id: data.product.id, product: data.product, rank: data.rank, amount: data.amount,
        district: data.district, color: data.color,
        screenX: (v.x * 0.5 + 0.5) * w, screenY: (-(v.y * 0.5) + 0.5) * h,
      });
    });
    return out;
  }

  getProjectedCityBillboards() {
    if (!this.camera || !this.renderer) return [];
    const w = this.renderer.domElement.clientWidth;
    const h = this.renderer.domElement.clientHeight;
    const out = [];
    if (!this.brandBillboardsGroup) return out;
    this.brandBillboardsGroup.children.forEach((bb) => {
      const u = bb.userData;
      if (!u || !u.billboardDef) return;
      const elev = (u.billboardDef.elevation || 8) + (u.billboardDef.height || 7) / 2;
      const v = V0.set(bb.position.x, elev, bb.position.z).project(this.camera);
      if (v.z > 1) return;
      out.push({
        id: u.billboardDef.id,
        billboardNumber: u.billboardNumber,
        name: u.billboardName || u.billboardDef.name,
        fixedCost: u.fixedCost || u.billboardDef.costFormatted,
        costUSD: u.costUSD || u.billboardDef.costUSD,
        isOccupied: Boolean(u.isOccupied),
        brand: u.brand || u.product?.websiteName,
        color: u.color || (u.isOccupied ? "#F05A38" : "#38bdf8"),
        billboardDef: u.billboardDef,
        screenX: (v.x * 0.5 + 0.5) * w,
        screenY: (-(v.y * 0.5) + 0.5) * h,
      });
    });
    return out;
  }

  getProjectedDistrictCards() {
    if (!this.camera || !this.renderer) return [];
    const w = this.renderer.domElement.clientWidth;
    const h = this.renderer.domElement.clientHeight;
    return DISTRICT_META.map((d) => {
      const v = V0.set(d.center[0], 120, d.center[1]).project(this.camera);
      const count = this.brandTowersGroup.children.filter((t) => t.userData?.districtId === d.id).length;
      return {
        id: d.id, name: d.name, color: d.color,
        totalValue: this.districtTotals[d.id] || 0,
        buildingsCount: count,
        screenX: (v.x * 0.5 + 0.5) * w, screenY: (-(v.y * 0.5) + 0.5) * h,
        isVisible: v.z <= 1,
      };
    });
  }

  // ── Interaction ──────────────────────────────────────────────────────
  setupEventListeners() {
    const dom = this.renderer.domElement;
    dom.addEventListener("contextmenu", (e) => e.preventDefault());

    this._onDown = (e) => {
      this.cancelIntro();
      if (this.gameMode) return;
      if (e.button === 0 && !e.ctrlKey) this.isDragging = true;
      else this.isRotating = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
      this._downAt = { x: e.clientX, y: e.clientY };
    };
    this._onMove = (e) => {
      if (this.gameMode) return;
      if (this.isRotating) {
        const dx = e.clientX - this.previousMousePosition.x;
        const dy = e.clientY - this.previousMousePosition.y;
        this.spherical.theta -= dx * 0.005;
        this.spherical.phi = Math.max(0.14, Math.min(Math.PI / 2.05, this.spherical.phi - dy * 0.005));
        this.updateCameraFromSpherical();
      } else if (this.isDragging) {
        const dx = e.clientX - this.previousMousePosition.x;
        const dy = e.clientY - this.previousMousePosition.y;
        const panK = (this.spherical.radius / 1000) * 1.3;
        const fwd = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.spherical.theta);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.spherical.theta);
        this.target.addScaledVector(right, -dx * panK);
        this.target.addScaledVector(fwd, dy * panK);
        this.clampTarget();
        this.updateCameraFromSpherical();
      } else {
        // Evaluate hover highlight when hovering over objects
        this.updateHoverHighlight(e);
      }
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    };
    this._onUp = (e) => {
      if (this.gameMode) return;
      const moved = this._downAt && Math.hypot(e.clientX - this._downAt.x, e.clientY - this._downAt.y) > 5;
      if (!moved && e.button === 0) this.pick(e);
      this.isDragging = false;
      this.isRotating = false;
    };
    this._onWheel = (e) => {
      this.cancelIntro();
      if (this.gameMode) return;
      e.preventDefault();
      const factor = this.spherical.radius > 250 ? 1.1 : 0.45;
      this.spherical.radius = THREE.MathUtils.clamp(this.spherical.radius + e.deltaY * factor, 18, 3800);
      this.updateCameraFromSpherical();
    };

    // ── Touch: one finger orbits, two fingers pinch-zoom + pan ─────────
    this._touch = { mode: null, x: 0, y: 0, dist: 0, movedPx: 0 };
    this._onTouchStart = (e) => {
      this.cancelIntro();
      if (this.gameMode) return;
      if (e.touches.length === 1) {
        this._touch.mode = "orbit";
        this._touch.x = e.touches[0].clientX;
        this._touch.y = e.touches[0].clientY;
        this._touch.movedPx = 0;
        this._touch.startX = e.touches[0].clientX;
        this._touch.startY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        this._touch.mode = "pinch";
        this._touch.dist = touchDist(e.touches);
        const c = touchCenter(e.touches);
        this._touch.x = c.x;
        this._touch.y = c.y;
      }
    };
    this._onTouchMove = (e) => {
      if (this.gameMode || !this._touch.mode) return;
      e.preventDefault();
      if (this._touch.mode === "orbit" && e.touches.length === 1) {
        const dx = e.touches[0].clientX - this._touch.x;
        const dy = e.touches[0].clientY - this._touch.y;
        this._touch.movedPx += Math.abs(dx) + Math.abs(dy);
        this.spherical.theta -= dx * 0.006;
        this.spherical.phi = THREE.MathUtils.clamp(this.spherical.phi - dy * 0.006, 0.14, Math.PI / 2.05);
        this._touch.x = e.touches[0].clientX;
        this._touch.y = e.touches[0].clientY;
        this.updateCameraFromSpherical();
      } else if (this._touch.mode === "pinch" && e.touches.length === 2) {
        const d = touchDist(e.touches);
        const c = touchCenter(e.touches);
        this.spherical.radius = THREE.MathUtils.clamp(
          this.spherical.radius * (this._touch.dist / Math.max(1, d)),
          18,
          3800
        );
        const panK = (this.spherical.radius / 1000) * 1.3;
        const dx = c.x - this._touch.x;
        const dy = c.y - this._touch.y;
        const fwd = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.spherical.theta);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.spherical.theta);
        this.target.addScaledVector(right, -dx * panK);
        this.target.addScaledVector(fwd, dy * panK);
        this.clampTarget();
        this._touch.dist = d;
        this._touch.x = c.x;
        this._touch.y = c.y;
        this.updateCameraFromSpherical();
      }
    };
    this._onTouchEnd = (e) => {
      if (this.gameMode) {
        this._touch.mode = null;
        return;
      }
      // a short, still tap = a pick
      if (this._touch.mode === "orbit" && this._touch.movedPx < 12 && e.changedTouches?.length) {
        const t = e.changedTouches[0];
        this.pick({ clientX: t.clientX, clientY: t.clientY });
      }
      this._touch.mode = null;
    };
    this._onResize = () => {
      if (!this.container || !this.renderer || !this.camera) return;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.postfx?.setSize(w, h);
      this.onProjectUpdate();
    };

    dom.addEventListener("mousedown", this._onDown);
    window.addEventListener("mousemove", this._onMove);
    window.addEventListener("mouseup", this._onUp);
    dom.addEventListener("wheel", this._onWheel, { passive: false });
    dom.addEventListener("touchstart", this._onTouchStart, { passive: true });
    dom.addEventListener("touchmove", this._onTouchMove, { passive: false });
    dom.addEventListener("touchend", this._onTouchEnd, { passive: true });
    dom.addEventListener("touchcancel", this._onTouchEnd, { passive: true });
    window.addEventListener("resize", this._onResize);

    // Entering / leaving the city unmounts the site header, which resizes the
    // container without ever firing a window resize - watch the box directly.
    if (typeof ResizeObserver !== "undefined") {
      this._resizeObs = new ResizeObserver(() => this._onResize());
      this._resizeObs.observe(this.container);
    }
  }

  _setupHoverHighlightSystem() {
    this.hoverHighlightGroup = new THREE.Group();
    this.hoverHighlightGroup.name = "hover-highlight-group";
    this.hoverHighlightGroup.visible = false;

    // 1. 3D Bounding Box Outline
    this.hoverBoxHelper = new THREE.Box3Helper(new THREE.Box3(), new THREE.Color(0x38bdf8));
    this.hoverBoxHelper.material.depthTest = false;
    this.hoverBoxHelper.material.transparent = true;
    this.hoverBoxHelper.material.opacity = 0.95;
    this.hoverHighlightGroup.add(this.hoverBoxHelper);

    // 2. Ground Neon Footprint Ring
    const groundGeo = new THREE.RingGeometry(1, 1.3, 4);
    groundGeo.rotateX(-Math.PI / 2);
    groundGeo.rotateY(Math.PI / 4);
    this.hoverGroundRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
    });
    this.hoverGroundRing = new THREE.Mesh(groundGeo, this.hoverGroundRingMat);
    this.hoverGroundRing.userData.bloom = true;
    this.hoverHighlightGroup.add(this.hoverGroundRing);

    // 3. Overhead Floating Beacon Indicator
    const beaconGeo = new THREE.ConeGeometry(2.2, 4.4, 4);
    beaconGeo.rotateX(Math.PI);
    this.hoverBeaconMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
    });
    this.hoverBeacon = new THREE.Mesh(beaconGeo, this.hoverBeaconMat);
    this.hoverBeacon.userData.bloom = true;
    this.hoverHighlightGroup.add(this.hoverBeacon);

    this.hoverHighlightGroup.traverse((o) => {
      if (o.isMesh) o.layers.enable(1);
    });

    this.scene.add(this.hoverHighlightGroup);
  }

  raycastInteractive(e) {
    if (!this.renderer || !this.camera) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // 1. Raycast against brand towers and building ownership boards.
    // In 2D the towers themselves are not in the scene - the flat map's
    // footprints stand in for them and carry the same userData.
    const towerTargets =
      this.viewMode === "2D" && this.planTowersGroup
        ? this.planTowersGroup.children
        : this.brandTowersGroup.children;
    const hits = this.raycaster.intersectObjects(towerTargets, true);
    if (hits.length) {
      let root = hits[0].object;
      const rootGroup = this.viewMode === "2D" ? this.planTowersGroup : this.brandTowersGroup;
      while (root.parent && root.parent !== rootGroup) root = root.parent;
      if (root.userData?.product) {
        return {
          type: "tower",
          object: root,
          product: root.userData.product,
          position: root.position,
          height: root.userData.height || 60,
          width: root.userData.width || 20,
          color: root.userData.color || "#F05A38",
          colorHex: root.userData.colorHex || 0xf05a38,
        };
      }
    }

    // 2. Raycast against city billboards & digital screens
    if (this.brandBillboardsGroup) {
      const bbHits = this.raycaster.intersectObjects(this.brandBillboardsGroup.children, true);
      if (bbHits.length) {
        let root = bbHits[0].object;
        while (root.parent && root.parent !== this.brandBillboardsGroup) root = root.parent;
        if (root.userData?.billboardDef) {
          return {
            type: "billboard",
            object: root,
            billboardDef: root.userData.billboardDef,
            billboardNumber: root.userData.billboardNumber,
            billboardId: root.userData.billboardId || root.userData.billboardDef.id,
            code: root.userData.code || root.userData.billboardDef.id,
            rateUSD: root.userData.costUSD || root.userData.billboardDef.costUSD,
            product: root.userData.product,
            position: root.position,
            width: root.userData.billboardDef.width || 12,
            height: root.userData.billboardDef.height || 7,
            color: root.userData.color || "#38bdf8",
            colorHex: 0x38bdf8,
          };
        }
      }
    }

    // 2b. Raycast against Times Square wall-mounted screens / billboard panels
    if (this.timesSquareGroup) {
      const tsHits = this.raycaster.intersectObjects(this.timesSquareGroup.children, true);
      const tsScreenHit = tsHits.find((h) => h.object.userData?.isTimesSquareScreen || h.object.userData?.isBillboard);
      if (tsScreenHit) {
        const tsBillboards = this.brandBillboardsGroup?.children.filter(
          (b) => b.userData?.billboardDef?.anchor === "times"
        ) || [];
        let bestBB = tsBillboards[0];
        let minD = Infinity;
        for (const b of tsBillboards) {
          const d = tsScreenHit.point ? b.position.distanceTo(tsScreenHit.point) : 0;
          if (d < minD) {
            minD = d;
            bestBB = b;
          }
        }
        if (bestBB && bestBB.userData?.billboardDef) {
          return {
            type: "billboard",
            object: bestBB,
            billboardDef: bestBB.userData.billboardDef,
            billboardNumber: bestBB.userData.billboardNumber,
            billboardId: bestBB.userData.billboardId || bestBB.userData.billboardDef.id,
            code: bestBB.userData.code || bestBB.userData.billboardDef.id,
            rateUSD: bestBB.userData.costUSD || bestBB.userData.billboardDef.costUSD,
            product: bestBB.userData.product,
            position: bestBB.position,
            width: bestBB.userData.billboardDef.width || 12,
            height: bestBB.userData.billboardDef.height || 7,
            color: "#38bdf8",
            colorHex: 0x38bdf8,
          };
        }
      }
    }

    // 3. Raycast against ground lots / plots
    const pt = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this._groundPlane, pt)) {
      const info = lotAt(pt.x, pt.z);
      if (info && info.district?.archetype !== "timessquare") {
        const existingTower = this.brandTowersGroup.children.find(
          (t) => Math.abs(t.position.x - info.lot.cx) < 2 && Math.abs(t.position.z - info.lot.cz) < 2
        );
        const slotIndex = this.lotIndexByKey?.get(keyOf(info.lot));
        const fillerSlot = slotIndex != null ? this.fillerSlots?.[slotIndex] : null;

        const fixedUSD = getPlotFixedPriceUSD(info.district.id);
        const fixedINR = fixedUSD * 83;

        if (existingTower) {
          return {
            type: "tower",
            object: existingTower,
            product: existingTower.userData.product,
            position: existingTower.position,
            height: existingTower.userData.height || 60,
            width: existingTower.userData.width || 20,
            color: existingTower.userData.color || "#F05A38",
            colorHex: existingTower.userData.colorHex || 0xf05a38,
            plot: {
              plotNumber: info.plotNumber,
              districtId: info.district.id,
              districtName: info.district.name,
              color: info.district.color,
              archetype: info.district.archetype,
              worldX: info.lot.cx,
              worldZ: info.lot.cz,
              lotW: info.lot.w,
              lotD: info.lot.d,
              taken: true,
              fixedPriceUSD: fixedUSD,
              fixedPriceINR: fixedINR,
            },
          };
        }

        return {
          type: "plot",
          plot: {
            plotNumber: info.plotNumber,
            districtId: info.district.id,
            districtName: info.district.name,
            color: info.district.color,
            archetype: info.district.archetype,
            worldX: info.lot.cx,
            worldZ: info.lot.cz,
            lotW: info.lot.w,
            lotD: info.lot.d,
            taken: false,
            fixedPriceUSD: fixedUSD,
            fixedPriceINR: fixedINR,
          },
          height: fillerSlot?.h || 20,
          fillerSlot,
          position: new THREE.Vector3(info.lot.cx, 0.2, info.lot.cz),
          width: info.lot.w,
          color: info.district.color || "#0284c7",
          colorHex: new THREE.Color(info.district.color || "#0284c7").getHex(),
        };
      }
    }

    return null;
  }

  updateHoverHighlight(e) {
    if (this.gameMode || this.isDragging || this.isRotating) {
      if (this.hoverHighlightGroup) this.hoverHighlightGroup.visible = false;
      return;
    }

    const hit = this.raycastInteractive(e);
    if (!hit) {
      if (this.hoverHighlightGroup) this.hoverHighlightGroup.visible = false;
      if (this.container) this.container.style.cursor = "default";
      this.hoveredHit = null;
      return;
    }

    this.hoveredHit = hit;
    if (this.container) this.container.style.cursor = "pointer";
    if (!this.hoverHighlightGroup) return;

    this.hoverHighlightGroup.visible = true;
    const col = hit.colorHex || 0x38bdf8;
    this.hoverBoxHelper.material.color.setHex(col);
    this.hoverGroundRingMat.color.setHex(col);
    this.hoverBeaconMat.color.setHex(col);

    if (hit.type === "tower") {
      this.hoverBoxHelper.visible = true;
      this.hoverBoxHelper.box.setFromObject(hit.object);
      this.hoverGroundRing.position.set(hit.position.x, 0.26, hit.position.z);
      const sz = (hit.width || 20) * 0.72;
      this.hoverGroundRing.scale.set(sz, sz, sz);
      this.hoverBeacon.visible = true;
      this.hoverBeacon.position.set(hit.position.x, (hit.height || 60) + 14, hit.position.z);
    } else if (hit.type === "billboard") {
      this.hoverBoxHelper.visible = true;
      this.hoverBoxHelper.box.setFromObject(hit.object);
      this.hoverGroundRing.position.set(hit.position.x, 0.26, hit.position.z);
      this.hoverGroundRing.scale.set(7, 7, 7);
      this.hoverBeacon.visible = false;
    } else if (hit.type === "plot") {
      this.hoverBoxHelper.visible = true;
      const halfW = (hit.width || 20) / 2;
      const halfD = (hit.plot?.lotD || hit.width || 20) / 2;
      const h = hit.height || 20;
      this.hoverBoxHelper.box.set(
        new THREE.Vector3(hit.position.x - halfW, 0, hit.position.z - halfD),
        new THREE.Vector3(hit.position.x + halfW, h, hit.position.z + halfD)
      );
      this.hoverGroundRing.position.set(hit.position.x, 0.26, hit.position.z);
      const sz = (hit.width || 20) * 0.7;
      this.hoverGroundRing.scale.set(sz, sz, sz);
      this.hoverBeacon.visible = true;
      this.hoverBeacon.position.set(hit.position.x, h + 14, hit.position.z);
    }
  }

  pick(e) {
    const hit = this.raycastInteractive(e);
    if (!hit) return;

    if (hit.type === "tower") {
      this.focusTower(hit.object);
    } else if (hit.type === "billboard") {
      this.focusBillboard(hit.object);
    } else if (hit.type === "plot") {
      this.focusPlot(hit.plot);
    }
  }

  focusPlot(plot) {
    this._panTo(new THREE.Vector3(plot.worldX, 0, plot.worldZ + 30), 460, Math.PI / 3.5);
    this.onSelectPlot(plot);
  }

  /** Project a world XZ to screen px for the plot popup anchor. */
  getProjectedPoint(x, z, y = 6) {
    if (!this.camera || !this.renderer) return null;
    const w = this.renderer.domElement.clientWidth;
    const h = this.renderer.domElement.clientHeight;
    const v = V0.set(x, y, z).project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * w, y: (-(v.y * 0.5) + 0.5) * h, visible: v.z <= 1 };
  }

  /** Animate a newly acquired building rising up from the ground with shockwave & sparks */
  animateBuildingRise(tower, colorHex = 0x6366f1) {
    if (!tower) return;

    // Start with the tower scaled down to ground level
    tower.scale.set(1, 0.001, 1);
    const targetH = tower.userData?.height || 28;

    // 1. Create an expanding glowing ground shockwave ring around the plot foundation
    const ringGeo = new THREE.RingGeometry(1, 4, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const groundShockwave = new THREE.Mesh(ringGeo, ringMat);
    groundShockwave.rotation.x = -Math.PI / 2;
    groundShockwave.position.set(tower.position.x, 0.28, tower.position.z);
    groundShockwave.userData.bloom = true;
    groundShockwave.layers.enable(1);
    this.scene.add(groundShockwave);

    // 2. Create energetic construction spark particles
    const particleCount = 45;
    const pGeo = new THREE.BufferGeometry();
    const posArr = new Float32Array(particleCount * 3);
    const velArr = [];
    for (let i = 0; i < particleCount; i++) {
      posArr[i * 3] = (Math.random() - 0.5) * (tower.userData?.width || 14);
      posArr[i * 3 + 1] = Math.random() * 2;
      posArr[i * 3 + 2] = (Math.random() - 0.5) * (tower.userData?.width || 14);
      velArr.push({
        vx: (Math.random() - 0.5) * 6,
        vy: 12 + Math.random() * 18,
        vz: (Math.random() - 0.5) * 6,
      });
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xffd700,
      size: 1.6,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sparks = new THREE.Points(pGeo, pMat);
    sparks.position.copy(tower.position);
    sparks.userData.bloom = true;
    sparks.layers.enable(1);
    this.scene.add(sparks);

    // 3. Pan camera to frame the rising building up front!
    this.focusTower(tower);

    // 4. Animate the rising skyscraper over 2.2 seconds with smooth cubic ease
    let startTime = null;
    const duration = 2200;

    const step = (now) => {
      if (!startTime) startTime = now;
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Smooth elastic ease-out
      const ease = 1 - Math.pow(1 - progress, 3.2);

      // Vertically grow the building from ground
      tower.scale.y = Math.max(0.001, ease);

      // Animate ground shockwave expansion & fade
      const ringScale = 1 + progress * 7;
      groundShockwave.scale.set(ringScale, ringScale, 1);
      ringMat.opacity = Math.max(0, (1 - progress) * 0.95);

      // Animate particle sparks rising
      const dtSec = 0.016;
      const positions = pGeo.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] += velArr[i].vx * dtSec;
        positions[i * 3 + 1] += velArr[i].vy * dtSec;
        positions[i * 3 + 2] += velArr[i].vz * dtSec;
        velArr[i].vy -= 9.8 * dtSec;
      }
      pGeo.attributes.position.needsUpdate = true;
      pMat.opacity = Math.max(0, 1 - progress * 1.1);

      this.updateCameraFromSpherical();

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        // Complete! Ensure exact scale and cleanup effects
        tower.scale.set(1, 1, 1);
        this.scene.remove(groundShockwave);
        disposeDeep(groundShockwave);
        this.scene.remove(sparks);
        disposeDeep(sparks);

        // Highlight and focus the new building
        if (tower.userData?.product) {
          this.onSelectProduct(tower.userData.product, {
            position: tower.position,
            height: targetH,
          });
        }
      }
    };
    requestAnimationFrame(step);
  }

  claimPlotAndRise(product, x, z) {
    if (!product) return;
    const urlKey = String(product.normalizedUrl || product.websiteUrl || "").toLowerCase();
    const prodKey = String(product.id || urlKey).toLowerCase();

    // 1. Save claim
    if (urlKey) this.claimedPlots[urlKey] = [x, z];
    if (prodKey) this.claimedPlots[prodKey] = [x, z];
    saveClaimedPlots(this.claimedPlots);

    if (!this.allocatedPlots) this.allocatedPlots = loadAllocatedPlots();
    if (urlKey) this.allocatedPlots[urlKey] = [x, z];
    if (prodKey) this.allocatedPlots[prodKey] = [x, z];
    saveAllocatedPlots(this.allocatedPlots);

    // 2. Ensure product is in this.products
    const existingIdx = this.products.findIndex(
      (p) =>
        (p.id && String(p.id) === String(product.id)) ||
        (p.websiteUrl && String(p.websiteUrl).toLowerCase() === urlKey)
    );
    if (existingIdx >= 0) {
      this.products[existingIdx] = { ...this.products[existingIdx], ...product, plotLng: x, plotLat: z };
    } else {
      this.products = [
        {
          id: product.id || Date.now(),
          websiteName: product.websiteName || (urlKey ? urlKey.split(".")[0].toUpperCase() : "New Skyscraper"),
          websiteUrl: product.websiteUrl || urlKey,
          currentAmount: product.currentAmount || 1000,
          categoryId: product.categoryId || 1,
          plotLng: x,
          plotLat: z,
          ...product,
        },
        ...this.products,
      ];
    }

    // 3. Re-render city
    this.syncProducts(this.products);

    // 4. Find the newly built tower at (x, z) and trigger the rise animation!
    const newlyCreatedTower = this.brandTowersGroup.children.find(
      (t) => Math.abs(t.position.x - x) < 2 && Math.abs(t.position.z - z) < 2
    );
    if (newlyCreatedTower) {
      this.animateBuildingRise(newlyCreatedTower, newlyCreatedTower.userData.colorHex || 0x6366f1);
    }
  }

  /** Persist that `urlKey` owns the plot at (x,z); next syncProducts renders there. */
  claimPlot(urlKey, x, z) {
    if (!urlKey) return;
    const k = String(urlKey).toLowerCase();
    this.claimedPlots[k] = [x, z];
    saveClaimedPlots(this.claimedPlots);
    if (!this.allocatedPlots) this.allocatedPlots = loadAllocatedPlots();
    this.allocatedPlots[k] = [x, z];
    saveAllocatedPlots(this.allocatedPlots);
    this.syncProducts(this.products);
  }

  claimBillboard(billboardId, brandData) {
    if (!billboardId || !brandData) return;
    this.claimedBillboards[billboardId] = {
      ...brandData,
      isClaimed: true,
      isBought: true,
    };
    saveClaimedBillboards(this.claimedBillboards);
    this.syncProducts(this.products);
  }

  clampTarget() {
    const b = worldBounds();
    this.target.x = THREE.MathUtils.clamp(this.target.x, -b.halfW * 1.8, b.halfW * 2.2);
    this.target.z = THREE.MathUtils.clamp(this.target.z, -b.halfD * 1.4, b.halfD * 1.4);
    this.target.y = 0;
  }

  updateCameraFromSpherical() {
    const pos = new THREE.Vector3().setFromSpherical(this.spherical).add(this.target);
    this.camera.position.copy(pos);
    this.camera.lookAt(this.target);
    if (this.sun?.target) this.sun.target.position.copy(this.target);
    this.onProjectUpdate();
  }

  _panTo(endTarget, endRadius, endPhi) {
    if (this._panRaf) cancelAnimationFrame(this._panRaf);
    const startT = this.target.clone();
    const startR = this.spherical.radius;
    const startPhi = this.spherical.phi;
    let p = 0;
    const step = () => {
      p = Math.min(1, p + 0.055);
      const e = 1 - Math.pow(1 - p, 3);
      this.target.lerpVectors(startT, endTarget, e);
      this.spherical.radius = THREE.MathUtils.lerp(startR, endRadius, e);
      if (endPhi != null) this.spherical.phi = THREE.MathUtils.lerp(startPhi, endPhi, e);
      this.updateCameraFromSpherical();
      if (p < 1) {
        this._panRaf = requestAnimationFrame(step);
      } else {
        this._panRaf = null;
      }
    };
    step();
  }

  focusTower(tower) {
    if (!tower) return;
    if (tower.userData?.product) {
      this.onSelectProduct(tower.userData.product, {
        position: tower.position,
        height: tower.userData?.height || 28,
      });
    }
    const t = tower.position;
    const h = tower.userData?.height || 28;
    const w = tower.userData?.width || 12;

    // Center camera at mid-height of the building facade so both billboard and roof plaque are framed
    const targetCenter = new THREE.Vector3(t.x, h * 0.46, t.z);

    // Frame the complete building end-to-end up front on mobile and desktop
    const optimalRadius = Math.max(26, Math.min(75, h * 1.35 + w * 0.6));

    // Smoothly pan camera up front to show the complete building in detail
    this._panTo(targetCenter, optimalRadius, Math.PI / 2.65);
  }

  focusBillboard(billboard) {
    if (!billboard) return;
    const data = billboard.userData || billboard;
    if (this.onSelectBillboard) {
      this.onSelectBillboard(data);
    }
    const t = billboard.position || { x: 0, y: 0, z: 0 };
    this._panTo(new THREE.Vector3(t.x, 14, t.z), 400, Math.PI / 3.4);
  }

  focusDistrict(districtId) {
    const d = DISTRICT_META.find((x) => x.id === districtId);
    if (!d) return;
    this._panTo(new THREE.Vector3(d.center[0], 0, d.center[1]), 820, Math.PI / 3.1);
  }

  resetView() {
    this._panTo(new THREE.Vector3(0, 0, 0), 2050, Math.PI / 3.5);
  }

  /**
   * Opening shot: start high and far, then slowly glide down and in until the
   * #1 landmark owns the frame. Cancels itself the moment the user touches the
   * map (any drag / wheel / pick), so it never fights the viewer.
   */
  playIntro({ duration = 7.5, onDone } = {}) {
    if (this._introRaf) cancelAnimationFrame(this._introRaf);
    const focus = this.getCrownFocus();
    const endTarget = focus
      ? new THREE.Vector3(focus.x, Math.min(focus.height * 0.45, 90), focus.z)
      : new THREE.Vector3(0, 40, 0);

    const startTarget = endTarget.clone().add(new THREE.Vector3(0, 0, 260));
    const startR = 3400;
    const endR = focus ? 620 : 1500;
    const startPhi = Math.PI / 5.4; // high, looking down
    const endPhi = Math.PI / 2.85; // eye-level-ish hero angle
    const startTheta = this.spherical.theta - 0.55;
    const endTheta = this.spherical.theta + 0.12;

    this.target.copy(startTarget);
    this.spherical.set(startR, startPhi, startTheta);
    this.updateCameraFromSpherical();

    this.introPlaying = true;
    const t0 = performance.now();
    const step = () => {
      if (!this.introPlaying) return;
      const k = Math.min(1, (performance.now() - t0) / (duration * 1000));
      // long slow ease - most of the travel happens early, settles gently
      const e = 1 - Math.pow(1 - k, 3.2);
      this.target.lerpVectors(startTarget, endTarget, e);
      this.spherical.radius = THREE.MathUtils.lerp(startR, endR, e);
      this.spherical.phi = THREE.MathUtils.lerp(startPhi, endPhi, e);
      this.spherical.theta = THREE.MathUtils.lerp(startTheta, endTheta, e);
      this.updateCameraFromSpherical();
      if (k < 1) this._introRaf = requestAnimationFrame(step);
      else {
        this.introPlaying = false;
        this._introRaf = null;
        onDone?.();
      }
    };
    this._introRaf = requestAnimationFrame(step);
  }

  cancelIntro() {
    if (!this.introPlaying) return;
    this.introPlaying = false;
    if (this._introRaf) cancelAnimationFrame(this._introRaf);
    this._introRaf = null;
    this.onIntroCancel?.();
  }

  zoomIn() {
    this.spherical.radius = Math.max(18, this.spherical.radius - Math.max(25, this.spherical.radius * 0.25));
    this.updateCameraFromSpherical();
  }
  zoomOut() {
    this.spherical.radius = Math.min(3800, this.spherical.radius + Math.max(25, this.spherical.radius * 0.25));
    this.updateCameraFromSpherical();
  }

  /**
   * Which of the three looks the city should be wearing.
   *
   * Dark chrome always means a night city - that is the whole point of the
   * toggle. Light chrome means a lit city, and the clock picks midday sun vs.
   * golden hour; asked for light at 2am, it serves day rather than fighting
   * the user's explicit choice.
   */
  _resolveTod() {
    if (this._todOverride) return this._todOverride;
    if (this.uiTheme === "dark") return "night";
    const clock = currentTimeOfDay();
    return clock === "night" ? "day" : clock;
  }

  /** Repaint the world if the resolved look actually changed. */
  _applyTod() {
    const next = this._resolveTod();
    if (next === this.tod) return false;
    this.tod = next;
    this.atmo = presetFor(next);
    this.theme = this.atmo.dark ? "dark" : "light";
    this._rebuild();
    return true;
  }

  /**
   * The site's light/dark switch drives the CITY too - flipping to light with
   * a dark city underneath was the bug. ThemeContext flips this on its own at
   * dusk and dawn, so this is also how the city goes dark at night.
   */
  setTheme(theme) {
    if (theme === this.uiTheme) return;
    this.uiTheme = theme;
    this._applyTod();
  }

  /** Pin a specific look for debugging. `null` hands control back. */
  setTimeOfDay(tod) {
    this._todOverride = tod || null;
    this._applyTod();
  }

  /**
   * Cheap poll (once a minute) so a session left open rolls from midday into
   * golden hour on its own. Never rebuilds mid-walk or mid-intro - the swap is
   * deferred until the player is back on the map.
   */
  _checkClock() {
    const now = performance.now();
    if (this._clockAt && now - this._clockAt < 60000) return;
    this._clockAt = now;
    if (this.gameMode || this.introPlaying) return;
    this._applyTod();
  }

  _rebuild() {
    this._cancelBuildQueue();
    const products = this.products;
    this.fleet?.dispose();
    this.fleet = null;
    this.fountain = null; // disposed with environmentGroup below
    disposeDeep(this.environmentGroup);
    disposeDeep(this.fillerGroup);
    this.scene.remove(this.environmentGroup, this.fillerGroup);
    if (this.sky) this.scene.remove(this.sky);
    [this.hemi, this.sun].forEach((l) => l && this.scene.remove(l));
    this.clouds.forEach((c) => { this.scene.remove(c); c.geometry?.dispose(); c.material.map?.dispose(); c.material.dispose(); });
    this.skyBodies.forEach((s) => { this.scene.remove(s); s.geometry?.dispose(); s.material.dispose(); });
    this.clouds = [];
    this.skyBodies = [];

    this.environmentGroup = new THREE.Group();
    this.fillerGroup = new THREE.Group();
    while (this.brandTowersGroup.children.length) {
      const c = this.brandTowersGroup.children[0];
      this.brandTowersGroup.remove(c);
      disposeGroup(c);
    }
    while (this.brandBillboardsGroup.children.length) {
      const c = this.brandBillboardsGroup.children[0];
      this.brandBillboardsGroup.remove(c);
      disposeGroup(c);
    }
    // The plan layer is palette-dependent, so it is thrown away here and
    // lazily rebuilt the next time 2D is opened.
    if (this.planGroup) {
      this.scene.remove(this.planGroup);
      disposeDeep(this.planGroup);
      this.planGroup = null;
      this.planTowersGroup = null;
    }
    this.trafficCars = [];
    this.movingBoats = [];
    this.waters = [];
    // These are repopulated by buildAll(); without the reset every rebuild
    // would stack a second copy of every collider and bench on the old ones.
    this.propColliders = [];
    this.parkBenches = [];
    this.timesSquareColliders = [];
    this._solids = null;
    this.npcSystem?.dispose();
    this.npcSystem = null;
    this.railway?.dispose();
    this.railway = null;

    this.renderer.toneMappingExposure = this.atmo.exposure;
    this._fog.color.setHex(this.atmo.fogColor);

    this.buildAll();
    this.scene.add(this.environmentGroup, this.fillerGroup);
    this.syncProducts(products);
    // theme rebuild wipes the scene - restore whatever view/overlay was active
    if (this.viewMode === "2D") this._applyFlatten(true);
    if (this._heatOn) this._buildHeatmap();
    this.postfx?.invalidate();
    this.onProjectUpdate();
  }

  animate() {
    this.animFrameId = requestAnimationFrame(() => this.animate());
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    // `dt` is clamped so a stall can't teleport the simulation. But the perf
    // tracker must see the REAL delta: clamped at 0.05s, 1/dt could never
    // report below 20fps, so the on-screen counter sat at exactly "20" no
    // matter how slow the frame really was — and the adaptive-DPR trigger
    // could not tell a 20fps frame from a 5fps one.
    const rawDt = (now - (this._lastTime || now)) / 1000;
    const dt = Math.min(rawDt, 0.05);
    this._lastTime = now;
    this._trackPerf(rawDt);
    this._checkClock();

    // The flat map has no traffic, crowds, water or weather to simulate -
    // skipping the whole 3D update pass is most of why 2D is cheap.
    const live = this.viewMode !== "2D";

    if (live && this.trafficLightSystem) {
      this.trafficLightSystem.update(dt);
    }

    if (live && this.fleet) {
      for (let i = 0; i < this.trafficCars.length; i++) {
        const c = this.trafficCars[i];
        const speedFactor = this.trafficLightSystem
          ? this.trafficLightSystem.getVehicleSpeedFactor(c, this.trafficCars, i)
          : 1.0;

        const targetSpeed = (c.baseSpeed || c.speed) * speedFactor;
        if (c.currentSpeed === undefined) c.currentSpeed = c.baseSpeed || c.speed;

        // Smooth deceleration when braking for Red/Yellow or lead cars, smooth acceleration on Green
        if (targetSpeed < c.currentSpeed) {
          c.currentSpeed = Math.max(targetSpeed, c.currentSpeed - dt * 2.8);
        } else {
          c.currentSpeed = Math.min(targetSpeed, c.currentSpeed + dt * 1.6);
        }

        const step = c.currentSpeed * c.dir * dt * 60;
        if (c.axis === "z") {
          c.z += step;
          if (c.z > c.max) c.z = c.min;
          else if (c.z < c.min) c.z = c.max;
        } else {
          c.x += step;
          if (c.x > c.max) c.x = c.min;
          else if (c.x < c.min) c.x = c.max;
        }
        this.fleet.setCar(i, c.x, c.z, c.rotY);
      }
      this.fleet.flush();
    }
    if (live) this.movingBoats.forEach((b) => {
      b.position.z += b.userData.speed * dt * 60;
      const span = b.userData.max - b.userData.min;
      if (b.position.z > b.userData.max) b.position.z -= span;
      if (b.position.z < b.userData.min) b.position.z += span;
    });
    if (live) this.waters.forEach((w) => {
      if (w.material?.uniforms?.time) w.material.uniforms.time.value += dt;
    });
    if (live) this.clouds.forEach((c) => {
      c.position.x += c.userData.drift * dt;
      if (c.position.x > c.userData.wrapX) c.position.x = -c.userData.wrapX;
    });

    if (live) this.fountain?.update(dt);

    // Times Square neon: each panel breathes on its own phase so the canyon
    // shimmers the way a real ad wall does.
    if (live && this._tsPanels) {
      this._tsT = (this._tsT || 0) + dt;
      for (let i = 0; i < this._tsPanels.length; i++) {
        const pn = this._tsPanels[i];
        // Ad screens sit at the signage level, not the neon level - driving a
        // wall of them at neon brightness is what blew the square out before.
        const base = pn.userData.baseEmissive ?? this.atmo.neonIntensity;
        pn.material.emissiveIntensity =
          base + Math.sin(this._tsT * pn.userData.pulse + i) * base * 0.22;
      }
    }

    // Wall-mounted owner billboards
    if (live && this.brandTowersGroup) {
      this._fbT = (this._fbT || 0) + dt;
      for (const tw of this.brandTowersGroup.children) {
        const panels = tw.userData.facadePanels;
        if (panels) for (let i = 0; i < panels.length; i++) panels[i].tick(this._fbT + i * 0.7);
      }
    }

    // Live billboard screens (scrolling ticker / pulsing CTA)
    if (live && this.brandBillboardsGroup) {
      this._bbT = (this._bbT || 0) + dt;
      for (const b of this.brandBillboardsGroup.children) {
        b.userData.tick?.(this._bbT, dt);
      }
    }
    // The loop-line train runs whether you are on the map or in the street.
    this.railway?.update(dt);
    if (live) this.npcSystem?.update(dt);

    // #1 landmark flourish - counter-rotating halos + a breathing beacon
    const crown = this._crownTower;
    if (crown?.userData.spinners) {
      this._crownT = (this._crownT || 0) + dt;
      crown.userData.spinners.forEach((s) => {
        if (s.userData.flat) s.rotation.z += dt * s.userData.spinDir;
        else s.rotation.z += dt * 0.5 * s.userData.spinDir;
      });
      if (crown.userData.beam) {
        crown.userData.beam.material.opacity = 0.12 + Math.sin(this._crownT * 1.6) * 0.06;
      }
    }

    // Third-person game mode drives the camera + player each frame.
    if (this.gameHook) this.gameHook(dt);

    // Post-processing (selective bloom) is pure waste over unlit map geometry.
    if (live && this.usePostFX && this.postfx) this.postfx.render();
    else if (this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera);
  }

  // ── Perf tracking + dynamic resolution ─────────────────────────────
  // Steady-state on a healthy machine this never fires, so the rendered image
  // is unchanged. It only trims the internal render resolution (never below
  // 1.0×) when frames are sustainedly slow, and restores it once they recover.
  _trackPerf(dt) {
    if (dt <= 0) return;
    const fps = 1 / dt;
    this._fps = this._fps ? this._fps * 0.9 + fps * 0.1 : fps;
    if (this._dpr == null) this._dpr = this.renderer.getPixelRatio();
    this._dprMax = Math.min(window.devicePixelRatio || 1, 2);

    const slow = dt > 1 / 42; // worse than ~42 fps
    const fast = dt < 1 / 58; // comfortably 60
    this._slow = slow ? (this._slow || 0) + 1 : 0;
    this._fast = fast ? (this._fast || 0) + 1 : 0;

    if (this._slow > 75 && this._dpr > 1.0) {
      this._setDpr(Math.max(1.0, this._dpr - 0.25));
      this._slow = 0;
    } else if (this._fast > 240 && this._dpr < this._dprMax) {
      this._setDpr(Math.min(this._dprMax, this._dpr + 0.25));
      this._fast = 0;
    }
  }

  _setDpr(v) {
    this._dpr = v;
    this.renderer.setPixelRatio(v);
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h, false);
    this.postfx?.setSize(w, h);
  }

  // ── 2D / 3D view mode ───────────────────────────────────────────────
  /**
   * "3D" = the isometric city. "2D" = a real street map.
   *
   * The 2D view is NOT the 3D scene squashed flat - that only ever produced a
   * jumble of stretched facades and raking shadows seen from above. It is a
   * purpose-built PLAN LAYER drawn the way a street map is drawn: land wash,
   * water, parks, block fills, cased roads with the arterials picked out in
   * yellow, and a footprint for every building. Everything is unlit
   * MeshBasicMaterial and merged per colour, so the map is a handful of draw
   * calls and the entire 3D world (plus its lights, shadows and post-processing)
   * switches off while it is up.
   */

  /** Flat-map colour palette for the current theme. */
  _planPalette() {
    return this.theme === "dark"
      ? {
          land: 0x1b1f24,
          block: 0x24292f,
          green: 0x1f3326,
          water: 0x16303f,
          roadCase: 0x14181d,
          roadFill: 0x3a4149,
          roadMajor: 0x5c5330,
          plaza: 0x2c3138,
          building: 0x353c44,
          buildingTop: 0x3e454e,
        }
      : {
          land: 0xf2efe9,
          block: 0xeae6de,
          green: 0xcfe8c8,
          water: 0xa9d9f2,
          roadCase: 0xe0dbd2,
          roadFill: 0xffffff,
          roadMajor: 0xfbd88f,
          plaza: 0xe7e2d8,
          building: 0xdcd6cb,
          buildingTop: 0xd2ccc0,
        };
  }

  /** One flat horizontal quad, ready to merge. */
  _planQuad(cx, cz, w, d, rotY = 0) {
    const g = new THREE.PlaneGeometry(w, d);
    g.rotateX(-Math.PI / 2);
    if (rotY) g.rotateY(rotY);
    g.translate(cx, 0, cz);
    return g;
  }

  /**
   * Build the static half of the map (land, water, parks, roads, blocks and
   * pre-built footprints). Runs once, lazily, the first time 2D is opened -
   * so nobody pays for it unless they use it.
   */
  _buildPlanLayer() {
    if (this.planGroup) return;
    const P = this._planPalette();
    const b = worldBounds();
    const o = ocean();
    const gb = greenbelt();
    const pk = parkRect();
    const pz = plazaRect();
    const ts = timesSquareRect();

    const group = new THREE.Group();
    group.name = "plan-layer";
    group.visible = false;

    const layer = (geos, color, y, { opacity = 1, order = 0 } = {}) => {
      if (!geos.length) return null;
      geos.forEach((g) => g.translate(0, y, 0));
      const mesh = new THREE.Mesh(
        mergeSimple(geos),
        new THREE.MeshBasicMaterial({
          color,
          transparent: opacity < 1,
          opacity,
          depthWrite: false,
        })
      );
      mesh.renderOrder = order;
      group.add(mesh);
      return mesh;
    };

    // 1. Land wash covering everything the camera can see.
    layer([this._planQuad(0, 0, b.cityW * 6, b.cityD * 4)], P.land, 0, { order: 0 });

    // 2. Water - the eastern ocean and the western river.
    layer(
      [
        this._planQuad(o.x, (o.z0 + o.z1) / 2, o.w * 2.2, o.depthSpan),
        this._planQuad(gb.x - gb.w * 0.4, 0, gb.w * 0.5, gb.span),
      ],
      P.water,
      0.2,
      { order: 1 }
    );

    // 3. Green: the greenbelt strip, Central Park and the plaza gardens.
    layer(
      [
        this._planQuad(gb.x + gb.w * 0.25, 0, gb.w * 0.6, gb.span),
        this._planQuad(pk.cx, pk.cz, pk.x1 - pk.x0, pk.z1 - pk.z0),
        this._planQuad(pz.cx, pz.cz, (pz.x1 - pz.x0) * 0.94, (pz.z1 - pz.z0) * 0.94),
      ],
      P.green,
      0.4,
      { order: 2 }
    );

    // 4. Built-up block fills - the grey "city" tone between the roads.
    const blocks = [];
    forEachBlock((blk) => blocks.push(this._planQuad(blk.cx, blk.cz, blk.w, blk.d)));
    layer(blocks, P.block, 0.6, { order: 3 });

    // 5. Times Square's pedestrian granite.
    layer(
      [this._planQuad(ts.cx, ts.cz, ts.x1 - ts.x0, ts.z1 - ts.z0)],
      P.plaza,
      0.7,
      { order: 4 }
    );

    // 6. Roads: casing first, then the fill inside it - the two-tone edge is
    //    what makes a drawn map read as a road network rather than grey bars.
    const segs = this._roadSegs || roadSegments();
    const CASE = 7; // extra width of the casing on each side
    const cases = [];
    const fills = [];
    const majors = [];
    segs.avenues.forEach((a) => {
      const len = a.z1 - a.z0;
      if (len < 8) return;
      const cz = (a.z0 + a.z1) / 2;
      cases.push(this._planQuad(a.x, cz, a.w + CASE, len));
      (a.major ? majors : fills).push(this._planQuad(a.x, cz, a.w, len));
    });
    segs.streets.forEach((st) => {
      const len = st.x1 - st.x0;
      if (len < 8) return;
      const cx = (st.x0 + st.x1) / 2;
      cases.push(this._planQuad(cx, st.z, len, st.w + CASE));
      (st.major ? majors : fills).push(this._planQuad(cx, st.z, len, st.w));
    });
    layer(cases, P.roadCase, 0.9, { order: 5 });
    layer(fills, P.roadFill, 1.0, { order: 6 });
    layer(majors, P.roadMajor, 1.05, { order: 7 });

    // 7. Every pre-built structure as a footprint.
    const foot = [];
    (this.fillerSlots || []).forEach((sl) => {
      if (!sl || !sl.plan?.fill) return;
      foot.push(this._planQuad(sl.lot.cx, sl.lot.cz, sl.w, sl.dep));
    });
    layer(foot, P.building, 1.2, { order: 8 });

    // Owned towers live in their own group so they can be rebuilt per bid and
    // stay individually pickable.
    this.planTowersGroup = new THREE.Group();
    this.planTowersGroup.name = "plan-towers";
    group.add(this.planTowersGroup);

    this.planGroup = group;
    this.scene.add(group);
    this._syncPlanTowers();
  }

  /**
   * Footprints for the brand-owned towers, tinted by district and carrying the
   * same userData the 3D towers do - so clicking a building on the map opens
   * exactly the popup clicking it in 3D would.
   */
  _syncPlanTowers() {
    const grp = this.planTowersGroup;
    if (!grp) return;
    while (grp.children.length) {
      const c = grp.children[0];
      grp.remove(c);
      c.geometry?.dispose();
      c.material?.dispose();
    }
    this.brandTowersGroup.children.forEach((tower) => {
      const w = tower.userData.width || 20;
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(w, w),
        new THREE.MeshBasicMaterial({
          color: tower.userData.colorHex ?? 0xf05a38,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
        })
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(tower.position.x, 1.4, tower.position.z);
      mesh.renderOrder = 9;
      mesh.userData = tower.userData; // same product / rank / colour payload
      grp.add(mesh);
    });
  }

  setViewMode(mode) {
    const twoD = mode === "2D";
    if (this.viewMode === (twoD ? "2D" : "3D")) return;
    this.viewMode = twoD ? "2D" : "3D";

    const b = worldBounds();
    // Deliberately INSTANT. A tweened camera flight between two completely
    // different renderings meant running both worlds at once for a second and
    // a half; the cut is snapped here and the UI covers it with a shutter
    // blink, which is cheaper and reads better.
    if (twoD) {
      this._saved3D = {
        radius: this.spherical.radius,
        phi: this.spherical.phi,
        theta: this.spherical.theta,
        target: this.target.clone(),
      };
      this.target.set(0, 0, 0);
      this.spherical.set(Math.max(b.cityD * 1.15, 2400), 0.02, 0);
    } else {
      const sv = this._saved3D;
      this.target.copy(sv ? sv.target : new THREE.Vector3(0, 0, 0));
      this.spherical.set(
        sv ? sv.radius : 2050,
        sv ? sv.phi : Math.PI / 3.5,
        sv ? sv.theta : Math.PI * 0.18
      );
    }
    this.updateCameraFromSpherical();
    this._applyFlatten(twoD);
    this.onProjectUpdate();
  }

  /**
   * Swap the whole world for the flat map, and back.
   *
   * In 2D the 3D city is not rendered at all - no lights, no shadows, no
   * post-processing, no NPC or traffic updates. That is the optimisation the
   * old "squash everything" approach could never give.
   */
  _applyFlatten(flat) {
    if (flat) this._buildPlanLayer();
    if (this.planGroup) this.planGroup.visible = flat;

    // The entire 3D world steps aside.
    this.environmentGroup.visible = !flat;
    this.fillerGroup.visible = !flat;
    this.brandTowersGroup.visible = !flat;
    this.brandBillboardsGroup.visible = !flat;
    if (this.sky) this.sky.visible = !flat;
    this.clouds?.forEach((c) => (c.visible = !flat));
    this.skyBodies?.forEach((o) => (o.visible = !flat));
    if (this.hoverHighlightGroup) this.hoverHighlightGroup.visible = false;

    // The lights are deliberately left ALONE. Toggling light.visible or
    // shadowMap.enabled changes the renderer's lights hash and forces every
    // material to recompile on each switch - a visible hitch, in exchange for
    // nothing: the map is unlit MeshBasicMaterial and every lit object is
    // already hidden, so the shadow pass renders an empty scene.
    this.renderer.shadowMap.autoUpdate = !flat;
    this.renderer.toneMappingExposure = flat ? 1.0 : this.atmo.exposure;
    this.scene.fog = flat ? null : this._fog;
    this.scene.background = flat
      ? new THREE.Color(this._planPalette().land)
      : null;
  }

  // ── Heatmap overlay ─────────────────────────────────────────────────
  /**
   * Paints the city by money: every claimed lot gets a coloured disc scaled to
   * its bid, blended into a single canvas so hot districts glow red and quiet
   * ones stay blue - the classic value heatmap, laid over the real grid.
   */
  setHeatmap(on) {
    if (on === this._heatOn) return;
    this._heatOn = on;
    if (!on) {
      if (this._heatMesh) this._heatMesh.visible = false;
      return;
    }
    this._buildHeatmap();
    if (this._heatMesh) this._heatMesh.visible = true;
  }

  _buildHeatmap() {
    const b = worldBounds();
    const spanX = b.cityW + GRID.SHORE_MARGIN * 2 + 200;
    const spanZ = b.cityD + GRID.STREET_SPACING * 6;
    const S = 512;
    const cv = document.createElement("canvas");
    cv.width = cv.height = S;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, S, S);

    const toPx = (wx, wz) => [((wx + spanX / 2) / spanX) * S, ((wz + spanZ / 2) / spanZ) * S];

    // additive value field
    const towers = this.brandTowersGroup.children;
    const top = Math.max(1, ...towers.map((t) => t.userData.amount || 0));
    ctx.globalCompositeOperation = "lighter";
    towers.forEach((t) => {
      const amt = t.userData.amount || 0;
      const w = Math.pow(Math.max(0.04, amt / top), 0.45);
      const [px, pz] = toPx(t.position.x, t.position.z);
      const r = 24 + w * 66;
      const grad = ctx.createRadialGradient(px, pz, 0, px, pz, r);
      grad.addColorStop(0, `rgba(255,${Math.round(210 - w * 190)},40,${0.5 + w * 0.45})`);
      grad.addColorStop(0.45, `rgba(255,${Math.round(160 - w * 120)},30,${0.22 + w * 0.2})`);
      grad.addColorStop(1, "rgba(40,90,255,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, pz, r, 0, Math.PI * 2);
      ctx.fill();
    });
    // a cool floor so unclaimed land still reads as "cold", not empty
    ctx.globalCompositeOperation = "destination-over";
    const floor = ctx.createLinearGradient(0, 0, 0, S);
    floor.addColorStop(0, "rgba(30,80,200,0.20)");
    floor.addColorStop(1, "rgba(20,60,170,0.20)");
    ctx.fillStyle = floor;
    ctx.fillRect(0, 0, S, S);
    ctx.globalCompositeOperation = "source-over";

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;

    if (this._heatMesh) {
      this._heatMesh.material.map?.dispose();
      this._heatMesh.material.map = tex;
      this._heatMesh.material.needsUpdate = true;
      return;
    }
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(spanX, spanZ),
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
      })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, 42, 0); // floats above the rooftops so it always reads
    mesh.renderOrder = 6;
    this._heatMesh = mesh;
    this.scene.add(mesh);
  }

  // ── Game-mode bridge ────────────────────────────────────────────────
  setGameHook(fn) {
    this.gameHook = fn || null;
  }

  enterGameMode() {
    // The player needs the finished world, not a half-populated one.
    this.ensureBuilt();
    this.gameMode = true;
    this.isDragging = false;
    this.isRotating = false;
  }

  exitGameMode() {
    this.gameMode = false;
    this.gameHook = null;
    this.updateCameraFromSpherical();
  }

  /** Solid footprints (world AABBs) of every standing building - for collision. */
  getSolids() {
    if (this._solids) return this._solids;
    const out = [];
    (this.fillerSlots || []).forEach((s) => {
      if (!s || !s.plan?.fill) return;
      out.push({ cx: s.lot.cx, cz: s.lot.cz, hw: s.w / 2 + 0.4, hd: s.dep / 2 + 0.4, h: s.h });
    });
    this.brandTowersGroup.children.forEach((t) => {
      const w = (t.userData?.width || 20) / 2 + 1;
      out.push({ cx: t.position.x, cz: t.position.z, hw: w, hd: w, h: t.userData?.height || 60, brand: true });
    });
    if (this.fountainCollider) {
      out.push(this.fountainCollider);
    }
    if (this.propColliders) {
      out.push(...this.propColliders);
    }
    this._solids = out;
    return out;
  }

  invalidateSolids() {
    this._solids = null;
  }

  /**
   * Colliders that move or are registered at runtime: traffic vehicles (live,
   * rotated boxes) plus anything the game layer adds (fences, signs, props).
   * Rebuilt per frame for vehicles; static extras are appended untouched.
   */
  getDynamicSolids() {
    const out = this._extraSolids ? this._extraSolids.slice() : [];
    if (this.fleet && this.trafficCars) {
      for (let i = 0; i < this.trafficCars.length; i++) {
        const c = this.trafficCars[i];
        const spec = this.fleet.specs?.[i];
        const len = spec ? spec.len : 6;
        const wid = spec ? spec.wid : 2.5;
        const curSpd = c.currentSpeed !== undefined ? c.currentSpeed : (c.baseSpeed || c.speed);
        const vx = c.axis === "x" ? curSpd * c.dir * 60 : 0;
        const vz = c.axis === "z" ? curSpd * c.dir * 60 : 0;
        out.push({
          cx: c.x,
          cz: c.z,
          hw: wid / 2 + 0.15,
          hd: len / 2 + 0.15,
          h: spec?.bus ? 3.4 : 2.3,
          rot: c.rotY,
          vehicle: true,
          vx,
          vz,
        });
      }
    }
    // Car bodies, so walking into the train stops you. It is never boardable.
    if (this.railway) out.push(...this.railway.getSolids());
    return out;
  }

  /** Register static world colliders (fences, signs, benches…). */
  addSolids(list) {
    this._extraSolids = (this._extraSolids || []).concat(list);
  }

  clearExtraSolids() {
    this._extraSolids = [];
  }

  /**
   * Every street-level place a player can be dropped when they enter the city.
   *
   * These used to all sit inside the fountain plaza, so "Enter City" always
   * put you in the same park. The list now spans the whole map - the square,
   * the plaza, the waterfront and each named district - and getSpawnPoint()
   * picks at random, so consecutive entries land you somewhere new.
   */
  getAllSpawnLocations() {
    const p = plazaRect();
    const ts = timesSquareRect();
    const tsW = (ts.x1 - ts.x0) * 0.5;
    const tsD = (ts.z1 - ts.z0) * 0.5;
    const b = worldBounds();

    // Snapped to the nearest road crossing and nudged onto the sidewalk, so a
    // district spawn can never drop the player inside a building footprint.
    const av = avenues();
    const st = streets();
    const nearest = (list, key, v) =>
      list.reduce((best, cur) => (Math.abs(cur[key] - v) < Math.abs(best[key] - v) ? cur : best));
    const districtSpots = DISTRICT_META.map((d) => {
      const [dx, dz] = d.center;
      const a = nearest(av, "x", dx);
      const t = nearest(st, "z", dz);
      return {
        x: a.x + GRID.ROAD_W_AVENUE / 2 + 3,
        y: 0.1,
        z: t.z + GRID.ROAD_W_STREET / 2 + 3,
        yaw: Math.PI,
        area: d.name,
      };
    });

    return [
      // ── TIMES SQUARE - the headline arrival, weighted with 8 of the spots
      // so the crossroads is where you most often wake up.
      { x: ts.cx, y: 0.1, z: ts.cz + tsD * 0.72, yaw: 0, area: "Times Square" },
      { x: ts.cx, y: 0.1, z: ts.cz - tsD * 0.72, yaw: Math.PI, area: "Times Square" },
      { x: ts.cx + tsW * 0.72, y: 0.1, z: ts.cz, yaw: -Math.PI / 2, area: "Times Square" },
      { x: ts.cx - tsW * 0.72, y: 0.1, z: ts.cz, yaw: Math.PI / 2, area: "Times Square" },
      { x: ts.cx - tsW * 0.4, y: 0.1, z: ts.cz + tsD * 0.4, yaw: -Math.PI * 0.75, area: "Times Square" },
      { x: ts.cx + tsW * 0.4, y: 0.1, z: ts.cz - tsD * 0.4, yaw: Math.PI * 0.25, area: "Times Square" },
      { x: ts.cx, y: 0.1, z: ts.cz + tsD * 1.25, yaw: 0, area: "Times Square Approach" },
      { x: ts.cx, y: 0.1, z: ts.cz - tsD * 1.25, yaw: Math.PI, area: "Times Square Approach" },

      // ── Waterfront + greenbelt edges of the island ─────────────────
      { x: b.halfW + GRID.SHORE_MARGIN * 0.5, y: 0.1, z: 0, yaw: Math.PI / 2, area: "Harbor Promenade" },
      { x: -b.halfW - GRID.SHORE_MARGIN * 0.4, y: 0.1, z: b.halfD * 0.35, yaw: -Math.PI / 2, area: "Greenridge Shore" },

      // ── One street-level spot in the heart of every named district ──
      ...districtSpots,
    ].concat([
      // 1. Central Park South Grand Entrance
      { x: p.cx, y: 0.10, z: p.z1 + 16, yaw: Math.PI },
      // 2. Central Park North Gate Avenue
      { x: p.cx, y: 0.10, z: p.z0 - 16, yaw: 0 },
      // 3. Central Park East Grand Portal
      { x: p.x1 + 16, y: 0.10, z: p.cz, yaw: Math.PI / 2 },
      // 4. Central Park West Grand Portal
      { x: p.x0 - 16, y: 0.10, z: p.cz, yaw: -Math.PI / 2 },
      // 5. Central Fountain South Promenade
      { x: p.cx, y: 0.10, z: p.cz + 36, yaw: Math.PI },
      // 6. Central Fountain North Promenade
      { x: p.cx, y: 0.10, z: p.cz - 36, yaw: 0 },
      // 7. Central Fountain East Promenade
      { x: p.cx + 36, y: 0.10, z: p.cz, yaw: Math.PI / 2 },
      // 8. Central Fountain West Promenade
      { x: p.cx - 36, y: 0.10, z: p.cz, yaw: -Math.PI / 2 },
      // 9. Rose Garden Promenade (South-East)
      { x: p.cx + 44, y: 0.10, z: p.cz + 44, yaw: Math.PI * 0.75 },
      // 10. Botanical Blossom Walk (North-East)
      { x: p.cx + 44, y: 0.10, z: p.cz - 44, yaw: Math.PI * 0.25 },
      // 11. Lavender Garden Walk (North-West)
      { x: p.cx - 44, y: 0.10, z: p.cz - 44, yaw: -Math.PI * 0.25 },
      // 12. Cherry Blossom Walk (South-West)
      { x: p.cx - 44, y: 0.10, z: p.cz + 44, yaw: -Math.PI * 0.75 },
      // 13. Downtown Commerce Plaza
      { x: p.cx + 105, y: 0.10, z: p.cz + 40, yaw: 0 },
      // 14. Westside Arts Boulevard
      { x: p.cx - 105, y: 0.10, z: p.cz - 40, yaw: Math.PI },
      // 15. North Waterfront Promenade
      { x: p.cx + 40, y: 0.10, z: p.cz - 115, yaw: -Math.PI / 2 },
      // 16. South Parkview Boulevard
      { x: p.cx - 40, y: 0.10, z: p.cz + 115, yaw: Math.PI / 2 },
    ]);
  }

  /**
   * Safe street-level spawn point generator ensuring non-overlapping spawns.
   * @param {Array} occupied - array of occupied player positions {x, z}
   * @param {number|null} preferredIndex - optional preferred index from server
   */
  getSpawnPoint(occupied = [], preferredIndex = null) {
    const all = this.getAllSpawnLocations();

    // Times Square is the front door. Nine times in ten you arrive in the
    // crossroads itself; the remaining tenth is scattered across the rest of
    // the map so the city never feels like it is only one square.
    const inSquare = all.filter((s) => (s.area || "").startsWith("Times Square"));
    const elsewhere = all.filter((s) => !(s.area || "").startsWith("Times Square"));
    const spots =
      inSquare.length && (Math.random() < 0.9 || !elsewhere.length)
        ? inSquare
        : elsewhere;

    // If a valid preferred index is specified and clear of other players
    if (typeof preferredIndex === "number" && preferredIndex >= 0 && preferredIndex < all.length) {
      const pref = all[preferredIndex];
      const clear = occupied.every((occ) => {
        if (!occ) return true;
        const ox = occ.x ?? (occ.pos?.x ?? 0);
        const oz = occ.z ?? (occ.pos?.z ?? 0);
        return Math.hypot(pref.x - ox, pref.z - oz) >= 8;
      });
      if (clear) return { ...pref };
    }

    // Shuffle spots for random variety
    const shuffled = spots.slice().sort(() => Math.random() - 0.5);

    if (!occupied || !occupied.length) {
      return { ...shuffled[0] };
    }

    let bestSpot = null;
    let maxMinDist = -1;

    for (const spot of shuffled) {
      let minDist = Infinity;
      for (const occ of occupied) {
        if (!occ) continue;
        const ox = occ.x ?? (occ.pos?.x ?? 0);
        const oz = occ.z ?? (occ.pos?.z ?? 0);
        const d = Math.hypot(spot.x - ox, spot.z - oz);
        if (d < minDist) minDist = d;
      }

      // If at least 12 meters away from any player, it's non-overlapping and safe
      if (minDist >= 12) {
        return { ...spot };
      }

      if (minDist > maxMinDist) {
        maxMinDist = minDist;
        bestSpot = spot;
      }
    }

    if (bestSpot) {
      // Add a randomized safe offset (2.5-5.5m) along sidewalk so avatars never overlap
      const angle = Math.random() * Math.PI * 2;
      const offset = 2.5 + Math.random() * 3.0;
      return {
        x: bestSpot.x + Math.cos(angle) * offset,
        y: bestSpot.y,
        z: bestSpot.z + Math.sin(angle) * offset,
        yaw: bestSpot.yaw,
      };
    }

    return { ...spots[0] };
  }

  groundHeightAt() {
    return 0.10;
  }

  destroy() {
    this._destroyed = true;
    this._cancelBuildQueue();
    this._resizeObs?.disconnect();
    this._resizeObs = null;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    const dom = this.renderer?.domElement;
    if (dom) {
      dom.removeEventListener("mousedown", this._onDown);
      dom.removeEventListener("wheel", this._onWheel);
      dom.removeEventListener("touchstart", this._onTouchStart);
      dom.removeEventListener("touchmove", this._onTouchMove);
      dom.removeEventListener("touchend", this._onTouchEnd);
      dom.removeEventListener("touchcancel", this._onTouchEnd);
    }
    if (this._introRaf) cancelAnimationFrame(this._introRaf);
    window.removeEventListener("mousemove", this._onMove);
    window.removeEventListener("mouseup", this._onUp);
    window.removeEventListener("resize", this._onResize);
    this.postfx?.dispose();
    this.fleet?.dispose();
    this.trafficLightSystem?.dispose();
    this.npcSystem?.dispose();
    this._waterNormals?.dispose();
    this.scene?.environment?.dispose?.();
    while (this.brandBillboardsGroup?.children?.length) {
      const c = this.brandBillboardsGroup.children[0];
      this.brandBillboardsGroup.remove(c);
      disposeGroup(c);
    }
    if (this.renderer) {
      this.renderer.domElement?.remove();
      this.renderer.dispose();
    }
  }

  // ── Perf telemetry (dev overlay reads this) ─────────────────────────
  getRenderStats() {
    const r = this.renderer?.info;
    if (!r) return null;
    return {
      fps: Math.round(this._fps || 0),
      calls: r.render.calls,
      triangles: r.render.triangles,
      geometries: r.memory.geometries,
      textures: r.memory.textures,
      programs: r.programs?.length ?? 0,
      pixelRatio: +this.renderer.getPixelRatio().toFixed(2),
      postfx: !!this.usePostFX,
    };
  }
}

function mergeSimple(geometries) {
  const merged = BufferGeometryUtils.mergeGeometries(geometries, false);
  geometries.forEach((g) => g.dispose());
  return merged;
}

/** Multiply a geometry's UVs so a tiling texture keeps a constant world size. */
function scaleUV(geo, su, sv) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  uv.needsUpdate = true;
  return geo;
}

/** Compact money label for in-world signage ($1.2K / $340). */
function formatMoneyShort(inr) {
  const usd = (inr || 0) / INR_PER_USD;
  if (usd >= 1000) return `$${(usd / 1000).toFixed(usd >= 10000 ? 0 : 1)}K`;
  return `$${Math.round(usd)}`;
}

function keyOf(lot) {
  return `${Math.round(lot.cx)},${Math.round(lot.cz)}`;
}

function touchDist(t) {
  return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
}
function touchCenter(t) {
  return { x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 };
}

const CLAIM_KEY = "tri-claimed-plots";
const ALLOC_KEY = "tri-allocated-plots";

function loadClaimedPlots() {
  try {
    return JSON.parse(localStorage.getItem(CLAIM_KEY) || "{}") || {};
  } catch {
    return {};
  }
}
function saveClaimedPlots(obj) {
  try {
    localStorage.setItem(CLAIM_KEY, JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}

function loadAllocatedPlots() {
  try {
    return JSON.parse(localStorage.getItem(ALLOC_KEY) || "{}") || {};
  } catch {
    return {};
  }
}
function saveAllocatedPlots(obj) {
  try {
    localStorage.setItem(ALLOC_KEY, JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}

export function getPlotFixedPriceUSD(districtIdOrArchetype) {
  const d = String(districtIdOrArchetype || "").toLowerCase();
  if (d.includes("northpoint") || d.includes("downtown") || d.includes("crown") || d.includes("central")) return 30;
  if (d.includes("meridian") || d.includes("westfield") || d.includes("midtown")) return 20;
  if (d.includes("harborview") || d.includes("dockside") || d.includes("waterfront")) return 15;
  if (d.includes("greenridge") || d.includes("residential") || d.includes("tech")) return 10;
  return 5;
}

// $200 (USD) buys one floor; amounts arrive in INR (~₹83 / $1).
// Every paid plot is at least a small building; the #1 landmark is guaranteed
// to lead the skyline it tops.
export const MIN_BRAND_FLOORS = 4;
// Buying a finished building costs a premium over building one yourself.
export const PREBUILT_PREMIUM = 1.6;
// Fixed resale band for ordinary building stock - pocket-change, deliberately.
// Times Square has no band because its buildings are never for sale; the
// square's economy is its billboards (see getPrebuiltAt).
export const SMALL_PRICE_MIN = 2;
export const SMALL_PRICE_MAX = 10;
export const CROWN_MIN_FLOORS = 34;

export const USD_PER_FLOOR = 5;
export const INR_PER_USD = 83;
export const FLOOR_HEIGHT = 3.4;
export const MAX_FLOORS = 200;
export function floorsForAmountINR(inr) {
  const usd = (inr || 0) / INR_PER_USD;
  return Math.max(1, Math.min(MAX_FLOORS, Math.round(usd / USD_PER_FLOOR)));
}

function hideInstance(mesh, i, dummy) {
  dummy.position.set(0, -99999, 0);
  dummy.scale.setScalar(0.0001);
  dummy.rotation.set(0, 0, 0);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
}
