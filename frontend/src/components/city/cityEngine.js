/**
 * VELORA HARBOR - Comprehensive Fictional City & Terrain Geometry Engine
 *
 * Plot & Road Alignment:
 * - All plots are located strictly INSIDE city blocks between avenues and boulevards.
 * - Zero overlap between buildings/plots and road surfaces.
 * - Top 20 buildings have dynamic bidding-driven heights.
 * - Rank > 20 buildings have uniform standard heights (42px) with rank number badges.
 */

export const CITY_NAME = "VELORA HARBOR";
export const CITY_SUBTITLE = "PACIFIC COAST METROPOLITAN BAY";

export const WORLD_BOUNDS = {
  minX: -1800,
  maxX: 2400,
  minY: -1400,
  maxY: 2400,
};

export const WORLD_WIDTH = WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX;
export const WORLD_HEIGHT = WORLD_BOUNDS.maxY - WORLD_BOUNDS.minY;

// Natural Organic Coastline X along Y
export function getCoastlineX(y) {
  return (
    1120 +
    Math.sin(y * 0.004) * 70 +
    Math.cos(y * 0.011) * 45 +
    Math.sin(y * 0.028) * 25
  );
}

// Strictly on land check
export function isLand(x, y, buffer = 80) {
  return x < getCoastlineX(y) - buffer;
}

// Top-Angle Projection:
// t=0: Clean 2D Top-Down Blueprint
// t=1: 3D Top-Angle Aerial View with true vertical elevation (z extrudes straight up along Y axis)
export function projectPoint(x, y, z = 0, t = 0) {
  if (t <= 0 || z === 0) return { x, y };
  return {
    x,
    y: y - z * t * 0.85,
  };
}

/**
 * Road Grid Centerlines:
 * Avenues (Horizontal Y): -850, -520, -120, 300, 720, 1140, 1680, 2050
 * Boulevards (Vertical X): -1150, -680, -280, 180, 580, 920
 *
 * City Block Interior Centers (Strictly between roads):
 * X columns: -915, -480, -50, 380, 750
 * Y rows: -685, -320, 90, 510, 930, 1410, 1865
 */

