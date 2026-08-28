/**
 * Static fallback copy of the Velora Harbor layout (mirrors the backend
 * `Modules/map/cityLayout.js`). Used as `initialData` for the map query so the
 * canvas renders instantly; the backend response overrides it once it resolves.
 */

const CROWN = [72.9, 19.09];
const BLOCK = 0.0055;
const GRID_REACH = 0.34;
const WORLD_REACH = 3.0;
const COAST_LNG = CROWN[0] + 0.135;

const BOUNDS = {
  minLng: CROWN[0] - GRID_REACH,
  maxLng: COAST_LNG,
  minLat: CROWN[1] - GRID_REACH,
  maxLat: CROWN[1] + GRID_REACH,
};

/** Default camera - frames the whole 9-district belt with terrain W and harbour E in view. */
export const CITY_CENTER = [72.905, 19.09];
export const CITY_ZOOM = 11.85;

const rect = (a, b, c, d) => [[[a, b], [c, b], [c, d], [a, d], [a, b]]];
const feat = (geometry, properties = {}) => ({ type: "Feature", properties, geometry });
const fc = (features) => ({ type: "FeatureCollection", features });
const poly = (coordinates, properties) => feat({ type: "Polygon", coordinates }, properties);
const line = (coordinates, properties) => feat({ type: "LineString", coordinates }, properties);
const r6 = (n) => Number(n.toFixed(6));

const DISTRICT_DEFS = [
  { id: "highcrest", name: "Highcrest", color: "#F472B6", cx: -1, cy: 1 },
  { id: "northpoint", name: "Northpoint", color: "#38BDF8", cx: 0, cy: 1 },
  { id: "meridian", name: "Meridian Heights", color: "#22D3EE", cx: 1, cy: 1 },
  { id: "westfield", name: "Westfield", color: "#A78BFA", cx: -1, cy: 0 },
  { id: "central", name: "Central District", color: "#F05A38", cx: 0, cy: 0 },
  { id: "harborview", name: "Harborview", color: "#34D399", cx: 1, cy: 0 },
  { id: "greenridge", name: "Greenridge", color: "#84CC16", cx: -1, cy: -1 },
  { id: "southbay", name: "Southbay", color: "#FBBF24", cx: 0, cy: -1 },
  { id: "dockside", name: "Dockside", color: "#FB923C", cx: 1, cy: -1 },
];
const DIST_SPAN = 0.03;
const DIST_GAP = 0.001;

const districts = fc(
  DISTRICT_DEFS.map((d) => {
    const cLng = CROWN[0] + d.cx * (DIST_SPAN * 2 + DIST_GAP);
    const cLat = CROWN[1] + d.cy * (DIST_SPAN * 2 + DIST_GAP);
    return poly(rect(cLng - DIST_SPAN, cLat - DIST_SPAN, cLng + DIST_SPAN, cLat + DIST_SPAN), {
      id: d.id,
      name: d.name,
      color: d.color,
      centroid: [r6(cLng), r6(cLat)],
    });
  })
);

const water = fc([
  poly(rect(COAST_LNG, CROWN[1] - WORLD_REACH, CROWN[0] + WORLD_REACH, CROWN[1] + WORLD_REACH), { name: "Velora Harbor" }),
]);
const terrain = fc([
  poly(rect(CROWN[0] - WORLD_REACH, CROWN[1] - WORLD_REACH, BOUNDS.minLng + 0.06, CROWN[1] + WORLD_REACH), { name: "Greenridge Hills" }),
  poly(rect(BOUNDS.minLng, BOUNDS.maxLat - 0.05, COAST_LNG, CROWN[1] + WORLD_REACH), { name: "North Commons" }),
  poly(rect(BOUNDS.minLng, CROWN[1] - WORLD_REACH, COAST_LNG, BOUNDS.minLat + 0.05), { name: "South Meadows" }),
]);
const parks = fc([
  poly(rect(CROWN[0] - 0.006, CROWN[1] - 0.004, CROWN[0] + 0.005, CROWN[1] + 0.006), { name: "Velora Central Park" }),
  poly(rect(CROWN[0] - 0.098, CROWN[1] + 0.062, CROWN[0] - 0.08, CROWN[1] + 0.08), { name: "Highcrest Green" }),
  poly(rect(CROWN[0] + 0.062, CROWN[1] - 0.098, CROWN[0] + 0.082, CROWN[1] - 0.078), { name: "Dockside Commons" }),
  poly(rect(CROWN[0] + 0.088, CROWN[1] + 0.032, COAST_LNG - 0.006, CROWN[1] + 0.05), { name: "Marina Gardens" }),
]);

const primary = [];
const secondary = [];
let i = 0;
for (let lng = CROWN[0] - GRID_REACH; lng <= COAST_LNG; lng += BLOCK, i++) {
  const major = i % 4 === 0;
  (major ? primary : secondary).push(
    line([[r6(lng), BOUNDS.minLat], [r6(lng), BOUNDS.maxLat]], { id: `blvd-${i}`, kind: major ? "primary" : "secondary" })
  );
}
let j = 0;
for (let lat = CROWN[1] - GRID_REACH; lat <= CROWN[1] + GRID_REACH; lat += BLOCK, j++) {
  const major = j % 4 === 0;
  (major ? primary : secondary).push(
    line([[BOUNDS.minLng, r6(lat)], [COAST_LNG, r6(lat)]], { id: `ave-${j}`, kind: major ? "primary" : "secondary" })
  );
}

export const CITY_FALLBACK = {
  origin: CROWN,
  crown: CROWN,
  bounds: BOUNDS,
  coastLng: COAST_LNG,
  block: BLOCK,
  districts,
  water,
  terrain,
  parks,
  roadsPrimary: fc(primary),
  roadsSecondary: fc(secondary),
  plots: [],
};

export const DISTRICT_META = DISTRICT_DEFS;
