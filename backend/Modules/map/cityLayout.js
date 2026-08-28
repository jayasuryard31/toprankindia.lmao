/**
 * VELORA HARBOR - Fictional City Layout (single source of truth)
 *
 * A large coastal grid city expressed as GeoJSON in a fake lng/lat window.
 * The land grid is effectively endless to the north / south / west; the ocean
 * sits to the east. Ranked buildings are placed on an outward spiral of block
 * plots (`assignPlotForRank`) so there is always a fresh plot for the next
 * site - plot 1 is the central "crown", plots radiate outward by rank.
 */

const ORIGIN = [72.9, 19.09];
const CROWN = [72.9, 19.09]; // heart of Central District - spiral origin

// One city block.
const BLOCK = 0.0055;
// Phyllotaxis radius coefficient - plot `n` sits at radius PLOT_SPREAD*sqrt(n)
// on a golden-angle spiral, so plots fan out evenly and endlessly from the
// crown with roughly-even spacing (no clumps, no gaps).
const PLOT_SPREAD = 0.0095;

// How far the drawn grid / water / terrain extend from the crown (degrees).
const GRID_REACH = 0.34; // ~62 roads each axis over the drawn area
const WORLD_REACH = 3.0; // water & terrain fills stretch this far - "never ending"

// Everything east of this longitude is open ocean.
const COAST_LNG = CROWN[0] + 0.135;

const BOUNDS = {
  minLng: CROWN[0] - GRID_REACH,
  maxLng: COAST_LNG,
  minLat: CROWN[1] - GRID_REACH,
  maxLat: CROWN[1] + GRID_REACH,
};

// ── Helpers ────────────────────────────────────────────────────────────

const rect = (minLng, minLat, maxLng, maxLat) => [[
  [minLng, minLat], [maxLng, minLat], [maxLng, maxLat], [minLng, maxLat], [minLng, minLat],
]];

const feature = (geometry, properties = {}) => ({ type: "Feature", properties, geometry });
const fc = (features) => ({ type: "FeatureCollection", features });
const polygon = (coordinates, properties) => feature({ type: "Polygon", coordinates }, properties);
const line = (coordinates, properties) => feature({ type: "LineString", coordinates }, properties);
const round6 = (n) => Number(n.toFixed(6));

// ── Districts (a 3×3 belt of named quarters around the crown) ──────────

const DISTRICT_DEFS = [
  { id: "highcrest",  name: "Highcrest",        color: "#F472B6", cx: -1, cy: 1 },
  { id: "northpoint", name: "Northpoint",       color: "#38BDF8", cx: 0,  cy: 1 },
  { id: "meridian",   name: "Meridian Heights", color: "#22D3EE", cx: 1,  cy: 1 },
  { id: "westfield",  name: "Westfield",        color: "#A78BFA", cx: -1, cy: 0 },
  { id: "central",    name: "Central District", color: "#F05A38", cx: 0,  cy: 0 },
  { id: "harborview", name: "Harborview",       color: "#34D399", cx: 1,  cy: 0 },
  { id: "greenridge", name: "Greenridge",       color: "#84CC16", cx: -1, cy: -1 },
  { id: "southbay",   name: "Southbay",         color: "#FBBF24", cx: 0,  cy: -1 },
  { id: "dockside",   name: "Dockside",         color: "#FB923C", cx: 1,  cy: -1 },
];

const DIST_SPAN = 0.03; // half-width of a district square
const DIST_GAP = 0.001;

const DISTRICTS = fc(
  DISTRICT_DEFS.map((d) => {
    const cLng = CROWN[0] + d.cx * (DIST_SPAN * 2 + DIST_GAP);
    const cLat = CROWN[1] + d.cy * (DIST_SPAN * 2 + DIST_GAP);
    return polygon(rect(cLng - DIST_SPAN, cLat - DIST_SPAN, cLng + DIST_SPAN, cLat + DIST_SPAN), {
      id: d.id,
      name: d.name,
      color: d.color,
      centroid: [round6(cLng), round6(cLat)],
      box: [cLng - DIST_SPAN, cLat - DIST_SPAN, cLng + DIST_SPAN, cLat + DIST_SPAN],
    });
  })
);

// ── Water / terrain / parks ────────────────────────────────────────────

const WATER = fc([
  polygon(rect(COAST_LNG, CROWN[1] - WORLD_REACH, CROWN[0] + WORLD_REACH, CROWN[1] + WORLD_REACH), {
    name: "Velora Harbor",
  }),
]);

const TERRAIN = fc([
  // Greenridge Hills - the endless soft-green frontier west of the grid.
  polygon(rect(CROWN[0] - WORLD_REACH, CROWN[1] - WORLD_REACH, BOUNDS.minLng + 0.06, CROWN[1] + WORLD_REACH), {
    name: "Greenridge Hills",
  }),
  // Northern and southern green belts wrapping the grid.
  polygon(rect(BOUNDS.minLng, BOUNDS.maxLat - 0.05, COAST_LNG, CROWN[1] + WORLD_REACH), { name: "North Commons" }),
  polygon(rect(BOUNDS.minLng, CROWN[1] - WORLD_REACH, COAST_LNG, BOUNDS.minLat + 0.05), { name: "South Meadows" }),
]);