// 20 Prime Downtown Landmark Plots for Top 20 Bidders - Perfectly Centered in City Blocks
export const TOP_20_PLOTS = [
  // 1. Crown Pinnacle (#1 Hero Spot - Crown Harbor Core Block)
  { plotId: 1, plotNumber: "PLOT-01", district: "Crown Harbor Core", x: 380, y: 530, w: 110, h: 110, lotW: 140, lotH: 140, baseHeight: 260, color: "#0284C7", pinColor: "#0284C7" },
  // 2. Financial District North
  { plotId: 2, plotNumber: "PLOT-02", district: "Financial District North", x: 750, y: 510, w: 98, h: 98, lotW: 126, lotH: 126, baseHeight: 220, color: "#10B981", pinColor: "#10B981" },
  // 3. Downtown West Central
  { plotId: 3, plotNumber: "PLOT-03", district: "Downtown West", x: -50, y: 510, w: 96, h: 96, lotW: 122, lotH: 122, baseHeight: 195, color: "#8B5CF6", pinColor: "#8B5CF6" },
  // 4. West Tech District Central
  { plotId: 4, plotNumber: "PLOT-04", district: "Tech District Central", x: -480, y: 510, w: 94, h: 94, lotW: 120, lotH: 120, baseHeight: 180, color: "#EF4444", pinColor: "#EF4444" },
  // 5. North Financial Plaza
  { plotId: 5, plotNumber: "PLOT-05", district: "North Financial Plaza", x: 750, y: 90, w: 92, h: 92, lotW: 118, lotH: 118, baseHeight: 165, color: "#334155", pinColor: "#334155" },
  // 6. Uptown Central Plaza
  { plotId: 6, plotNumber: "PLOT-06", district: "Uptown Central", x: 380, y: 90, w: 90, h: 90, lotW: 116, lotH: 116, baseHeight: 155, color: "#0284C7", pinColor: "#0284C7" },
  // 7. Uptown West Innovation
  { plotId: 7, plotNumber: "PLOT-07", district: "Uptown West", x: -50, y: 90, w: 88, h: 88, lotW: 114, lotH: 114, baseHeight: 145, color: "#F97316", pinColor: "#F97316" },
  // 8. West Tech Block North
  { plotId: 8, plotNumber: "PLOT-08", district: "Tech District North", x: -480, y: 90, w: 86, h: 86, lotW: 112, lotH: 112, baseHeight: 135, color: "#10B981", pinColor: "#10B981" },
  // 9. South Bay Central Block
  { plotId: 9, plotNumber: "PLOT-09", district: "South Bay Central", x: 380, y: 930, w: 84, h: 84, lotW: 110, lotH: 110, baseHeight: 125, color: "#2563EB", pinColor: "#2563EB" },
  // 10. South Bay East Waterfront
  { plotId: 10, plotNumber: "PLOT-10", district: "South Bay East", x: 750, y: 930, w: 84, h: 84, lotW: 110, lotH: 110, baseHeight: 115, color: "#EC4899", pinColor: "#EC4899" },
  // 11. South Bay West Block
  { plotId: 11, plotNumber: "PLOT-11", district: "South Bay West", x: -50, y: 930, w: 80, h: 80, lotW: 106, lotH: 106, baseHeight: 108, color: "#6366F1", pinColor: "#6366F1" },
  // 12. South-West Campus Block
  { plotId: 12, plotNumber: "PLOT-12", district: "South-West Campus", x: -480, y: 930, w: 80, h: 80, lotW: 106, lotH: 106, baseHeight: 102, color: "#06B6D4", pinColor: "#06B6D4" },
  // 13. Deep Uptown Central
  { plotId: 13, plotNumber: "PLOT-13", district: "Deep Uptown Central", x: 380, y: -320, w: 78, h: 78, lotW: 104, lotH: 104, baseHeight: 96, color: "#84CC16", pinColor: "#84CC16" },
  // 14. Deep Uptown East
  { plotId: 14, plotNumber: "PLOT-14", district: "Deep Uptown East", x: 750, y: -320, w: 78, h: 78, lotW: 104, lotH: 104, baseHeight: 92, color: "#EAB308", pinColor: "#EAB308" },
  // 15. Deep Uptown West
  { plotId: 15, plotNumber: "PLOT-15", district: "Deep Uptown West", x: -50, y: -320, w: 76, h: 76, lotW: 102, lotH: 102, baseHeight: 88, color: "#D946EF", pinColor: "#D946EF" },
  // 16. North Highland Valley
  { plotId: 16, plotNumber: "PLOT-16", district: "North Highland Valley", x: -480, y: -320, w: 76, h: 76, lotW: 102, lotH: 102, baseHeight: 85, color: "#14B8A6", pinColor: "#14B8A6" },
  // 17. West Mountain Foothill Central
  { plotId: 17, plotNumber: "PLOT-17", district: "West Mountain Foothill", x: -915, y: 510, w: 74, h: 74, lotW: 100, lotH: 100, baseHeight: 82, color: "#F43F5E", pinColor: "#F43F5E" },
  // 18. West Mountain Foothill North
  { plotId: 18, plotNumber: "PLOT-18", district: "West Mountain North", x: -915, y: 90, w: 74, h: 74, lotW: 100, lotH: 100, baseHeight: 80, color: "#8B5CF6", pinColor: "#8B5CF6" },
  // 19. West Mountain Foothill South
  { plotId: 19, plotNumber: "PLOT-19", district: "West Mountain South", x: -915, y: 930, w: 72, h: 72, lotW: 98, lotH: 98, baseHeight: 78, color: "#3B82F6", pinColor: "#3B82F6" },
  // 20. North Mountain Heights
  { plotId: 20, plotNumber: "PLOT-20", district: "North Mountain Heights", x: -915, y: -320, w: 72, h: 72, lotW: 98, lotH: 98, baseHeight: 75, color: "#10B981", pinColor: "#10B981" },
];

// Generates spacious designated land plots for Bidders Ranked > 20 inside city blocks
export const GENERAL_PLOTS_GRID = [];
(() => {
  // Safe block interior columns and rows (strictly away from road lines)
  const blockCentersX = [-1450, -915, -480, -50, 380, 750];
  const blockCentersY = [-1050, -685, -320, 90, 510, 930, 1410, 1865];

  let plotIndex = 21;

  for (const by of blockCentersY) {
    for (const bx of blockCentersX) {
      // Create a 2x2 sub-plot cluster inside large city blocks
      const offsets = [
        { dx: -60, dy: -55 },
        { dx: 60, dy: -55 },
        { dx: -60, dy: 55 },
        { dx: 60, dy: 55 },
      ];

      for (const off of offsets) {
        const px = bx + off.dx;
        const py = by + off.dy;

        // Skip if close to Top 20 spots
        const nearTop20 = TOP_20_PLOTS.some(
          (tp) => Math.hypot(tp.x - px, tp.y - py) < 85
        );
        if (nearTop20) continue;

        // Strictly ensure on land
        if (!isLand(px, py, 95)) continue;

        // Skip river delta line
        if (py > 1260 && py < 1460 && px > -100) continue;

        GENERAL_PLOTS_GRID.push({
          plotId: plotIndex,
          plotNumber: `PLOT-${plotIndex}`,
          district: px < -300 ? "West Highland District" : px < 600 ? "Velora Central District" : "East Bay District",
          x: px,
          y: py,
          w: 66,
          h: 66,
          lotW: 86,
          lotH: 86,
          baseHeight: 42, // Uniform standard height for all rank > 20
          color: "#64748B",
          pinColor: "#64748B",
        });
        plotIndex++;
      }
    }
  }
})();

