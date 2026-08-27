const prisma = require("../../Config/DBConnect");
const { BILLBOARD_CATALOG } = require("./billboardCatalog");

/**
 * Seeds and re-synchronises every catalog slot (#1 – #24, Times Square
 * included) into the database. Safe to call on every boot: an existing row
 * keeps its booking state and only has its immutable spec refreshed, so
 * re-pricing or re-sizing a slot in the catalog reaches a live database
 * without ever cancelling somebody's paid placement.
 */
async function initBillboards() {
  try {
    for (const item of BILLBOARD_CATALOG) {
      await prisma.billboard.upsert({
        where: { billboardNumber: item.billboardNumber },
        update: {
          code: item.code,
          name: item.name,
          type: item.type,
          rateUSD: item.rateUSD,
          rateINR: item.rateINR,
          billingCycle: item.billingCycle,
          plotDistrict: item.plotDistrict,
          elevation: item.elevation,
          width: item.width,
          height: item.height,
          isGantry: item.isGantry,
          mount: item.mount || "pole",
          orientation: item.orientation || "landscape",
        },
        create: {
          billboardNumber: item.billboardNumber,
          code: item.code,
          name: item.name,
          type: item.type,
          rateUSD: item.rateUSD,
          rateINR: item.rateINR,
          billingCycle: item.billingCycle,
          plotDistrict: item.plotDistrict,
          elevation: item.elevation,
          width: item.width,
          height: item.height,
          isGantry: item.isGantry,
          mount: item.mount || "pole",
          orientation: item.orientation || "landscape",
          isOccupied: false,
          paymentStatus: "VACANT",
        },
      });
    }
  } catch (err) {
    console.error("[BillboardService] Init error:", err.message);
  }
}

/**
 * Fetches all 10 constant billboards from the database.
 * Automatically marks expired monthly billboard bookings as VACANT.
 */
async function getAllBillboards() {
  try {
    const now = new Date();
    // Check for expired bookings and update them
    await prisma.billboard.updateMany({
      where: {
        isOccupied: true,
        activeUntil: { lt: now },
      },
      data: {
        isOccupied: false,
        paymentStatus: "VACANT",
      },
    });

    const list = await prisma.billboard.findMany({
      orderBy: { billboardNumber: "asc" },
      include: {
        payments: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!list || list.length === 0) {
      await initBillboards();
      return await prisma.billboard.findMany({ orderBy: { billboardNumber: "asc" } });
    }

    return list;
  } catch (err) {
    console.error("[BillboardService] getAllBillboards DB error:", err.message);
    // Fallback in-memory catalog
    return BILLBOARD_CATALOG.map((c) => ({
      ...c,
      isOccupied: false,
      paymentStatus: "VACANT",
      payments: [],
    }));
  }
}

/**
 * Books a monthly billboard ad, updates the Billboard row with paymentStatus="PAID",
 * and logs the transaction into the BillboardPayment table.
 */
async function bookBillboard({
  billboardNumber,
  code,
  websiteUrl,
  brandName,
  tagline = "",
  description = "",
  logoUrl = "",
  faviconUrl = "",
  categoryName = "Featured Sponsor",
  color = "#F05A38",
  months = 1,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) {
  const num = billboardNumber ? Number(billboardNumber) : null;
  const where = num ? { billboardNumber: num } : { code: String(code) };

  const catalogDef = BILLBOARD_CATALOG.find(
    (c) => c.billboardNumber === num || c.code === code
  ) || BILLBOARD_CATALOG[0];

  const rateUSD = catalogDef.rateUSD;
  const amountUSD = rateUSD * Math.max(1, Number(months) || 1);
  const amountINR = amountUSD * 83;

  const now = new Date();
  const activeUntil = new Date(now.getTime() + (Number(months) || 1) * 30 * 24 * 60 * 60 * 1000);

  const orderId = razorpayOrderId || `bb_ord_${Date.now()}`;
  const payId = razorpayPaymentId || `bb_pay_${Date.now()}`;

  try {
    const billboard = await prisma.billboard.upsert({
      where,
      update: {
        isOccupied: true,
        paymentStatus: "PAID",
        activeUntil,
        bookedMonths: Math.max(1, Number(months) || 1),
        lastPaidAt: now,
        totalPaid: { increment: amountUSD },
        brandName: brandName.trim(),
        websiteUrl: websiteUrl.trim(),
        tagline: tagline.trim() || "Official Premium Brand Sponsor",
        description: description.trim() || tagline.trim() || "Official Premium Brand Sponsor",
        logoUrl: logoUrl || "",
        faviconUrl: faviconUrl || "",
        categoryName: categoryName || "Featured Sponsor",
        color: color || "#F05A38",
      },
      create: {
        billboardNumber: catalogDef.billboardNumber,
        code: catalogDef.code,
        name: catalogDef.name,
        type: catalogDef.type,
        rateUSD: catalogDef.rateUSD,
        rateINR: catalogDef.rateINR,
        billingCycle: "MONTHLY",
        plotDistrict: catalogDef.plotDistrict,
        elevation: catalogDef.elevation,
        width: catalogDef.width,
        height: catalogDef.height,
        isGantry: catalogDef.isGantry,
        mount: catalogDef.mount || "pole",
        orientation: catalogDef.orientation || "landscape",
        isOccupied: true,
        paymentStatus: "PAID",
        activeUntil,
        bookedMonths: Math.max(1, Number(months) || 1),
        lastPaidAt: now,
        totalPaid: amountUSD,
        brandName: brandName.trim(),
        websiteUrl: websiteUrl.trim(),
        tagline: tagline.trim() || "Official Premium Brand Sponsor",
        description: description.trim() || tagline.trim() || "Official Premium Brand Sponsor",
        logoUrl: logoUrl || "",
        faviconUrl: faviconUrl || "",
        categoryName: categoryName || "Featured Sponsor",
        color: color || "#F05A38",
      },
    });

    // Record payment audit row in BillboardPayment
    await prisma.billboardPayment.create({
      data: {
        billboardId: billboard.id,
        billboardNumber: billboard.billboardNumber,
        razorpayOrderId: orderId,
        razorpayPaymentId: payId,
        razorpaySignature: razorpaySignature || "",
        amountUSD,
        amountINR,
        months: Math.max(1, Number(months) || 1),
        status: "PAID",
        websiteUrl: websiteUrl.trim(),
        brandName: brandName.trim(),
        tagline: tagline.trim(),
      },
    });

    return billboard;
  } catch (err) {
    console.error("[BillboardService] bookBillboard DB error:", err.message);
    return {
      billboardNumber: catalogDef.billboardNumber,
      code: catalogDef.code,
      name: catalogDef.name,
      type: catalogDef.type,
      rateUSD: catalogDef.rateUSD,
      rateINR: catalogDef.rateINR,
      billingCycle: "MONTHLY",
      isOccupied: true,
      paymentStatus: "PAID",
      activeUntil,
      bookedMonths: Number(months) || 1,
      brandName,
      websiteUrl,
      tagline,
      description,
      logoUrl,
      faviconUrl,
      categoryName,
      color,
    };
  }
}

// Initial seed
initBillboards();

module.exports = {
  initBillboards,
  getAllBillboards,
  bookBillboard,
  BILLBOARD_CATALOG,
};

