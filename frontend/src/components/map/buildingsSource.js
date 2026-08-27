/**
 * Ranked products -> GeoJSON & HTML marker data.
 *
 * Core Principle: "Bigger Payment, Bigger Plot"
 * - The plot size directly reflects the payment amount relative to the top bid.
 * - Top #1 claims the largest estate on the district map.
 * - Every incremental Rupee physically expands the brand's territorial boundary.
 */

export const TIER_COLORS = {
  CROWN: "#F59E0B", // Gold #1
  TOP3: "#F97316",  // Coral/Orange Top 3
  TOP10: "#8B5CF6", // Purple Top 10
  STANDARD: "#3B82F6", // Blue standard
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function tierForRank(rank) {
  if (rank === 1) return "CROWN";
  if (rank <= 3) return "TOP3";
  if (rank <= 10) return "TOP10";
  return "STANDARD";
}

/** relative bid weight, 0..1 based on amount vs top #1 amount */
export function bidWeight(amount, top1Amount) {
  if (!top1Amount || top1Amount <= 0) return 0.25;
  return clamp((amount || 0) / top1Amount, 0.005, 1);
}

/**
 * Diameter in CSS px for a website/brand land plot.
 * "Bigger Payment, Bigger Plot":
 * - Max payment (Weight 1.0) = ~168px giant territory
 * - 50% payment (Weight 0.5) = ~115px major estate
 * - 10% payment (Weight 0.1) = ~68px district block
 * - Min entry (₹1) = ~28px micro plot
 */
export function markerSizePx(weight, zoom) {
  const normalized = clamp(weight, 0.005, 1);
  const baseSize = 28 + Math.pow(normalized, 0.46) * 140; // 28px .. 168px
  const zoomFactor = clamp(Math.pow(2, (zoom - 11.8) * 0.45), 0.5, 2.6);
  return Math.round(clamp(baseSize * zoomFactor, 24, 290));
}

function buildingHeight(weight, rank) {
  if (rank === 1) return 340;
  return Math.round(42 + Math.sqrt(clamp(weight, 0.01, 1)) * 270);
}

/** Physical 3D land footprint half-size (degrees) — expands with bigger payment */
function footprintHalf(weight) {
  const normalized = clamp(weight, 0.005, 1);
  return 0.0004 + Math.pow(normalized, 0.48) * 0.0036;
}

function square([lng, lat], half) {
  return [[
    [lng - half, lat - half],
    [lng + half, lat - half],
    [lng + half, lat + half],
    [lng - half, lat + half],
    [lng - half, lat - half],
  ]];
}

export function buildBuildings(products = [], layout) {
  const plots = layout?.plots || [];
  const sorted = [...products].sort((a, b) => (b.currentAmount || 0) - (a.currentAmount || 0));
  const top1Amount = sorted[0]?.currentAmount || 4001;

  const list = [];
  const points = [];
  const footprints = [];

  sorted.forEach((product, i) => {
    const rank = product.rank || product.allTimeRank || i + 1;
    const plot = product.plot || plots[rank - 1] || plots[(rank - 1) % (plots.length || 1)];
    if (!plot || plot.lng == null) return;

    const lngLat = [plot.lng, plot.lat];
    const tier = plot.tier || tierForRank(rank);
    const amount = product.currentAmount || 0;
    const weight = bidWeight(amount, top1Amount);

    const entry = {
      id: product.id,
      product,
      rank,
      tier,
      color: TIER_COLORS[tier] || TIER_COLORS.STANDARD,
      name: product.websiteName || "Product",
      websiteUrl: product.websiteUrl || "",
      logoUrl: product.logoUrl || product.faviconUrl || "",
      amount,
      weight,
      categoryId: product.category?.id || product.categoryId || 15,
      plotNumber: plot.plotNumber || `PLOT-${rank}`,
      district: plot.district || "Velora Harbor",
      lngLat,
    };
    list.push(entry);

    points.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: lngLat },
      properties: { id: entry.id, amount, weight },
    });
    footprints.push({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: square(lngLat, footprintHalf(weight)) },
      properties: {
        id: entry.id,
        color: entry.color,
        categoryId: entry.categoryId,
        height: buildingHeight(weight, rank),
      },
    });
  });

  return {
    list,
    points: { type: "FeatureCollection", features: points },
    footprints: { type: "FeatureCollection", features: footprints },
  };
}
