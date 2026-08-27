import * as THREE from "three";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import { GRID, timesSquareRect } from "./cityGrid.js";
import { MAT, makeStreetlight, makePeople, finishTex, mulberry } from "./cityProps.js";
import { SIGN_LIGHT } from "./brandShowcase.js";

/**
 * timesSquare.js — the crossroads, built to match the real place.
 *
 * The square is the one part of Velora Harbor that is meant to overwhelm you,
 * and that comes down to four things the rest of the city does not do:
 *
 *   1. SIGNAGE DENSITY. Real Times Square has no bare wall. Every frontage is
 *      papered floor-to-roof with screens — wide marquees, tall vertical
 *      banners, thin ribbon boards, corner wraps — stacked and butted together
 *      with almost no gaps. A dozen tidy billboards on poles reads as a
 *      shopping centre car park, not Broadway.
 *   2. STREET-LEVEL RETAIL. Under the signs is a continuous lit shopfront band:
 *      awnings, glass, fascia signs, theatre marquees.
 *   3. CROWD. The pedestrian plazas are packed shoulder to shoulder, sitting on
 *      the red steps and at the red café tables.
 *   4. TRAFFIC. Yellow cabs, nose to tail.
 *
 * PERFORMANCE NOTE — how ~150 signs cost ~15 draw calls:
 * every ambient sign samples one of a small bank of shared, procedurally
 * generated ad textures. Panels are grouped BY TEXTURE and their geometry is
 * baked into a single merged mesh per texture, so the whole sign wall is a
 * handful of draws. Only the handful of *bookable* billboards (see
 * CITY_BILLBOARD_LOCATIONS in brandShowcase.js) get their own high-resolution
 * canvas, because those have to be readable and individually pickable.
 *
 * All artwork is fictional. Nothing here imitates a real brand.
 */

// ── Fictional advertisers ─────────────────────────────────────────────
const BRANDS = [
  "VELORA", "NEXA", "AURORA", "KYTO", "LUMEN", "ORBIT", "PULSE", "VERTEX",
  "ZENITH", "HALCYON", "NOVA", "ATLAS", "PRISM", "ECHO", "SOLARIS", "MERIDIAN",
  "COBALT", "INDIGO", "QUARRY", "SABLE", "TORCH", "VANTA", "WREN", "OSMO",
];
const TAGLINES = [
  "NOW STREAMING", "THE NEW SEASON", "ARRIVING SPRING", "ONLY HERE",
  "LIVE TONIGHT", "OUT NOW", "OPENING NIGHT", "DOWNLOAD THE APP",
  "LIMITED RUN", "THE FLAGSHIP STORE", "BOOK TICKETS", "PREMIERES FRIDAY",
];
const SHOP_KINDS = [
  "CAFÉ", "PHARMACY", "SOUVENIRS", "SPORTS", "CANDY", "DENIM", "ELECTRONICS",
  "BURGERS", "COSMETICS", "TOYS", "PIZZA", "OUTFITTERS", "THEATRE", "NEWS",
];
const AD_COLORS = [
  "#ff2e63", "#0ea5e9", "#ffd23f", "#8f5bff", "#3bf0a8", "#ff6a1f",
  "#f43f9d", "#22d3ee", "#a3e635", "#fb7185", "#38bdf8", "#facc15",
];

/** Merge a list of geometries into one and dispose the sources. */
function merge(geos) {
  const m = BufferGeometryUtils.mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  return m;
}

/** A vertical quad centred on the origin, then transformed into place. */
function panelGeo(w, h, matrix) {
  const g = new THREE.PlaneGeometry(w, h);
  g.applyMatrix4(matrix);
  return g;
}

// ── Procedural advertising art ────────────────────────────────────────

/**
 * One ad. `shape` picks the canvas aspect:
 *   wide   1024×512  marquee screens
 *   tall   512×1024  vertical banners
 *   ribbon 1024×256  thin wrap-around strips
 *   shop   1024×256  lit fascia sign over a shopfront
 */
