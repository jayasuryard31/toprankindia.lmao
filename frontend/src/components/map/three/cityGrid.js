/**
 * cityGrid.js — the single spatial source of truth for the Three.js city.
 *
 * A well-planned rectilinear grid, Manhattan/Barcelona style:
 *   - Avenues run North <-> South  (long axis = world Z)
 *   - Streets run East  <-> West   (short axis = world X)
 * The grid is carved into rectangular BLOCKS; every block is subdivided into
 * LOTS with a generous road setback, so a lot rectangle is always strictly
 * inside its block and can never touch asphalt. Buildings sit on lots only.
 *
 * Named DISTRICTS cover contiguous ranges of blocks and each carries an
 * ARCHETYPE that decides how its blocks are built (downtown towers vs. a
 * residential row of houses vs. a mid-rise perimeter block, etc).
 *
 * Coordinate system (matches ThreeCityEngine):
 *   +X = east, +Z = south, ground plane at y = 0. Origin = city centre.
 */

// ── Grid dimensions ────────────────────────────────────────────────────
export const GRID = {
  COLS: 8, // avenues  -> COLS-1 block columns
  ROWS: 20, // streets  -> ROWS-1 block rows
  AVENUE_SPACING: 154, // world units between avenues (X)
  STREET_SPACING: 100, // world units between streets (Z)
  ROAD_W_AVENUE: 22,
  ROAD_W_STREET: 14,
  LOT_SETBACK: 8, // gap between a lot edge and the block edge (sidewalk)
  LOT_COLS: 3, // lots across a block (X)
  LOT_ROWS: 2, // lots down a block (Z)
  SHORE_MARGIN: 60, // land between the outer avenue and the ocean
  OCEAN_SPAN: 900,
  GREENBELT: 260, // green hills strip on the west
};

export const BLOCK_COLS = GRID.COLS - 1;
export const BLOCK_ROWS = GRID.ROWS - 1;

const CITY_W = (GRID.COLS - 1) * GRID.AVENUE_SPACING;
const CITY_D = (GRID.ROWS - 1) * GRID.STREET_SPACING;
const HALF_W = CITY_W / 2;
const HALF_D = CITY_D / 2;

// Central roundabout plaza — a reserved patch of blocks at the middle.
const PLAZA = { c0: 2, c1: 4, r0: 8, r1: 10 };
// Central Park — a tall reserved rectangle just west of the plaza.
const PARK = { c0: 0, c1: 1, r0: 6, r1: 12 };
// Times Square heart — the crossroads block stays open as a pedestrian plaza
// ringed by mega-screens. Kept far from PARK so the two never read as one place.
const TIMES_SQUARE = { c0: 4, c1: 5, r0: 15, r1: 16 };

const inRange = (v, a, b) => v >= a && v <= b;

// ── Districts (block ranges + build archetype) ─────────────────────────
// archetype: "downtown" | "midtown" | "residential" | "waterfront"
export const DISTRICTS = [
  { id: "timessquare", name: "TIMES SQUARE", color: "#ff2e63", archetype: "timessquare", c: [3, BLOCK_COLS - 1], r: [14, 17] },
  { id: "northpoint", name: "NORTHPOINT", color: "#2f6fdb", archetype: "downtown", c: [3, BLOCK_COLS - 1], r: [13, BLOCK_ROWS - 1] },
  { id: "meridian", name: "MERIDIAN HEIGHTS", color: "#e0518f", archetype: "midtown", c: [0, 2], r: [13, BLOCK_ROWS - 1] },
  { id: "westfield", name: "WESTFIELD CENTRAL", color: "#8b5cf6", archetype: "midtown", c: [0, 2], r: [7, 12] },
  { id: "harborview", name: "HARBORVIEW", color: "#2fb37a", archetype: "waterfront", c: [4, BLOCK_COLS - 1], r: [7, 12] },
  { id: "greenridge", name: "GREENRIDGE SHORES", color: "#84cc16", archetype: "residential", c: [0, 2], r: [0, 6] },
  { id: "midtown-south", name: "MIDTOWN SOUTH", color: "#f0801f", archetype: "residential", c: [3, BLOCK_COLS - 1], r: [3, 6] },
  { id: "dockside", name: "DOCKSIDE", color: "#e0a020", archetype: "waterfront", c: [3, BLOCK_COLS - 1], r: [0, 2] },
];

export function districtForBlock(bx, bz) {
  for (const d of DISTRICTS) {
    if (inRange(bx, d.c[0], d.c[1]) && inRange(bz, d.r[0], d.r[1])) return d;
  }
  return DISTRICTS[0];
}