const PARKS = fc([
  polygon(rect(CROWN[0] - 0.006, CROWN[1] - 0.004, CROWN[0] + 0.005, CROWN[1] + 0.006), { name: "Velora Central Park" }),
  polygon(rect(CROWN[0] - 0.098, CROWN[1] + 0.062, CROWN[0] - 0.08, CROWN[1] + 0.08), { name: "Highcrest Green" }),
  polygon(rect(CROWN[0] + 0.062, CROWN[1] - 0.098, CROWN[0] + 0.082, CROWN[1] - 0.078), { name: "Dockside Commons" }),
  polygon(rect(CROWN[0] + 0.088, CROWN[1] + 0.032, COAST_LNG - 0.006, CROWN[1] + 0.05), { name: "Marina Gardens" }),
]);

// ── Road grid ──────────────────────────────────────────────────────────

function buildRoads() {
  const primary = [];
  const secondary = [];
  const minLng = BOUNDS.minLng;
  const maxLng = COAST_LNG;
  const minLat = BOUNDS.minLat;
  const maxLat = BOUNDS.maxLat;

  let i = 0;
  for (let lng = CROWN[0] - GRID_REACH; lng <= COAST_LNG; lng += BLOCK, i++) {
    const major = i % 4 === 0;
    (major ? primary : secondary).push(
      line([[round6(lng), minLat], [round6(lng), maxLat]], { id: `blvd-${i}`, kind: major ? "primary" : "secondary" })
    );
  }
  let j = 0;
  for (let lat = CROWN[1] - GRID_REACH; lat <= CROWN[1] + GRID_REACH; lat += BLOCK, j++) {
    const major = j % 4 === 0;
    (major ? primary : secondary).push(
      line([[minLng, round6(lat)], [maxLng, round6(lat)]], { id: `ave-${j}`, kind: major ? "primary" : "secondary" })
    );
  }
  return { primary: fc(primary), secondary: fc(secondary) };
}

const ROADS = buildRoads();

// ── Plots - an endless golden-angle (sunflower) spiral from the crown ──

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ~137.5°
const MAX_LAND_LNG = COAST_LNG - PLOT_SPREAD * 0.4;

/** Deterministic lng/lat for plot `n` (1-based). Always on land. */
function plotPoint(n) {
  const a = n * GOLDEN_ANGLE;
  const r = PLOT_SPREAD * Math.sqrt(n);
  let lng = CROWN[0] + Math.cos(a) * r;
  const lat = CROWN[1] + Math.sin(a) * r;
  // Fold any plot that lands in the ocean back onto the land side.
  if (lng > MAX_LAND_LNG) lng = 2 * MAX_LAND_LNG - lng;
  return [lng, lat];
}

function districtAt(lng, lat) {
  for (const f of DISTRICTS.features) {
    const [a, b, c, d] = f.properties.box;
    if (lng >= a && lng <= c && lat >= b && lat <= d) return f.properties.name;
  }
  return "Velora Frontier";
}

function tierForRank(r) {
  if (r === 1) return "CROWN";
  if (r <= 3) return "TOP3";
  if (r <= 10) return "TOP10";
  return "STANDARD";
}

const plotAt = (rank, lng, lat) => ({
  plotNumber: `PLOT-${String(rank).padStart(4, "0")}`,
  district: districtAt(lng, lat),
  lng: round6(lng),
  lat: round6(lat),
  tier: tierForRank(rank),
});

/**
 * Deterministic plot for a 1-based all-time rank. Always resolves - the spiral
 * is endless, so every new site gets a fresh plot. O(1).
 */
function assignPlotForRank(rank) {
  const target = Math.max(1, Math.floor(Number(rank) || 1));
  const [lng, lat] = plotPoint(target);
  return plotAt(target, lng, lat);
}

// A finite prefix for the frontend fallback / offline render.
const PLOT_SLOTS = Array.from({ length: 600 }, (_, i) => assignPlotForRank(i + 1));

function getCityLayout() {
  return {
    origin: ORIGIN,
    crown: CROWN,
    bounds: BOUNDS,
    coastLng: COAST_LNG,
    block: BLOCK,
    districts: DISTRICTS,
    water: WATER,
    terrain: TERRAIN,
    parks: PARKS,
    roadsPrimary: ROADS.primary,
    roadsSecondary: ROADS.secondary,
    plots: PLOT_SLOTS,
  };
}

module.exports = { getCityLayout, assignPlotForRank, PLOT_SLOTS, ORIGIN, CROWN, BOUNDS, COAST_LNG };
