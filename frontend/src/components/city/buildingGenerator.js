import { getBuildingLot } from "./cityEngine";

/**
 * Building Generator for DB Products
 *
 * Core Concept:
 * - Only real products fetched from the database become buildings.
 * - Top 20 buildings have dynamic custom heights & sizes scaled by their bid amount and rank.
 * - Rank > 20 buildings all have their distinct rank number (#21, #22, ...) and uniform standard height (40px).
 */

export function generateCityBuildings(products = [], activeCategoryId = null) {
  if (!products || products.length === 0) return [];

  // Sort products strictly by current bidding amount descending
  const sorted = [...products].sort((a, b) => (b.currentAmount || 0) - (a.currentAmount || 0));
  const top1Amount = sorted[0]?.currentAmount || 4000;

  return sorted.map((product, index) => {
    const rank = product.rank || product.allTimeRank || index + 1;
    const catId = product.category?.id || product.categoryId || 15;
    const isFilteredOut = Boolean(activeCategoryId && catId !== Number(activeCategoryId));

    const lot = getBuildingLot(product.id, rank, product.currentAmount || 0, top1Amount);

    // Color themes for Top 20 landmark tiers
    const top20Colors = [
      { primary: "#0284C7", accent: "#0369A1", pin: "#0284C7", crown: true },   // #1 Crown Blue
      { primary: "#10B981", accent: "#059669", pin: "#10B981", crown: false },  // #2 Emerald
      { primary: "#8B5CF6", accent: "#7C3AED", pin: "#8B5CF6", crown: false },  // #3 Purple
      { primary: "#EF4444", accent: "#DC2626", pin: "#EF4444", crown: false },  // #4 Crimson
      { primary: "#334155", accent: "#1E293B", pin: "#334155", crown: false },  // #5 Slate
      { primary: "#0284C7", accent: "#0369A1", pin: "#0284C7", crown: false },  // #6 Sky
      { primary: "#F97316", accent: "#EA580C", pin: "#F97316", crown: false },  // #7 Orange
      { primary: "#10B981", accent: "#059669", pin: "#10B981", crown: false },  // #8 Green
      { primary: "#2563EB", accent: "#1D4ED8", pin: "#2563EB", crown: false },  // #9 Blue
      { primary: "#EC4899", accent: "#DB2777", pin: "#EC4899", crown: false },  // #10 Pink
      { primary: "#6366F1", accent: "#4F46E5", pin: "#6366F1", crown: false },  // #11 Indigo
      { primary: "#06B6D4", accent: "#0891B2", pin: "#06B6D4", crown: false },  // #12 Cyan
      { primary: "#84CC16", accent: "#65A30D", pin: "#84CC16", crown: false },  // #13 Lime
      { primary: "#EAB308", accent: "#CA8A04", pin: "#EAB308", crown: false },  // #14 Amber
      { primary: "#D946EF", accent: "#C026D3", pin: "#D946EF", crown: false },  // #15 Fuchsia
      { primary: "#14B8A6", accent: "#0D9488", pin: "#14B8A6", crown: false },  // #16 Teal
      { primary: "#F43F5E", accent: "#E11D48", pin: "#F43F5E", crown: false },  // #17 Rose
      { primary: "#8B5CF6", accent: "#7C3AED", pin: "#8B5CF6", crown: false },  // #18 Violet
      { primary: "#3B82F6", accent: "#2563EB", pin: "#3B82F6", crown: false },  // #19 Azure
      { primary: "#10B981", accent: "#059669", pin: "#10B981", crown: false },  // #20 Mint
    ];

    const theme = rank <= 20
      ? top20Colors[rank - 1]
      : {
          primary: "#64748B",
          accent: "#475569",
          pin: "#64748B",
          crown: false,
        };

    return {
      id: product.id,
      product: {
        ...product,
        plotNumber: lot.plotNumber || `PLOT-${rank}`,
        district: lot.district || "World Land District",
      },
      rank,
      plotNumber: lot.plotNumber || `PLOT-${rank}`,
      district: lot.district || "World Land District",
      x: lot.x,
      y: lot.y,
      w: lot.w,
      h: lot.h,
      lotW: lot.lotW,
      lotH: lot.lotH,
      height3D: lot.height3D, // Dynamically computed based on bidding for Top 20, 40px for > 20
      isTop20: rank <= 20,
      theme,
      isFilteredOut,
      logoUrl: product.logoUrl || product.faviconUrl || "",
      websiteName: product.websiteName || "Product",
      currentAmount: product.currentAmount || 0,
      categoryName: product.category?.name || "General",
      clickCount: product.clickCount || 0,
    };
  });
}