function makeAdTexture(shape, seed) {
  const r = mulberry(seed * 7919 + 13);
  const pick = (arr) => arr[Math.floor(r() * arr.length) % arr.length];

  const size = { wide: [1024, 512], tall: [512, 1024], ribbon: [1024, 256], shop: [1024, 256] }[shape];
  const [W, H] = size;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d");
  ctx.textRendering = "geometricPrecision";

  const brand = pick(BRANDS);
  const accent = pick(AD_COLORS);
  const style = Math.floor(r() * 5);

  // ── ground ──────────────────────────────────────────────────────────
  if (style === 0) {
    // saturated full-bleed colour field
    const gr = ctx.createLinearGradient(0, 0, W, H);
    gr.addColorStop(0, accent);
    gr.addColorStop(1, pick(AD_COLORS));
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H);
  } else if (style === 1) {
    // dark screen with a neon wordmark
    ctx.fillStyle = "#07090f";
    ctx.fillRect(0, 0, W, H);
  } else if (style === 2) {
    // split panel: colour block beside a dark half
    ctx.fillStyle = "#0b1017";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = accent;
    if (shape === "tall") ctx.fillRect(0, 0, W, H * 0.46);
    else ctx.fillRect(0, 0, W * 0.42, H);
  } else if (style === 3) {
    // white poster
    ctx.fillStyle = "#f5f3ee";
    ctx.fillRect(0, 0, W, H);
  } else {
    // photo-ish abstract: soft blobs over a deep ground
    ctx.fillStyle = "#101725";
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 7; i++) {
      const gx = r() * W;
      const gy = r() * H;
      const rad = (0.2 + r() * 0.5) * Math.max(W, H) * 0.5;
      const gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, rad);
      gr.addColorStop(0, `${pick(AD_COLORS)}cc`);
      gr.addColorStop(1, "#00000000");
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // faint LED pixel grid over everything — these are screens, not posters
  ctx.strokeStyle = "rgba(0,0,0,0.10)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 8) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 8) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  const ink = style === 3 ? "#14171c" : "#ffffff";
  const sub = style === 3 ? "rgba(20,23,28,0.65)" : "rgba(255,255,255,0.72)";

  // ── lettering ───────────────────────────────────────────────────────
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (shape === "tall") {
    // Vertical banners set the name huge and stacked, the way a real
    // building-height banner has to be read from the street below.
    ctx.fillStyle = ink;
    const chars = brand.split("");
    const step = Math.min(120, (H * 0.62) / chars.length);
    ctx.font = `900 ${Math.round(step * 0.92)}px 'Inter', Impact, sans-serif`;
    chars.forEach((c, i) => {
      ctx.fillText(c, W / 2, H * 0.3 + i * step);
    });
    ctx.fillStyle = sub;
    ctx.font = "600 40px 'Inter', sans-serif";
    ctx.fillText(pick(TAGLINES), W / 2, H - 78);
    if (style === 1) {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 8;
      ctx.strokeRect(28, 28, W - 56, H - 56);
    }
  } else if (shape === "ribbon") {
    // Ribbon boards run one line of text, repeated, like a news crawl.
    ctx.fillStyle = ink;
    ctx.font = "900 132px 'Inter', Impact, sans-serif";
    const line = `${brand}   ★   ${pick(TAGLINES)}   ★   `;
    const tw = ctx.measureText(line).width;
    for (let x = 0; x < W + tw; x += tw) ctx.fillText(line, x - tw / 2, H / 2);
  } else if (shape === "shop") {
    ctx.fillStyle = style === 3 ? "#14171c" : accent;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = style === 3 ? "#f5f3ee" : "#0b1017";
    ctx.font = "900 118px 'Inter', Impact, sans-serif";
    ctx.fillText(`${brand}  ${pick(SHOP_KINDS)}`, W / 2, H / 2 + 6);
  } else {
    // Wide marquee: a big wordmark over a supporting line.
    ctx.fillStyle = ink;
    ctx.font = "900 168px 'Inter', Impact, sans-serif";
    ctx.fillText(brand, W / 2, H * 0.42);
    ctx.fillStyle = sub;
    ctx.font = "700 62px 'Inter', sans-serif";
    ctx.fillText(pick(TAGLINES), W / 2, H * 0.72);
    if (style === 1) {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 10;
      ctx.strokeRect(30, 30, W - 60, H - 60);
    }
  }

  return finishTex(cv);
}

/**
 * The shared texture bank. Built once per world rebuild and handed out by
 * index, so ~150 panels reference ~18 canvases.
 */
function makeAdBank() {
  const bank = { wide: [], tall: [], ribbon: [], shop: [] };
  for (let i = 0; i < 7; i++) bank.wide.push(makeAdTexture("wide", i + 1));
  for (let i = 0; i < 5; i++) bank.tall.push(makeAdTexture("tall", i + 40));
  for (let i = 0; i < 3; i++) bank.ribbon.push(makeAdTexture("ribbon", i + 80));
  for (let i = 0; i < 4; i++) bank.shop.push(makeAdTexture("shop", i + 120));
  return bank;
}

// ── Frontage description ──────────────────────────────────────────────

/**
 * The four building walls that box the crossing, as parametric lines.
 *
 * `along(t)` walks the wall from one end to the other (t in 0..1) and returns
 * a world position; `yaw` turns a panel to face into the square; `normal` is
 * the small outward offset that keeps a panel proud of the brickwork.
 *
 * Offsets come from the grid: the square's rect edges are the CENTRES of the
 * roads that box it, so the wall is half a road plus the lot setback away —
 * 16 on the narrow streets (north/south), 20 on the wide avenues (east/west).
 */
