/**
 * Endless City & Coastal Geometry Engine
 * Supports infinite procedural urban grid, organic zigzag coastline,
 * expanding product lots for 1000+ buildings, and both 2D Top-Down & 3D Isometric math.
 */

export const WORLD_WIDTH = 2400;
export const WORLD_HEIGHT = 1800;

// The 10 Prime Downtown Plots matching the reference screenshot
export const DOWNTOWN_PLOTS = [
  // 1. ZeroRank (Top-Left Center - Golden Crown Hero Spot)
  { plotId: 1, x: 530, y: 310, w: 105, h: 115, height3D: 150, color: "#F59E0B", pinColor: "#F59E0B" },
  // 2. Pecan AI (Top-Right Center)
  { plotId: 2, x: 670, y: 310, w: 95, h: 105, height3D: 120, color: "#10B981", pinColor: "#10B981" },
  // 3. AY Automate (Far Top-Right)
  { plotId: 3, x: 820, y: 330, w: 95, h: 100, height3D: 110, color: "#8B5CF6", pinColor: "#8B5CF6" },
  // 4. Voco (Middle-Left)
  { plotId: 4, x: 400, y: 510, w: 95, h: 100, height3D: 95, color: "#EF4444", pinColor: "#EF4444" },
  // 5. DetectionHub.ai (Center)
  { plotId: 5, x: 580, y: 510, w: 100, h: 105, height3D: 90, color: "#8B5CF6", pinColor: "#8B5CF6" },
  // 6. TimeBid (Middle-Right)
  { plotId: 6, x: 780, y: 520, w: 95, h: 100, height3D: 85, color: "#0284C7", pinColor: "#0284C7" },
  // 7. Lumail (Bottom-Left)
  { plotId: 7, x: 320, y: 730, w: 95, h: 100, height3D: 75, color: "#F97316", pinColor: "#F97316" },
  // 8. StudyGenie (Bottom-Center-Left)
  { plotId: 8, x: 480, y: 730, w: 95, h: 100, height3D: 70, color: "#10B981", pinColor: "#10B981" },
  // 9. CodePilot (Bottom-Center-Right)
  { plotId: 9, x: 670, y: 740, w: 95, h: 100, height3D: 65, color: "#2563EB", pinColor: "#2563EB" },
  // 10. Bolt.new (Bottom-Right)
  { plotId: 10, x: 850, y: 740, w: 95, h: 100, height3D: 60, color: "#EC4899", pinColor: "#EC4899" },
];

// Natural Organic Zigzag Coastline X position for a given Y
export function getCoastlineX(y) {
  return 960 + Math.sin(y * 0.008) * 35 + Math.cos(y * 0.02) * 20 + Math.sin(y * 0.05) * 10;
}

// 3D Isometric Projection Math
export const TILE_W = 64;
export const TILE_H = 32;

export function toIso(x, y, z = 0) {
  const isoX = (x - y) * (TILE_W / 120);
  const isoY = (x + y) * (TILE_H / 120) - z;
  return { x: isoX, y: isoY };
}

export function fromIso(isoX, isoY) {
  const x = (isoX / (TILE_W / 120) + isoY / (TILE_H / 120)) / 2;
  const y = (isoY / (TILE_H / 120) - isoX / (TILE_W / 120)) / 2;
  return { x, y };
}

// Dynamic lot expansion for 1000+ products
export function getBuildingLot(productId, rank = 99) {
  if (rank >= 1 && rank <= 10) {
    const plot = DOWNTOWN_PLOTS[rank - 1];
    return {
      x: plot.x,
      y: plot.y,
      w: plot.w,
      h: plot.h,
      height3D: plot.height3D,
      color: plot.color,
      isTop10: true,
    };
  }

  // Deterministic procedural placement across expanding city suburban blocks (West, North, South)
  let hash = 0;
  const str = String(productId || `lot_${rank}`);
  for (let i = 0; i < str.length; i++) {
    hash = (str.charCodeAt(i) + ((hash << 5) - hash)) | 0;
  }
  const absHash = Math.abs(hash);

  // Allocate in concentric urban rings moving westward and northward
  const ring = Math.floor((rank - 10) / 12) + 1;
  const slot = (rank - 10) % 12;
  const angle = (slot / 12) * Math.PI * 2 + ((absHash % 20) - 10) * (Math.PI / 180);
  const dist = 380 + ring * 120 + (absHash % 40);

  // Keep lots on the city side (west of the coastline)
  let lotX = 580 + Math.cos(angle) * dist * 0.85;
  let lotY = 530 + Math.sin(angle) * dist;

  const coastX = getCoastlineX(lotY);
  if (lotX > coastX - 90) {
    lotX = coastX - 110 - (absHash % 120);
  }

  const height3D = Math.max(28, 55 - Math.min(25, ring * 3));

  return {
    x: lotX,
    y: lotY,
    w: 68,
    h: 68,
    height3D,
    color: "#64748B",
    isTop10: false,
  };
}

// Procedural City Infrastructure Definition
export function getCityInfrastructure() {
  // Horizontal Avenues across infinite expanse
  const horizontalAvenues = [
    { y: -300, height: 40 },
    { y: -100, height: 42 },
    { y: 200, height: 46 },
    { y: 420, height: 50 },
    { y: 630, height: 50 },
    { y: 840, height: 46 },
    { y: 1100, height: 42 },
    { y: 1400, height: 40 },
  ];

  // Vertical Boulevards
  const verticalBoulevards = [
    { x: -300, width: 40 },
    { x: -50, width: 42 },
    { x: 220, width: 46 },
    { x: 440, width: 48 },
    { x: 730, width: 50 },
    { x: 930, width: 48 },
  ];

  // Central Fountain Plaza (Downtown)
  const centralFountain = {
    x: 580,
    y: 630,
    radius: 26,
  };

  // Crosswalks
  const crosswalks = [
    { x: 440, y: 420, w: 48, h: 14 },
    { x: 730, y: 420, w: 50, h: 14 },
    { x: 440, y: 630, w: 48, h: 14 },
    { x: 730, y: 630, w: 50, h: 14 },
    { x: 220, y: 420, w: 46, h: 14 },
    { x: 220, y: 630, w: 46, h: 14 },
  ];

  // Tree clusters
  const trees = [
    { x: 470, y: 200, r: 9 },
    { x: 490, y: 200, r: 8 },
    { x: 620, y: 200, r: 10 },
    { x: 780, y: 200, r: 9 },
    { x: 260, y: 310, r: 11 },
    { x: 260, y: 330, r: 9 },
    { x: 260, y: 510, r: 10 },
    { x: 500, y: 490, r: 8 },
    { x: 690, y: 490, r: 8 },
    { x: 710, y: 500, r: 9 },
    { x: 410, y: 710, r: 9 },
    { x: 590, y: 720, r: 10 },
    { x: 770, y: 730, r: 9 },
    { x: 940, y: 500, r: 10 },
    { x: 120, y: 220, r: 12 },
    { x: 140, y: 450, r: 11 },
    { x: 120, y: 760, r: 12 },
  ];

  // Ocean boats
  const oceanBoats = [
    { x: 1080, y: 240, angle: 0.3, size: 24 },
    { x: 1200, y: 480, angle: -0.4, size: 28 },
    { x: 1120, y: 720, angle: 0.6, size: 22 },
  ];

  return { horizontalAvenues, verticalBoulevards, centralFountain, crosswalks, trees, oceanBoats };
}
