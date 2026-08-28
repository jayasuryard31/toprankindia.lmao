import { lotAt, DISTRICTS, districtCenter } from "../../../components/map/three/cityGrid";

/**
 * Every frame, find the single most relevant thing the player could interact
 * with: a ranked brand landmark, or a vacant plot. Returns a lightweight
 * descriptor the HUD renders as a "[E] …" prompt.
 */
const LANDMARK_RANGE = 16;
const PLOT_RANGE = 11;
const PREBUILT_RANGE = 13;

export class InteractionSystem {
  constructor(engine) {
    this.engine = engine;
  }

  scan(playerPos) {
    const px = playerPos.x;
    const pz = playerPos.z;

    // 1. Check nearest brand billboard / mega screen
    let best = null;
    let bestD = LANDMARK_RANGE;

    if (this.engine.brandBillboardsGroup) {
      for (const b of this.engine.brandBillboardsGroup.children) {
        const u = b.userData;
        if (!u?.billboardDef && !u?.product) continue;
        const maxRange = u.billboardDef?.anchor === "times" ? 28 : 20;
        const d = Math.hypot(b.position.x - px, b.position.z - pz);
        if (d < maxRange && d < bestD) {
          bestD = d;
          best = {
            type: "billboard",
            id: u.billboardDef?.id || u.code || u.product?.id || "bb_sponsor",
            code: u.code || u.billboardDef?.id,
            billboardId: u.billboardId || u.billboardDef?.id,
            billboardNumber: u.billboardNumber || u.billboardDef?.billboardNumber || 1,
            billboardDef: u.billboardDef,
            billboardRecord: u.billboardRecord,
            isOccupied: Boolean(u.isOccupied),
            isClaimed: Boolean(u.isOccupied),
            brand: u.brand || u.product?.websiteName || "Available Ad Space",
            billboardName: u.billboardName || u.billboardDef?.name || "City Billboard",
            fixedCost: u.fixedCost || u.billboardDef?.costFormatted || "$20 / mo",
            costUSD: u.costUSD || u.billboardDef?.costUSD || 20,
            rateUSD: u.rateUSD || u.costUSD || u.billboardDef?.costUSD || 20,
            rank: u.rank || 1,
            color: u.color || (u.isOccupied ? "#10b981" : "#38bdf8"),
            product: u.product || {
              websiteName: u.brand || "Featured Brand Sponsor",
              websiteUrl: "https://toprankworld.lol",
              tagline: "Explore, Compete & Rank Top Brands Worldwide",
            },
            distance: d,
            worldX: b.position.x,
            worldZ: b.position.z,
          };
        }
      }
    }

    // 2. Check nearest ranked landmark / building ownership board
    for (const t of this.engine.brandTowersGroup.children) {
      const u = t.userData;
      if (!u?.product) continue;
      const d = Math.hypot(t.position.x - px, t.position.z - pz);
      if (d < bestD) {
        bestD = d;
        best = {
          type: "landmark",
          id: u.product.id,
          brand: u.product.websiteName || "Unknown",
          rank: u.rank,
          amount: u.amount,
          floors: u.floors,
          district: u.district,
          color: u.color,
          product: u.product,
          distance: d,
          worldX: t.position.x,
          worldZ: t.position.z,
        };
      }
    }
    if (best) return best;

    // otherwise: standing on / next to a vacant plot?
    const info = lotAt(px, pz);
    if (info) {
      const occupied = this.engine.getSolids().some(
        (s) => Math.abs(s.cx - info.lot.cx) < 2 && Math.abs(s.cz - info.lot.cz) < 2
      );
      const d = Math.hypot(info.lot.cx - px, info.lot.cz - pz);
      if (!occupied && d < PLOT_RANGE) {
        return {
          type: "plot",
          plotNumber: info.plotNumber,
          districtId: info.district.id,
          districtName: info.district.name,
          color: info.district.color,
          archetype: info.district.archetype,
          worldX: info.lot.cx,
          worldZ: info.lot.cz,
          taken: false,
          distance: d,
        };
      }
    }

    // finally: an existing building you could buy outright at its fixed ask
    const pre = this.engine.getPrebuiltAt?.(px, pz, PREBUILT_RANGE);
    if (pre) {
      return {
        type: "plot",
        prebuilt: true,
        plotNumber: pre.plotNumber,
        districtId: pre.district?.id,
        districtName: pre.district?.name || "Velora Harbor",
        color: pre.district?.color || "#F05A38",
        archetype: pre.district?.archetype,
        buildingKind: pre.kind,
        floors: pre.floors,
        fixedPriceUSD: pre.priceUSD,
        fixedPriceINR: pre.priceINR,
        worldX: pre.worldX,
        worldZ: pre.worldZ,
        taken: false,
        distance: pre.distance,
      };
    }
    return null;
  }

  /** Which district is the player standing in right now? */
  locate(playerPos) {
    const info = lotAt(playerPos.x, playerPos.z);
    if (info) return { district: info.district.name, area: info.plotNumber };
    // off-grid: nearest district by centre
    let name = "Velora Harbor";
    let bestD = Infinity;
    for (const d of DISTRICTS) {
      const c = districtCenter(d);
      const dd = Math.hypot(c.cx - playerPos.x, c.cz - playerPos.z);
      if (dd < bestD) {
        bestD = dd;
        name = d.name;
      }
    }
    return { district: name, area: "Open ground" };
  }
}