function frontages(rect) {
  const { x0, x1, z0, z1, cx, cz } = rect;
  const N = 16;
  const A = 20;
  const spanX = x1 - x0;
  const spanZ = z1 - z0;
  return [
    {
      id: "north",
      yaw: 0, // screen faces +Z, into the square
      at: (t) => ({ x: x0 + t * spanX, z: z0 - N }),
      len: spanX,
      out: { x: 0, z: -1 },
    },
    {
      id: "south",
      yaw: Math.PI,
      at: (t) => ({ x: x0 + t * spanX, z: z1 + N }),
      len: spanX,
      out: { x: 0, z: 1 },
    },
    {
      id: "east",
      yaw: -Math.PI / 2,
      at: (t) => ({ x: x1 + A, z: z0 + t * spanZ }),
      len: spanZ,
      out: { x: 1, z: 0 },
    },
    {
      id: "west",
      yaw: Math.PI / 2,
      at: (t) => ({ x: x0 - A, z: z0 + t * spanZ }),
      len: spanZ,
      out: { x: -1, z: 0 },
    },
  ].map((f) => ({ ...f, cx, cz }));
}

// ── The sign wall ─────────────────────────────────────────────────────

/**
 * Paper every frontage with screens, floor to roof.
 *
 * Each wall is divided into bays a few metres wide. A bay is filled from the
 * shopfront band upward with a randomly chosen stack of marquees, banners and
 * ribbons until it runs out of building, leaving only the odd deliberate gap.
 * Panels are accumulated per texture and merged at the end.
 */
function buildSignWall(engine, group, rect, bank) {
  const r = mulberry(4242);
  const atmo = engine.atmo;

  // texture id -> geometry list
  const buckets = new Map();
  const bezels = [];
  const push = (tex, geo) => {
    if (!buckets.has(tex)) buckets.set(tex, []);
    buckets.get(tex).push(geo);
  };

  const SHOP_TOP = 9; // signage starts above the retail band
  const WALL_TOP = 78; // as high as a screen ever climbs

  frontages(rect).forEach((f, fi) => {
    const bays = Math.max(6, Math.round(f.len / 24));
    for (let b = 0; b < bays; b++) {
      const t0 = b / bays;
      const t1 = (b + 1) / bays;
      const bayW = f.len * (t1 - t0);
      const mid = f.at((t0 + t1) / 2);

      // A tall vertical banner claims the whole bay now and then — these are
      // the building-height posters that give the square its scale.
      if (r() < 0.22) {
        const bw = Math.min(bayW * 0.72, 12);
        const bh = 22 + r() * 26;
        const y = SHOP_TOP + 2 + r() * 10;
        const depth = 0.55 + r() * 0.5;
        const m = new THREE.Matrix4()
          .makeRotationY(f.yaw)
          .setPosition(mid.x + f.out.x * depth, y + bh / 2, mid.z + f.out.z * depth);
        push(bank.tall[(b + fi) % bank.tall.length], panelGeo(bw, bh, m));
        bezels.push(panelGeo(bw + 0.9, bh + 0.9, new THREE.Matrix4()
          .makeRotationY(f.yaw)
          .setPosition(mid.x + f.out.x * (depth - 0.18), y + bh / 2, mid.z + f.out.z * (depth - 0.18))));
        continue;
      }

      // Otherwise stack wide marquees and thin ribbons up the bay.
      let y = SHOP_TOP;
      let n = 0;
      while (y < WALL_TOP && n < 7) {
        const ribbon = r() < 0.3;
        const ph = ribbon ? 3.2 + r() * 1.6 : 7 + r() * 6;
        const pw = bayW * (0.8 + r() * 0.18);
        const depth = 0.5 + r() * 0.6;
        const cxp = mid.x + f.out.x * depth;
        const czp = mid.z + f.out.z * depth;
        const m = new THREE.Matrix4()
          .makeRotationY(f.yaw)
          .setPosition(cxp, y + ph / 2, czp);
        const tex = ribbon
          ? bank.ribbon[(b + n) % bank.ribbon.length]
          : bank.wide[(b * 3 + n + fi) % bank.wide.length];
        push(tex, panelGeo(pw, ph, m));
        bezels.push(panelGeo(pw + 0.8, ph + 0.8, new THREE.Matrix4()
          .makeRotationY(f.yaw)
          .setPosition(mid.x + f.out.x * (depth - 0.16), y + ph / 2, mid.z + f.out.z * (depth - 0.16))));

        y += ph + (r() < 0.18 ? 3 + r() * 6 : 0.7); // occasional bare gap
        n++;
      }
    }

    // Corner wraps: a panel turned 45° at each end of the wall, so the
    // signage visibly folds around the building instead of stopping dead.
    [0, 1].forEach((end) => {
      const p = f.at(end ? 0.985 : 0.015);
      const bh = 9 + r() * 7;
      const y = SHOP_TOP + 4 + r() * 14;
      const m = new THREE.Matrix4()
        .makeRotationY(f.yaw + (end ? -0.72 : 0.72))
        .setPosition(p.x + f.out.x * 1.2, y + bh / 2, p.z + f.out.z * 1.2);
      push(bank.wide[(fi + end + 3) % bank.wide.length], panelGeo(12, bh, m));
    });
  });

  // ── bake ────────────────────────────────────────────────────────────
  const signMeshes = [];
  let i = 0;
  buckets.forEach((geos, tex) => {
    const mesh = new THREE.Mesh(
      merge(geos),
      new THREE.MeshStandardMaterial({
        map: tex,
        emissiveMap: tex,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: SIGN_LIGHT.screen,
        roughness: 0.42,
        metalness: 0.04,
        side: THREE.DoubleSide,
      })
    );
    // Each merged sheet breathes on its own phase, so the wall shimmers the
    // way a wall of independent screens does.
    mesh.userData.pulse = 0.5 + ((i * 3) % 7) * 0.19;
    mesh.userData.baseEmissive = SIGN_LIGHT.screen;
    signMeshes.push(mesh);
    group.add(mesh);
    i++;
  });

  if (bezels.length) {
    const frame = new THREE.Mesh(
      merge(bezels),
      new THREE.MeshStandardMaterial({
        color: atmo.dark ? 0x0a0d12 : 0x1a1e25,
        roughness: 0.7,
        metalness: 0.4,
        side: THREE.DoubleSide,
      })
    );
    group.add(frame);
  }

  return signMeshes;
}