// Fetch plot and compute custom building height according to Bidding Concept
export function getBuildingLot(productId, rank = 99, currentAmount = 0, top1Amount = 4000) {
  if (rank >= 1 && rank <= 20) {
    const plot = TOP_20_PLOTS[rank - 1];

    // Top 20: Bidding amount directly influences building height!
    let height3D = plot.baseHeight;
    if (rank > 1 && top1Amount > 0 && currentAmount > 0) {
      const ratio = Math.min(1, Math.max(0.2, currentAmount / top1Amount));
      height3D = Math.round(75 + ratio * 145);
    }

    return {
      ...plot,
      height3D,
      isTop20: true,
    };
  }

  // Rank > 20: Standard uniform height (42px)
  const idx = (rank - 21) % GENERAL_PLOTS_GRID.length;
  const basePlot = GENERAL_PLOTS_GRID[idx];

  return {
    ...basePlot,
    plotId: rank,
    plotNumber: `PLOT-${rank}`,
    height3D: 42, // Uniform standard height for rank > 20
    color: "#64748B",
    pinColor: "#64748B",
    isTop20: false,
  };
}

// Procedural Terrain & Complete Infrastructure for Velora Harbor
export function getCityInfrastructure() {
  // 1. Natural Mountain Ridges & Highland Contours (West Sector)
  const mountainRidges = [
    { x: -1200, y: -400, radiusX: 380, radiusY: 550, elevation: 3, label: "EMERALD CREST HIGHLANDS" },
    { x: -1100, y: 700, radiusX: 340, radiusY: 480, elevation: 2, label: "SUNVALE RIDGE" },
    { x: -1250, y: 1600, radiusX: 320, radiusY: 420, elevation: 2, label: "SOUTH MOUNTAIN PASS" },
  ];

  // 2. Natural Meandering River (Velora River Delta)
  const naturalRiver = [
    { x: -1800, y: 1300 },
    { x: -1200, y: 1340 },
    { x: -680, y: 1310 },
    { x: -100, y: 1380 },
    { x: 450, y: 1420 },
    { x: 900, y: 1470 },
    { x: getCoastlineX(1520), y: 1520 },
  ];

  // 3. Bridges Crossing Velora River
  const riverBridges = [
    { id: "bridge-west", x: -680, y: 1310, w: 54, h: 48, type: "arch", name: "Highland Arch Bridge" },
    { id: "bridge-central", x: 180, y: 1400, w: 58, h: 52, type: "suspension", name: "Grand Velora Bridge" },
    { id: "bridge-east", x: 580, y: 1430, w: 54, h: 48, type: "causeway", name: "Harbor Causeway" },
  ];

  // 4. Coastal Scenic Expressway (Velora Ocean Parkway)
  const coastalHighway = [
    { x: getCoastlineX(-1400) - 80, y: -1400 },
    { x: getCoastlineX(-1000) - 80, y: -1000 },
    { x: getCoastlineX(-600) - 80, y: -600 },
    { x: getCoastlineX(-200) - 80, y: -200 },
    { x: getCoastlineX(200) - 80, y: 200 },
    { x: getCoastlineX(600) - 80, y: 600 },
    { x: getCoastlineX(1000) - 80, y: 1000 },
    { x: getCoastlineX(1400) - 80, y: 1400 },
    { x: getCoastlineX(1800) - 80, y: 1800 },
    { x: getCoastlineX(2200) - 80, y: 2200 },
  ];

  // 5. Complete Network of East-West Primary Avenues
  const avenues = [
    { id: "ave-n4", y: -850, width: 44, name: "North Highland Parkway" },
    { id: "ave-n3", y: -520, width: 46, name: "Uptown North Avenue" },
    { id: "ave-n2", y: -120, width: 48, name: "Innovation Boulevard" },
    { id: "ave-c1", y: 300, width: 54, isGrand: true, name: "Grand Central Avenue" }, // Core Grand Avenue
    { id: "ave-s1", y: 720, width: 48, name: "Financial South Boulevard" },
    { id: "ave-s2", y: 1140, width: 46, name: "South Bay Avenue" },
    { id: "ave-s3", y: 1680, width: 44, name: "Delta Parkway" },
    { id: "ave-s4", y: 2050, width: 44, name: "South Cape Road" },
  ];

  // 6. Complete Network of North-South Primary Boulevards
  const boulevards = [
    { id: "blvd-w4", x: -1150, width: 44, name: "Mountain Crest Way" },
    { id: "blvd-w3", x: -680, width: 46, name: "West Valley Corridor" },
    { id: "blvd-w2", x: -280, width: 48, name: "Tech District Boulevard" },
    { id: "blvd-c1", x: 180, width: 54, isGrand: true, name: "Velora Central Boulevard" }, // Core Grand Boulevard
    { id: "blvd-e1", x: 580, width: 48, name: "Financial Harbor Way" },
    { id: "blvd-e2", x: 920, width: 46, name: "Marina Coastal Boulevard" },
  ];

  // 7. Circular Roundabout Plazas & Interchanges
  const roundabouts = [
    { x: 580, y: -120, radius: 46, innerRadius: 20, name: "North Star Roundabout" },
    { x: -280, y: 1140, radius: 44, innerRadius: 18, name: "South Campus Circle" },
  ];

  // 8. Crown Central Grand Plaza Fountain (Adjoining Plot #1 at X=380, Y=530)
  const centralPlaza = {
    x: 380,
    y: 410,
    radius: 26,
    innerRadius: 16,
  };

  // 9. Harbor Marina Piers extending into the ocean
  const harborPiers = [
    { x: 1080, y: 200, w: 90, h: 18, name: "Pier 1 Marina" },
    { x: 1090, y: 550, w: 110, h: 20, name: "Pier 2 Yacht Club" },
    { x: 1070, y: 900, w: 85, h: 18, name: "Pier 3 Ferry Terminal" },
  ];

  // 10. Natural Trees, Jungle Canopy & Coastal Palms
  const trees = [
    // Grand Plaza Perimeter
    { x: 320, y: 460, r: 10, type: "oak" },
    { x: 440, y: 460, r: 10, type: "oak" },
    { x: 320, y: 600, r: 10, type: "oak" },
    { x: 440, y: 600, r: 10, type: "oak" },
    // Boulevard Street Trees
    { x: 180, y: 60, r: 9, type: "oak" },
    { x: 580, y: 60, r: 9, type: "oak" },
    { x: -280, y: 60, r: 9, type: "oak" },
    { x: 180, y: 520, r: 9, type: "oak" },
    { x: 580, y: 520, r: 9, type: "oak" },
    { x: -280, y: 520, r: 9, type: "oak" },
    // Dense Jungle & Forest Sanctuary in Highland Mountains
    { x: -1200, y: -450, r: 24, type: "jungle" },
    { x: -1140, y: -410, r: 20, type: "jungle" },
    { x: -1260, y: -390, r: 22, type: "jungle" },
    { x: -1180, y: -520, r: 19, type: "jungle" },
    { x: -1080, y: 650, r: 22, type: "jungle" },
    { x: -1150, y: 720, r: 20, type: "jungle" },
    { x: -1100, y: 780, r: 21, type: "jungle" },
    { x: -1240, y: 1550, r: 20, type: "jungle" },
    { x: -1180, y: 1620, r: 22, type: "jungle" },
    // Beachside Palm Trees along Shoreline
    { x: 1040, y: -800, r: 8, type: "palm" },
    { x: 1050, y: -400, r: 8, type: "palm" },
    { x: 1060, y: 0, r: 8, type: "palm" },
    { x: 1050, y: 400, r: 8, type: "palm" },
    { x: 1060, y: 800, r: 8, type: "palm" },
    { x: 1055, y: 1200, r: 8, type: "palm" },
    { x: 1065, y: 1600, r: 8, type: "palm" },
    { x: 1050, y: 2000, r: 8, type: "palm" },
  ];

  // 11. Ocean Luxury Yachts & Boats
  const oceanBoats = [
    { x: 1220, y: 180, angle: 0.2, size: 28 },
    { x: 1240, y: 530, angle: -0.3, size: 34 },
    { x: 1200, y: 880, angle: 0.4, size: 26 },
    { x: 1350, y: -300, angle: -0.2, size: 30 },
    { x: 1380, y: 1200, angle: 0.5, size: 32 },
  ];

  return {
    mountainRidges,
    naturalRiver,
    riverBridges,
    coastalHighway,
    avenues,
    boulevards,
    roundabouts,
    centralPlaza,
    harborPiers,
    trees,
    oceanBoats,
  };
}
