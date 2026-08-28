const prisma = require("../../Config/DBConnect");
const { PLOT_SLOTS } = require("../map/cityLayout");
const { BILLBOARD_CATALOG } = require("../map/billboardCatalog");

/** Pull a hostname out of a referrer URL for the "traffic sources" card. */
function referrerHost(url) {
  if (!url) return "Direct";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Direct";
  }
}

/** Best-effort country name for a 2-letter code, without a locale dependency. */
const COUNTRY_NAMES = (() => {
  try {
    const dn = new Intl.DisplayNames(["en"], { type: "region" });
    return { get: (code) => (code && code !== "XX" ? dn.of(code) || code : "Unknown") };
  } catch {
    return { get: (code) => code || "Unknown" };
  }
})();

async function getAdminStats() {
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    productPayments,
    billboardPayments,
    plotsClaimed,
    billboardRows,
    topProducts,
    visitsByCountry,
    visitsByReferrer,
    visitsByPath,
    clicksByProduct,
    recentProductPayments,
    recentBillboardPayments,
    visitsLast30d,
  ] = await Promise.all([
    prisma.payment.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.billboardPayment.aggregate({
      where: { status: "PAID" },
      _sum: { amountUSD: true, amountINR: true },
      _count: { id: true },
    }),
    prisma.product.count({ where: { plotNumber: { not: null } } }),
    prisma.billboard.findMany({
      orderBy: { billboardNumber: "asc" },
      select: {
        billboardNumber: true,
        code: true,
        name: true,
        plotDistrict: true,
        rateUSD: true,
        isOccupied: true,
        paymentStatus: true,
        brandName: true,
        websiteUrl: true,
        activeUntil: true,
        totalPaid: true,
      },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { currentAmount: "desc" },
      take: 15,
      select: {
        id: true,
        websiteName: true,
        websiteUrl: true,
        logoUrl: true,
        faviconUrl: true,
        currentAmount: true,
        currency: true,
        clickCount: true,
        plotDistrict: true,
        plotNumber: true,
      },
    }),
    prisma.visitEvent.groupBy({
      by: ["country"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.visitEvent.groupBy({
      by: ["referrer"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 12,
    }),
    prisma.visitEvent.groupBy({
      by: ["path"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),
    prisma.visitEvent.groupBy({
      by: ["productId"],
      where: { productId: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),
    prisma.payment.findMany({
      where: { status: "PAID" },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { product: { select: { websiteName: true, websiteUrl: true } } },
    }),
    prisma.billboardPayment.findMany({
      where: { status: "PAID" },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.visitEvent.count({ where: { createdAt: { gte: since30d } } }),
  ]);

  // ── Brand traffic: resolve productId -> name for the click leaderboard ──
  const brandIds = clicksByProduct.map((c) => c.productId).filter(Boolean);
  const brandLookup = brandIds.length
    ? await prisma.product.findMany({
        where: { id: { in: brandIds } },
        select: { id: true, websiteName: true, websiteUrl: true },
      })
    : [];
  const brandById = new Map(brandLookup.map((b) => [b.id, b]));

  const totalVisits = visitsByCountry.reduce((s, c) => s + c._count.id, 0);

  return {
    generatedAt: new Date().toISOString(),

    // ── Payments ──────────────────────────────────────────────────────
    payments: {
      totalCollectedINR: productPayments._sum.amount || 0,
      totalCollectedUSD: billboardPayments._sum.amountUSD || 0,
      billboardCollectedINR: billboardPayments._sum.amountINR || 0,
      productPaymentCount: productPayments._count.id || 0,
      billboardPaymentCount: billboardPayments._count.id || 0,
      recent: [
        ...recentProductPayments.map((p) => ({
          kind: "PLOT",
          id: p.id,
          brand: p.product?.websiteName || p.product?.websiteUrl || "—",
          amount: p.amount,
          currency: p.currency,
          status: p.status,
          createdAt: p.createdAt,
        })),
        ...recentBillboardPayments.map((p) => ({
          kind: "BILLBOARD",
          id: p.id,
          brand: p.brandName || p.websiteUrl || "—",
          amount: p.amountUSD,
          currency: "USD",
          status: p.status,
          createdAt: p.createdAt,
        })),
      ]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 20),
    },

    // ── Plots ─────────────────────────────────────────────────────────
    plots: {
      total: PLOT_SLOTS.length,
      claimed: plotsClaimed,
      vacant: Math.max(0, PLOT_SLOTS.length - plotsClaimed),
      pctSold: PLOT_SLOTS.length ? Math.round((plotsClaimed / PLOT_SLOTS.length) * 1000) / 10 : 0,
    },

    // ── Billboards ────────────────────────────────────────────────────
    billboards: {
      total: BILLBOARD_CATALOG.length,
      live: billboardRows.filter((b) => b.isOccupied).length,
      vacant: billboardRows.filter((b) => !b.isOccupied).length,
      list: billboardRows.map((b) => ({
        number: b.billboardNumber,
        code: b.code,
        name: b.name,
        district: b.plotDistrict,
        rateUSD: b.rateUSD,
        isLive: b.isOccupied,
        status: b.paymentStatus,
        brand: b.brandName || null,
        websiteUrl: b.websiteUrl || null,
        activeUntil: b.activeUntil,
        totalPaid: b.totalPaid,
      })),
    },

    // ── Leaderboard ───────────────────────────────────────────────────
    leaderboard: topProducts.map((p, i) => ({
      rank: i + 1,
      id: p.id,
      brand: p.websiteName || p.websiteUrl,
      websiteUrl: p.websiteUrl,
      logoUrl: p.logoUrl || p.faviconUrl,
      amount: p.currentAmount,
      currency: p.currency,
      clicks: p.clickCount,
      district: p.plotDistrict,
      plotNumber: p.plotNumber,
    })),

    // ── Traffic / geography ───────────────────────────────────────────
    traffic: {
      totalVisits30d: visitsLast30d,
      byCountry: visitsByCountry.map((c) => ({
        code: c.country,
        name: COUNTRY_NAMES.get(c.country),
        count: c._count.id,
        pct: totalVisits ? Math.round((c._count.id / totalVisits) * 1000) / 10 : 0,
      })),
      byReferrer: visitsByReferrer.map((r) => ({
        source: referrerHost(r.referrer),
        count: r._count.id,
      })),
      byPath: visitsByPath.map((p) => ({ path: p.path, count: p._count.id })),
    },

    // ── Which brands are pulling traffic ──────────────────────────────
    brandTraffic: clicksByProduct.map((c) => {
      const b = brandById.get(c.productId);
      return {
        productId: c.productId,
        brand: b?.websiteName || b?.websiteUrl || "Unknown",
        websiteUrl: b?.websiteUrl || null,
        clicks: c._count.id,
      };
    }),
  };
}

module.exports = { getAdminStats };