// ── Street-level retail ───────────────────────────────────────────────

/**
 * The continuous shopfront band under the signs: glass, awning, fascia sign.
 * Without this the buildings meet the pavement as blank concrete and the
 * square reads as an empty film set.
 */
function buildShopFronts(engine, group, rect, bank) {
  const r = mulberry(90210);
  const atmo = engine.atmo;

  const glassGeos = [];
  const awningGeos = [];
  const fasciaBuckets = new Map();
  const trimGeos = [];

  frontages(rect).forEach((f) => {
    const units = Math.max(8, Math.round(f.len / 15));
    for (let u = 0; u < units; u++) {
      const t = (u + 0.5) / units;
      const p = f.at(t);
      const uw = (f.len / units) * 0.92;

      // shopfront glazing, 0.4 → 4.6m
      glassGeos.push(panelGeo(uw, 4.2, new THREE.Matrix4()
        .makeRotationY(f.yaw)
        .setPosition(p.x + f.out.x * 0.3, 2.5, p.z + f.out.z * 0.3)));

      // fascia sign above the glass
      const tex = bank.shop[u % bank.shop.length];
      if (!fasciaBuckets.has(tex)) fasciaBuckets.set(tex, []);
      fasciaBuckets.get(tex).push(panelGeo(uw, 2.4, new THREE.Matrix4()
        .makeRotationY(f.yaw)
        .setPosition(p.x + f.out.x * 0.45, 6.2, p.z + f.out.z * 0.45)));

      // canvas awning cantilevered over the pavement
      if (r() < 0.62) {
        const aw = new THREE.PlaneGeometry(uw, 2.6);
        const m = new THREE.Matrix4()
          .makeRotationY(f.yaw)
          .multiply(new THREE.Matrix4().makeRotationX(-1.05));
        m.setPosition(p.x + f.out.x * 1.5, 4.9, p.z + f.out.z * 1.5);
        aw.applyMatrix4(m);
        awningGeos.push(aw);
      }

      // pilaster between units
      trimGeos.push(panelGeo(0.7, 7.4, new THREE.Matrix4()
        .makeRotationY(f.yaw)
        .setPosition(
          p.x + f.out.x * 0.6 + (f.out.z ? uw / 2 : 0),
          3.7,
          p.z + f.out.z * 0.6 + (f.out.x ? uw / 2 : 0)
        )));
    }
  });

  // Warm interior glow spilling onto the pavement — the single biggest cue
  // that the ground floor is occupied.
  const glass = new THREE.Mesh(
    merge(glassGeos),
    new THREE.MeshStandardMaterial({
      color: 0xffe9c4,
      emissive: new THREE.Color(0xffd79a),
      emissiveIntensity: atmo.dark ? 0.95 : 0.18,
      roughness: 0.18,
      metalness: 0.1,
      side: THREE.DoubleSide,
    })
  );
  group.add(glass);

  fasciaBuckets.forEach((geos, tex) => {
    group.add(new THREE.Mesh(
      merge(geos),
      new THREE.MeshStandardMaterial({
        map: tex,
        emissiveMap: tex,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: atmo.dark ? 0.7 : 0.22,
        roughness: 0.5,
        side: THREE.DoubleSide,
      })
    ));
  });

  if (awningGeos.length) {
    group.add(new THREE.Mesh(
      merge(awningGeos),
      new THREE.MeshStandardMaterial({ color: 0x8f1f2c, roughness: 0.9, side: THREE.DoubleSide })
    ));
  }
  group.add(new THREE.Mesh(
    merge(trimGeos),
    new THREE.MeshStandardMaterial({ color: 0x171b21, roughness: 0.75, metalness: 0.3, side: THREE.DoubleSide })
  ));
}

// ── The landmark stack ────────────────────────────────────────────────

/**
 * The slender tower of stacked screens that closes the view down the avenue —
 * our answer to the wedge tower at the south tip of the real square, ball and
 * all. It is mounted on the face of the building that already stands there,
 * so it needs no lot of its own.
 */