// ── Block geometry ─────────────────────────────────────────────────────

/** World-space rectangle of block (bx, bz), road gutters already removed. */
export function getBlock(bx, bz) {
  const cx = -HALF_W + (bx + 0.5) * GRID.AVENUE_SPACING;
  const cz = -HALF_D + (bz + 0.5) * GRID.STREET_SPACING;
  const w = GRID.AVENUE_SPACING - GRID.ROAD_W_AVENUE;
  const d = GRID.STREET_SPACING - GRID.ROAD_W_STREET;
  const isPark = inRange(bx, PARK.c0, PARK.c1) && inRange(bz, PARK.r0, PARK.r1);
  const isPlaza = inRange(bx, PLAZA.c0, PLAZA.c1) && inRange(bz, PLAZA.r0, PLAZA.r1);
  const isTimesSquare =
    inRange(bx, TIMES_SQUARE.c0, TIMES_SQUARE.c1) && inRange(bz, TIMES_SQUARE.r0, TIMES_SQUARE.r1);
  return {
    bx, bz, cx, cz, w, d,
    x0: cx - w / 2, x1: cx + w / 2,
    z0: cz - d / 2, z1: cz + d / 2,
    isPark, isPlaza, isTimesSquare,
    buildable: !isPark && !isPlaza && !isTimesSquare,
  };
}

/** Lots inside a block: LOT_COLS x LOT_ROWS grid, inset by LOT_SETBACK. */
export function getLots(block) {
  const usableW = block.w - GRID.LOT_SETBACK * 2;
  const usableD = block.d - GRID.LOT_SETBACK * 2;
  const lw = usableW / GRID.LOT_COLS;
  const ld = usableD / GRID.LOT_ROWS;
  const lots = [];
  for (let lz = 0; lz < GRID.LOT_ROWS; lz++) {
    for (let lx = 0; lx < GRID.LOT_COLS; lx++) {
      const cx = block.x0 + GRID.LOT_SETBACK + (lx + 0.5) * lw;
      const cz = block.z0 + GRID.LOT_SETBACK + (lz + 0.5) * ld;
      lots.push({
        cx, cz,
        w: lw - 4,
        d: ld - 4,
        lx, lz,
        frontZ: lz === 0 ? -1 : 1, // which street this lot faces
      });
    }
  }
  return lots;
}

// ── Rank -> lot assignment (deterministic outward spiral) ───────────────

const cx0 = (BLOCK_COLS - 1) / 2;
const cz0 = (BLOCK_ROWS - 1) / 2;

const ORDERED_BLOCKS = (() => {
  const list = [];
  for (let bx = 0; bx < BLOCK_COLS; bx++) {
    for (let bz = 0; bz < BLOCK_ROWS; bz++) {
      const b = getBlock(bx, bz);
      if (!b.buildable) continue;
      const ring = Math.max(Math.abs(bx - cx0), Math.abs(bz - cz0));
      const ang = Math.atan2(bz - cz0, bx - cx0);
      list.push({ bx, bz, ring, ang });
    }
  }
  list.sort((a, b) => a.ring - b.ring || a.ang - b.ang);
  return list;
})();

const LOT_SLOTS = (() => {
  const slots = [];
  for (const blk of ORDERED_BLOCKS) {
    const lots = getLots(getBlock(blk.bx, blk.bz));
    for (let i = 0; i < lots.length; i++) {
      slots.push({ bx: blk.bx, bz: blk.bz, lotIndex: i });
    }
  }
  return slots;
})();

export const TOTAL_LOTS = LOT_SLOTS.length;

export function lotForRank(rank) {
  const idx = (Math.max(1, Math.floor(rank || 1)) - 1) % TOTAL_LOTS;
  const slot = LOT_SLOTS[idx];
  const block = getBlock(slot.bx, slot.bz);
  const lot = getLots(block)[slot.lotIndex];
  return { bx: slot.bx, bz: slot.bz, lotIndex: slot.lotIndex, lot, block };
}

/**
 * THE crown lot — the single most central buildable lot in the whole city,
 * hugging the central roundabout. Rank #1 always lands here so the top-paid
 * landmark literally stands at the heart of the metropolis.
 */
export function crownLot() {
  const pz = plazaRect();
  let best = null;
  let bestD = Infinity;
  for (let bx = 0; bx < BLOCK_COLS; bx++) {
    for (let bz = 0; bz < BLOCK_ROWS; bz++) {
      const block = getBlock(bx, bz);
      if (!block.buildable) continue;
      const lots = getLots(block);
      for (let i = 0; i < lots.length; i++) {
        const d = Math.hypot(lots[i].cx - pz.cx, lots[i].cz - pz.cz);
        if (d < bestD) {
          bestD = d;
          best = { lot: lots[i], block, bx, bz, lotIndex: i };
        }
      }
    }
  }
  return best;
}

