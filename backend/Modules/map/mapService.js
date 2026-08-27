const fs = require("fs");
const path = require("path");
const { getCityLayout, assignPlotForRank } = require("./cityLayout");

const BILLBOARDS_FILE = path.join(__dirname, "../../../scratch_billboards.json");
let claimedBillboardsMem = {};

try {
  if (fs.existsSync(BILLBOARDS_FILE)) {
    claimedBillboardsMem = JSON.parse(fs.readFileSync(BILLBOARDS_FILE, "utf-8")) || {};
  }
} catch (_) {}

function getClaimedBillboards() {
  return claimedBillboardsMem;
}

function saveClaimedBillboard(billboardId, brandData) {
  if (!billboardId || !brandData) return claimedBillboardsMem;
  claimedBillboardsMem[billboardId] = {
    ...brandData,
    isClaimed: true,
    isBought: true,
    claimedAt: new Date().toISOString(),
  };
  try {
    fs.writeFileSync(BILLBOARDS_FILE, JSON.stringify(claimedBillboardsMem, null, 2), "utf-8");
  } catch (_) {}
  return claimedBillboardsMem;
}

/**
 * Shape a stored/derived plot into the payload the frontend consumes.
 * Falls back to a rank-derived plot when the product has no persisted columns.
 */
function resolvePlot(product, rank) {
  if (product && product.plotLng != null && product.plotLat != null) {
    return {
      plotNumber: product.plotNumber || `PLOT-${rank}`,
      district: product.plotDistrict || "Velora Outskirts",
      lng: product.plotLng,
      lat: product.plotLat,
      tier: product.plotTier || "STANDARD",
    };
  }
  const slot = assignPlotForRank(rank);
  return {
    plotNumber: slot.plotNumber,
    district: slot.district,
    lng: slot.lng,
    lat: slot.lat,
    tier: slot.tier,
  };
}

module.exports = {
  getCityLayout,
  assignPlotForRank,
  resolvePlot,
  getClaimedBillboards,
  saveClaimedBillboard,
};