function buildLandmarkStack(engine, group, rect) {
  const x = rect.cx - 38; // centred on the lot nearest the avenue
  const z = rect.z1 + 16; // the south frontage wall line
  const atmo = engine.atmo;

  const shaft = new THREE.Mesh(
    new THREE.BoxGeometry(20, 120, 3),
    new THREE.MeshStandardMaterial({ color: 0x0b0e13, roughness: 0.55, metalness: 0.6 })
  );
  shaft.position.set(x, 62, z - 1.6);
  shaft.rotation.y = Math.PI;
  shaft.castShadow = true;
  group.add(shaft);

  // A column of screens climbing the shaft, largest at the bottom.
  const bank = [];
  let y = 12;
  let i = 0;
  while (y < 112) {
    const h = i < 3 ? 20 : 12;
    const tex = makeAdTexture(i % 2 ? "tall" : "wide", 500 + i);
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(17, h - 2),
      new THREE.MeshStandardMaterial({
        map: tex,
        emissiveMap: tex,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: SIGN_LIGHT.screen,
        roughness: 0.35,
      })
    );
    panel.position.set(x, y + h / 2, z + 0.2);
    panel.rotation.y = Math.PI;
    panel.userData.pulse = 0.6 + (i % 5) * 0.2;
    panel.userData.baseEmissive = SIGN_LIGHT.screen;
    bank.push(panel);
    group.add(panel);
    y += h;
    i++;
  }

  // Mast and the descending ball.
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.6, 26, 10),
    new THREE.MeshStandardMaterial({ color: 0x2b3038, roughness: 0.4, metalness: 0.8 })
  );
  mast.position.set(x, 133, z - 1.6);
  group.add(mast);

  const ball = new THREE.Mesh(
    new THREE.IcosahedronGeometry(3.1, 1),
    new THREE.MeshStandardMaterial({
      color: 0xdff3ff,
      emissive: new THREE.Color(0xbfe6ff),
      emissiveIntensity: atmo.dark ? 2.2 : 0.4,
      roughness: 0.15,
      metalness: 0.3,
    })
  );
  ball.position.set(x, 140, z - 1.6);
  ball.userData.bloom = true;
  ball.layers.enable(1);
  group.add(ball);

  return bank;
}

// ── Plaza furniture ───────────────────────────────────────────────────

/**
 * The red café tables and chairs that fill the pedestrian pads, plus planters
 * and steel barricades along the kerbs.
 */
function buildPlazaFurniture(engine, group, pads) {
  const r = mulberry(31337);
  const red = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.55, metalness: 0.15 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa1a9, roughness: 0.4, metalness: 0.75 });

  const tableTop = new THREE.CylinderGeometry(0.62, 0.62, 0.08, 14);
  const tableLeg = new THREE.CylinderGeometry(0.06, 0.09, 0.72, 8);
  const chairSeat = new THREE.BoxGeometry(0.44, 0.07, 0.44);
  const chairBack = new THREE.BoxGeometry(0.44, 0.5, 0.06);

  const COUNT = 110;
  const tops = new THREE.InstancedMesh(tableTop, red, COUNT);
  const legs = new THREE.InstancedMesh(tableLeg, steel, COUNT);
  const seats = new THREE.InstancedMesh(chairSeat, red, COUNT * 3);
  const backs = new THREE.InstancedMesh(chairBack, red, COUNT * 3);
  const d = new THREE.Object3D();

  let ti = 0;
  let ci = 0;
  pads.forEach((pad) => {
    const per = Math.floor(COUNT / pads.length);
    for (let k = 0; k < per && ti < COUNT; k++) {
      // clustered toward the middle of the pad, clear of the kerbs
      const px = pad.cx + (r() - 0.5) * pad.w * 0.66;
      const pz = pad.cz + (r() - 0.5) * pad.d * 0.66;

      d.position.set(px, 0.98, pz);
      d.rotation.set(0, 0, 0);
      d.updateMatrix();
      tops.setMatrixAt(ti, d.matrix);
      d.position.set(px, 0.58, pz);
      d.updateMatrix();
      legs.setMatrixAt(ti, d.matrix);
      ti++;

      const chairs = 2 + Math.floor(r() * 2);
      for (let c = 0; c < chairs && ci < COUNT * 3; c++) {
        const a = r() * Math.PI * 2;
        const sx = px + Math.cos(a) * 1.0;
        const sz = pz + Math.sin(a) * 1.0;
        d.position.set(sx, 0.46, sz);
        d.rotation.set(0, -a + Math.PI / 2, 0);
        d.updateMatrix();
        seats.setMatrixAt(ci, d.matrix);
        d.position.set(sx + Math.cos(a) * 0.2, 0.74, sz + Math.sin(a) * 0.2);
        d.updateMatrix();
        backs.setMatrixAt(ci, d.matrix);
        ci++;
      }
    }
  });
  tops.count = ti;
  legs.count = ti;
  seats.count = ci;
  backs.count = ci;
  [tops, legs, seats, backs].forEach((m) => {
    m.instanceMatrix.needsUpdate = true;
    m.castShadow = true;
    group.add(m);
  });

  // Concrete planters and steel crowd barriers along the road kerbs.
  const planterGeo = new THREE.CylinderGeometry(1.1, 0.9, 1.0, 10);
  const planter = new THREE.InstancedMesh(
    planterGeo,
    new THREE.MeshStandardMaterial({ color: 0x6f6a61, roughness: 0.95 }),
    pads.length * 8
  );
  const shrubGeo = new THREE.IcosahedronGeometry(0.85, 0);
  const shrub = new THREE.InstancedMesh(
    shrubGeo,
    new THREE.MeshStandardMaterial({ color: 0x2f6b34, roughness: 1 }),
    pads.length * 8
  );
  let pi = 0;
  pads.forEach((pad) => {
    for (let k = 0; k < 8; k++) {
      const px = pad.cx + (k / 7 - 0.5) * pad.w * 0.86;
      const pz = pad.cz + pad.sz * pad.d * 0.46;
      d.position.set(px, 0.72, pz);
      d.rotation.set(0, 0, 0);
      d.updateMatrix();
      planter.setMatrixAt(pi, d.matrix);
      d.position.set(px, 1.5, pz);
      d.updateMatrix();
      shrub.setMatrixAt(pi, d.matrix);
      pi++;
    }
  });
  planter.count = pi;
  shrub.count = pi;
  planter.instanceMatrix.needsUpdate = true;
  shrub.instanceMatrix.needsUpdate = true;
  planter.castShadow = true;
  group.add(planter, shrub);
}

