import { getBuildingLot } from "./cityEngine";

/**
 * Multi-Mode (2D Top-Down & 3D Isometric) Building Generator
 */

export function generateCityBuildings(products = [], activeCategoryId = null) {
  if (!products || products.length === 0) return [];

  const sorted = [...products].sort((a, b) => (b.currentAmount || 0) - (a.currentAmount || 0));

  return sorted.map((product, index) => {
    const rank = product.rank || product.allTimeRank || index + 1;
    const catId = product.category?.id || product.categoryId || 15;
    const isFilteredOut = Boolean(activeCategoryId && catId !== Number(activeCategoryId));

    const lot = getBuildingLot(product.id, rank);

    const colorThemes = {
      1: { primary: "#F59E0B", accent: "#D97706", pin: "#F59E0B", shadow: "rgba(245, 158, 11, 0.4)", crown: true },
      2: { primary: "#10B981", accent: "#059669", pin: "#10B981", shadow: "rgba(16, 185, 129, 0.35)", crown: false },
      3: { primary: "#8B5CF6", accent: "#7C3AED", pin: "#8B5CF6", shadow: "rgba(139, 92, 246, 0.35)", crown: false },
      4: { primary: "#EF4444", accent: "#DC2626", pin: "#EF4444", shadow: "rgba(239, 68, 68, 0.35)", crown: false },
      5: { primary: "#8B5CF6", accent: "#7C3AED", pin: "#8B5CF6", shadow: "rgba(139, 92, 246, 0.35)", crown: false },
      6: { primary: "#0284C7", accent: "#0369A1", pin: "#0284C7", shadow: "rgba(2, 132, 199, 0.35)", crown: false },
      7: { primary: "#F97316", accent: "#EA580C", pin: "#F97316", shadow: "rgba(249, 115, 22, 0.35)", crown: false },
      8: { primary: "#10B981", accent: "#059669", pin: "#10B981", shadow: "rgba(16, 185, 129, 0.35)", crown: false },
      9: { primary: "#2563EB", accent: "#1D4ED8", pin: "#2563EB", shadow: "rgba(37, 99, 235, 0.35)", crown: false },
      10: { primary: "#EC4899", accent: "#DB2777", pin: "#EC4899", shadow: "rgba(236, 72, 153, 0.35)", crown: false },
    };

    const theme = colorThemes[rank] || {
      primary: lot.color || "#64748B",
      accent: "#475569",
      pin: lot.color || "#64748B",
      shadow: "rgba(0, 0, 0, 0.15)",
      crown: false,
    };

    return {
      id: product.id,
      product,
      rank,
      x: lot.x,
      y: lot.y,
      w: lot.w,
      h: lot.h,
      height3D: lot.height3D || 45,
      theme,
      isTop10: lot.isTop10,
      isFilteredOut,
      logoUrl: product.logoUrl || product.faviconUrl || "",
      websiteName: product.websiteName || "Product",
      currentAmount: product.currentAmount || 0,
      categoryName: product.category?.name || "General",
      clickCount: product.clickCount || 0,
    };
  });
}