/** A prominent lot near a district's centre — used for the hero (top-rank) tower. */
export function districtPrimeLot(d) {
  const bcx = Math.round((d.c[0] + d.c[1]) / 2);
  const bcz = Math.round((d.r[0] + d.r[1]) / 2);
  let block = getBlock(Math.min(BLOCK_COLS - 1, bcx), Math.min(BLOCK_ROWS - 1, bcz));
  if (!block.buildable) {
    let best = null;
    for (let bx = d.c[0]; bx <= d.c[1]; bx++) {
      for (let bz = d.r[0]; bz <= d.r[1]; bz++) {
        const b = getBlock(bx, bz);
        if (b.buildable) { best = b; break; }
      }
      if (best) break;
    }
    block = best || block;
  }
  const lots = getLots(block);
  return { lot: lots[Math.floor(lots.length / 2)], block, bx: block.bx, bz: block.bz };
}

export function forEachLot(cb) {
  let n = 0;
  for (const blk of ORDERED_BLOCKS) {
    const block = getBlock(blk.bx, blk.bz);
    const lots = getLots(block);
    for (let i = 0; i < lots.length; i++) {
      cb(lots[i], { bx: blk.bx, bz: blk.bz, lotIndex: i, slotIndex: n, block });
      n++;
    }
  }
}

/** Iterate buildable blocks in spiral order (for archetype-based fill). */
export function forEachBlock(cb) {
  ORDERED_BLOCKS.forEach((blk, i) => {
    cb(getBlock(blk.bx, blk.bz), { order: i, district: districtForBlock(blk.bx, blk.bz) });
  });
}

// ── Roads ──────────────────────────────────────────────────────────────
export function avenues() {
  const out = [];
  for (let c = 0; c < GRID.COLS; c++) {
    out.push({
      x: -HALF_W + c * GRID.AVENUE_SPACING,
      z0: -HALF_D - GRID.STREET_SPACING,
      z1: HALF_D + GRID.STREET_SPACING,
      major: c % 3 === 0,
      w: GRID.ROAD_W_AVENUE,
      c,
    });
  }
  return out;
}
export function streets() {
  const out = [];
  for (let r = 0; r < GRID.ROWS; r++) {
    out.push({
      z: -HALF_D + r * GRID.STREET_SPACING,
      x0: -HALF_W - GRID.AVENUE_SPACING,
      x1: HALF_W + GRID.AVENUE_SPACING,
      major: r % 4 === 0,
      w: GRID.ROAD_W_STREET,
      r,
    });
  }
  return out;
}

/** Intersection points of every avenue x every street. */
export function intersections() {
  const out = [];
  const av = avenues();
  const st = streets();
  for (const a of av) for (const s of st) out.push([a.x, s.z, a.major || s.major]);
  return out;
}

// ── Drivable road segments (park / plaza / water carved out) ───────────
function subtractRange([a, b], [c, d]) {
  if (d <= a || c >= b) return [[a, b]];
  const out = [];
  if (c > a) out.push([a, c]);
  if (d < b) out.push([d, b]);
  return out;
}

/**
 * The actual pieces of tarmac a vehicle may drive on. Straight roads that
 * would cross the park lawn, the roundabout garden, the ocean or the western
 * river are clipped out here, so traffic can never end up on grass or water.
 */
export function roadSegments() {
  const pk = parkRect();
  const pz = plazaRect();
  const avSegs = [];
  const stSegs = [];

  const avZ = [-HALF_D - 24, HALF_D + 24]; // island soil extends past the grid
  for (let c = 0; c < GRID.COLS; c++) {
    const x = -HALF_W + c * GRID.AVENUE_SPACING;
    let ranges = [avZ];
    if (x > pk.x0 + 4 && x < pk.x1 - 4) ranges = ranges.flatMap((r) => subtractRange(r, [pk.z0, pk.z1]));
    if (x > pz.x0 + 4 && x < pz.x1 - 4) ranges = ranges.flatMap((r) => subtractRange(r, [pz.z0, pz.z1]));
    ranges.forEach(([z0, z1]) => avSegs.push({ x, z0, z1, w: GRID.ROAD_W_AVENUE, major: c % 3 === 0 }));
  }

  const stX = [-HALF_W - 12, HALF_W + 12]; // stop short of the greenbelt river & the beach
  for (let r = 0; r < GRID.ROWS; r++) {
    const z = -HALF_D + r * GRID.STREET_SPACING;
    let ranges = [stX];
    if (z > pk.z0 + 4 && z < pk.z1 - 4) ranges = ranges.flatMap((rr) => subtractRange(rr, [pk.x0, pk.x1]));
    if (z > pz.z0 + 4 && z < pz.z1 - 4) ranges = ranges.flatMap((rr) => subtractRange(rr, [pz.x0, pz.x1]));
    ranges.forEach(([x0, x1]) => stSegs.push({ z, x0, x1, w: GRID.ROAD_W_STREET, major: r % 4 === 0 }));
  }
  return { avenues: avSegs, streets: stSegs };
}