/**
 * Food carts, newsstands and flag poles — the small clutter that stops the
 * pavement reading as an empty parade ground.
 */
function buildStreetClutter(engine, group, rect, pads) {
  const r = mulberry(777);
  const cartBody = new THREE.MeshStandardMaterial({ color: 0xcfd4da, roughness: 0.45, metalness: 0.35 });
  const umbrella = new THREE.MeshStandardMaterial({ color: 0xe8b32c, roughness: 0.85, side: THREE.DoubleSide });

  pads.forEach((pad, i) => {
    for (let k = 0; k < 2; k++) {
      const px = pad.cx + (r() - 0.5) * pad.w * 0.7;
      const pz = pad.cz + (r() - 0.5) * pad.d * 0.7;
      const cart = new THREE.Group();
      cart.position.set(px, 0.24, pz);
      cart.rotation.y = r() * Math.PI * 2;

      const box = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 1.2), cartBody);
      box.position.y = 0.85;
      box.castShadow = true;
      cart.add(box);

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), cartBody);
      pole.position.y = 1.6;
      cart.add(pole);

      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.7, 0.6, 8), umbrella);
      cone.position.y = 2.9;
      cart.add(cone);

      group.add(cart);
      engine.propColliders.push({ cx: px, cz: pz, hw: 1.4, hd: 0.9, h: 1.6, prop: true });
    }

    // A flagpole per pad, angled out over the pavement.
    if (i < 3) {
      const fx = pad.cx + pad.sx * pad.w * 0.34;
      const fz = pad.cz - pad.sz * pad.d * 0.4;
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.12, 9, 8),
        new THREE.MeshStandardMaterial({ color: 0xd8dce1, roughness: 0.35, metalness: 0.7 })
      );
      mast.position.set(fx, 4.5, fz);
      group.add(mast);
      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(2.6, 1.5),
        new THREE.MeshStandardMaterial({ color: 0xb63a3a, roughness: 0.9, side: THREE.DoubleSide })
      );
      flag.position.set(fx + 1.4, 8.1, fz);
      group.add(flag);
      engine.propColliders.push({ cx: fx, cz: fz, hw: 0.3, hd: 0.3, h: 9, prop: true });
    }
  });

  // Overhead signal masts on each approach, so the crossing reads as a real
  // junction rather than a shared surface.
  const armMat = new THREE.MeshStandardMaterial({ color: 0x2f353d, roughness: 0.5, metalness: 0.6 });
  const AV = GRID.ROAD_W_AVENUE / 2;
  const ST = GRID.ROAD_W_STREET / 2;
  [
    [rect.cx - AV - 3, rect.cz - ST - 10, 1],
    [rect.cx + AV + 3, rect.cz + ST + 10, -1],
  ].forEach(([mx, mz, dir]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 8.5, 8), armMat);
    post.position.set(mx, 4.25, mz);
    post.castShadow = true;
    group.add(post);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(11, 0.3, 0.3), armMat);
    arm.position.set(mx + dir * 5.5, 8.2, mz);
    group.add(arm);
    engine.propColliders.push({ cx: mx, cz: mz, hw: 0.35, hd: 0.35, h: 8.5, prop: true });
  });
}

// ── Crowd ─────────────────────────────────────────────────────────────

/**
 * A dense standing crowd on top of the walking NPCs.
 *
 * The animated NpcSystem gives the square its motion, but a couple of hundred
 * walkers still leaves visible pavement. These are static instanced figures —
 * six draw calls for the lot — packed into the gaps so the plaza reads as
 * genuinely full, which is the single most recognisable thing about the place.
 */
function buildCrowd(engine, group, pads) {
  const r = mulberry(20240);
  const positions = [];
  const PER_PAD = 78;

  pads.forEach((pad) => {
    for (let i = 0; i < PER_PAD; i++) {
      // Biased toward the kerb-facing half of the pad, where people actually
      // stand to look at the signs.
      const bias = Math.pow(r(), 0.7);
      const px = pad.cx + (r() - 0.5) * pad.w * 0.92;
      const pz = pad.cz - pad.sz * (bias - 0.5) * pad.d * 0.9;
      // most face the middle of the crossing, phones up
      const toward = Math.atan2(-pad.sx, -pad.sz) + (r() - 0.5) * 1.9;
      positions.push([px, pz, toward]);
    }
  });

  const crowd = makePeople(positions);
  crowd.name = "times-square-crowd";
  group.add(crowd);
  return crowd;
}

// ── Orchestration ─────────────────────────────────────────────────────

/**
 * Build the whole square. Called from ThreeCityEngine as one deferred chunk.
 */
export function buildTimesSquare(engine) {
  const isDark = engine.theme === "dark";
  const atmo = engine.atmo;
  const ts = timesSquareRect();
  const cx = ts.cx;
  const cz = ts.cz;
  const w = ts.x1 - ts.x0;
  const d = ts.z1 - ts.z0;
  engine.timesSquareCenter = { x: cx, z: cz };

  const g = new THREE.Group();
  g.name = "times-square";

  // ── Paving ──────────────────────────────────────────────────────────
  const paveCv = document.createElement("canvas");
  paveCv.width = paveCv.height = 512;
  const pc = paveCv.getContext("2d");
  pc.fillStyle = isDark ? "#3a2126" : "#8d5b53";
  pc.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 32) {
    for (let x = 0; x < 512; x += 64) {
      const off = (y / 32) % 2 ? 32 : 0;
      const v = Math.random() * 22 - 11;
      pc.fillStyle = isDark
        ? `rgb(${64 + v},${38 + v},${42 + v})`
        : `rgb(${156 + v},${100 + v},${92 + v})`;
      pc.fillRect(x + off + 2, y + 2, 60, 28);
    }
  }
  for (let i = 0; i < 9000; i++) {
    pc.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
    pc.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
  }
  const paveTex = finishTex(paveCv);
  paveTex.repeat.set(10, 10);

  // ── The bow-tie plazas ──────────────────────────────────────────────
  // Real Times Square is a CROSSROADS: the avenue and the street run straight
  // through it and the pedestrian granite fills the four quadrants between
  // them. The rect's centre is exactly that crossing (see cityGrid's
  // TIMES_SQUARE range), so the quadrants fall out of the road half-widths.
  const AV_HALF = GRID.ROAD_W_AVENUE / 2;
  const ST_HALF = GRID.ROAD_W_STREET / 2;
  const KERB = 1.2;
  const paveMat = new THREE.MeshStandardMaterial({
    map: paveTex,
    color: atmo.plazaPaveTint,
    roughness: 0.88,
    metalness: 0.03,
  });
  const kerbMat = new THREE.MeshStandardMaterial({ color: 0xb9b2a6, roughness: 0.9 });

  engine.timesSquarePads = [];
  [-1, 1].forEach((sx) => {
    [-1, 1].forEach((sz) => {
      const xInner = cx + sx * (AV_HALF + KERB);
      const xOuter = cx + sx * (w / 2);
      const zInner = cz + sz * (ST_HALF + KERB);
      const zOuter = cz + sz * (d / 2);
      const pw = Math.abs(xOuter - xInner);
      const pd = Math.abs(zOuter - zInner);
      const pcx = (xInner + xOuter) / 2;
      const pcz = (zInner + zOuter) / 2;

      const pad = new THREE.Mesh(new THREE.PlaneGeometry(pw, pd), paveMat);
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(pcx, 0.22, pcz);
      pad.receiveShadow = true;
      g.add(pad);

      const kerbA = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, pd), kerbMat);
      kerbA.position.set(xInner, 0.3, pcz);
      g.add(kerbA);
      const kerbB = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.3, 0.6), kerbMat);
      kerbB.position.set(pcx, 0.3, zInner);
      g.add(kerbB);

      engine.timesSquarePads.push({ cx: pcx, cz: pcz, w: pw, d: pd, sx, sz });
    });
  });

  // Crosswalks striping both roads where they cut the square.
  const zebraMat = new THREE.MeshBasicMaterial({ color: 0xeef0f2 });
  [-1, 1].forEach((sz) => {
    for (let k = -4; k <= 4; k++) {
      const st = new THREE.Mesh(new THREE.PlaneGeometry(1.5, GRID.ROAD_W_AVENUE - 4), zebraMat);
      st.rotation.x = -Math.PI / 2;
      st.position.set(cx + k * 2.4, 0.18, cz + sz * (ST_HALF + 5));
      g.add(st);
    }
  });
  [-1, 1].forEach((sx) => {
    for (let k = -3; k <= 3; k++) {
      const st = new THREE.Mesh(new THREE.PlaneGeometry(GRID.ROAD_W_STREET - 4, 1.5), zebraMat);
      st.rotation.x = -Math.PI / 2;
      st.position.set(cx + sx * (AV_HALF + 6), 0.18, cz + k * 2.4);
      g.add(st);
    }
  });

  // ── The red steps ───────────────────────────────────────────────────
  const stepMat = new THREE.MeshStandardMaterial({
    color: 0xc02b3a,
    roughness: 0.35,
    metalness: 0.1,
    emissive: new THREE.Color(0xc02b3a),
    emissiveIntensity: atmo.dark ? 0.55 : 0.08,
  });
  {
    const pad = engine.timesSquarePads.find((q) => q.sx < 0 && q.sz < 0);
    for (let i = 0; i < 9; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(pad.w * 0.62, 0.62, 1.9), stepMat);
      step.position.set(pad.cx, 0.32 + i * 0.62, pad.cz - pad.d * 0.3 + i * 1.9);
      step.castShadow = true;
      step.receiveShadow = true;
      g.add(step);
    }
  }

  // ── Bollards along each pad's road-facing kerbs ──────────────────────
  const bollardMat = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.5, metalness: 0.6 });
  engine.timesSquareColliders = [];
  engine.timesSquarePads.forEach((pad) => {
    const xInner = pad.cx - pad.sx * (pad.w / 2);
    const zInner = pad.cz - pad.sz * (pad.d / 2);
    for (let k = 0; k < 9; k++) {
      const bz = pad.cz + (k / 8 - 0.5) * pad.d * 0.9;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 1.1, 10), bollardMat);
      b.position.set(xInner + pad.sx * 1.4, 0.55, bz);
      b.castShadow = true;
      g.add(b);
    }
    for (let k = 0; k < 11; k++) {
      const bx = pad.cx + (k / 10 - 0.5) * pad.w * 0.9;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 1.1, 10), bollardMat);
      b.position.set(bx, 0.55, zInner + pad.sz * 1.4);
      b.castShadow = true;
      g.add(b);
    }
  });

  // ── Signage, retail, landmark ───────────────────────────────────────
  const bank = makeAdBank();
  engine._tsPanels = [
    ...buildSignWall(engine, g, ts, bank),
    ...buildLandmarkStack(engine, g, ts),
  ];
  buildShopFronts(engine, g, ts, bank);

  // ── Lighting ────────────────────────────────────────────────────────
  engine.timesSquarePads.forEach((pad) => {
    const xInner = pad.cx - pad.sx * (pad.w / 2);
    const zInner = pad.cz - pad.sz * (pad.d / 2);
    for (let k = 0; k < 4; k++) {
      const bz = pad.cz + (k / 3 - 0.5) * pad.d * 0.8;
      engine.makeVictorianLamp(xInner + pad.sx * 3.2, bz, {
        yaw: pad.sx > 0 ? -Math.PI / 2 : Math.PI / 2,
        scale: 1.25,
      });
    }
    for (let k = 0; k < 5; k++) {
      const bx = pad.cx + (k / 4 - 0.5) * pad.w * 0.8;
      engine.makeVictorianLamp(bx, zInner + pad.sz * 3.2, {
        yaw: pad.sz > 0 ? Math.PI : 0,
        scale: 1.25,
      });
    }
  });
  [
    { ax: 0, az: -1 },
    { ax: 0, az: 1 },
    { ax: -1, az: 0 },
    { ax: 1, az: 0 },
  ].forEach(({ ax, az }) => {
    for (let k = 1; k <= 6; k++) {
      const rad = w * 0.5 + k * 22;
      const px = cx + ax * rad;
      const pz = cz + az * rad;
      [-1, 1].forEach((sdir) => {
        const ox = az !== 0 ? sdir * 10 : 0;
        const oz = ax !== 0 ? sdir * 10 : 0;
        const sl = makeStreetlight();
        sl.position.set(px + ox, 0, pz + oz);
        sl.rotation.y = Math.atan2(-ax, -az) + (sdir > 0 ? Math.PI : 0);
        sl.traverse((o) => { if (o.userData.bloom) o.layers.enable(1); });
        engine.environmentGroup.add(sl);
        engine.propColliders.push({ cx: px + ox, cz: pz + oz, hw: 0.32, hd: 0.32, h: 8, prop: true });
      });
    }
  });

  // ── Furniture, clutter, crowd ───────────────────────────────────────
  buildPlazaFurniture(engine, g, engine.timesSquarePads);
  buildStreetClutter(engine, g, ts, engine.timesSquarePads);
  buildCrowd(engine, g, engine.timesSquarePads);

  // Keep the lamp bank in step with the clock even on a mid-session rebuild.
  MAT.lampGlobe.needsUpdate = true;

  engine.environmentGroup.add(g);
  engine.timesSquareGroup = g;
}