/** Stable plot label for a lot. */
export function plotNumberFor(bx, bz, li) {
  const n = (bx * BLOCK_ROWS + bz) * (GRID.LOT_COLS * GRID.LOT_ROWS) + li + 1;
  return `PLOT-${String(n).padStart(4, "0")}`;
}

/** World point -> the lot it falls on (or null if road / reserved / off-grid). */
export function lotAt(x, z) {
  const bx = Math.round((x + HALF_W) / GRID.AVENUE_SPACING - 0.5);
  const bz = Math.round((z + HALF_D) / GRID.STREET_SPACING - 0.5);
  if (bx < 0 || bx >= BLOCK_COLS || bz < 0 || bz >= BLOCK_ROWS) return null;
  const block = getBlock(bx, bz);
  if (!block.buildable) return null;
  const lots = getLots(block);
  let best = lots[0];
  let bd = Infinity;
  let bi = 0;
  lots.forEach((l, i) => {
    const dd = (l.cx - x) ** 2 + (l.cz - z) ** 2;
    if (dd < bd) { bd = dd; best = l; bi = i; }
  });
  return {
    block, lot: best, lotIndex: bi, bx, bz,
    plotNumber: plotNumberFor(bx, bz, bi),
    district: districtForBlock(bx, bz),
  };
}

// ── Ocean / greenbelt / bounds ────────────────────────────────────────
export function ocean() {
  const shore = HALF_W + GRID.SHORE_MARGIN;
  return {
    shoreX: shore,
    x: shore + GRID.OCEAN_SPAN / 2,
    w: GRID.OCEAN_SPAN,
    z0: -HALF_D - GRID.STREET_SPACING * 6,
    z1: HALF_D + GRID.STREET_SPACING * 6,
    depthSpan: CITY_D + GRID.STREET_SPACING * 12,
  };
}
export function greenbelt() {
  const edge = -HALF_W - GRID.SHORE_MARGIN;
  return { edgeX: edge, x: edge - GRID.GREENBELT / 2, w: GRID.GREENBELT, span: CITY_D + GRID.STREET_SPACING * 8 };
}
export function worldBounds() {
  return { halfW: HALF_W, halfD: HALF_D, cityW: CITY_W, cityD: CITY_D };
}

// ── Reserved-area rectangles (world space) ─────────────────────────────
function rangeRect(range) {
  const a = getBlock(range.c0, range.r0);
  const b = getBlock(range.c1, range.r1);
  return {
    x0: a.x0 - GRID.ROAD_W_AVENUE / 2, x1: b.x1 + GRID.ROAD_W_AVENUE / 2,
    z0: a.z0 - GRID.ROAD_W_STREET / 2, z1: b.z1 + GRID.ROAD_W_STREET / 2,
    cx: (a.cx + b.cx) / 2, cz: (a.cz + b.cz) / 2,
  };
}
export const parkRect = () => rangeRect(PARK);
export const timesSquareRect = () => rangeRect(TIMES_SQUARE);
export const plazaRect = () => rangeRect(PLAZA);

// ── District polygons / centres (world space) ─────────────────────────
export function districtRect(d) {
  const a = getBlock(d.c[0], d.r[0]);
  const b = getBlock(d.c[1], d.r[1]);
  return {
    x0: a.x0 - GRID.ROAD_W_AVENUE / 2, x1: b.x1 + GRID.ROAD_W_AVENUE / 2,
    z0: a.z0 - GRID.ROAD_W_STREET / 2, z1: b.z1 + GRID.ROAD_W_STREET / 2,
  };
}
export function districtCenter(d) {
  const r = districtRect(d);
  return { cx: (r.x0 + r.x1) / 2, cz: (r.z0 + r.z1) / 2 };
}

// ── Seeded hash ───────────────────────────────────────────────────────
export function hash2(a, b) {
  let h = 2166136261 ^ Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
