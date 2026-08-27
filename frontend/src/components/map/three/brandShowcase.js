import * as THREE from "three";
import { plazaRect, timesSquareRect } from "./cityGrid.js";

/**
 * Supersampling factor for in-world canvas signage. Drawing code works in a
 * logical 512-wide space; the backing bitmap is SIGN_SS× larger so text stays
 * crisp when the player walks right up to a billboard.
 */
const SIGN_SS = 4;

/** Max-quality sampling for any world-space canvas texture. */
export function crispTexture(canvas, { srgb = true, repeat = null } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = CRISP_ANISO.v;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  t.needsUpdate = true;
  return t;
}
export const CRISP_ANISO = { v: 16 };
export function setCrispAnisotropy(v) { CRISP_ANISO.v = Math.max(1, v || 1); }


/**
 * Brand Showcase & Billboard System for TopRankWorld.lol.
 *
 * Provides:
 *  1. Eye-level Brand Ownership Boards in front of all product-owned buildings.
 *  2. City-Wide High-Tech LED Billboards & Mega-Screens with sponsored ads & fixed costs.
 */

const BILLBOARD_CLAIM_KEY = "tri-claimed-billboards";
export function loadClaimedBillboards() {
  try {
    return JSON.parse(localStorage.getItem(BILLBOARD_CLAIM_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

export function saveClaimedBillboards(obj) {
  try {
    localStorage.setItem(BILLBOARD_CLAIM_KEY, JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}

export const CITY_BILLBOARD_LOCATIONS = [
  // ── TIMES SQUARE — the neon canyon, six premium mega-screens ─────────
  {
    billboardNumber: 11,
    id: "bb_ts_north_tower",
    name: "Times Square North Tower Mega-Screen",
    type: "Premium Neon Canyon Screen",
    costFormatted: "$75 / mo",
    costUSD: 75,
    width: 22,
    height: 12,
    elevation: 20,
    isGantry: false,
    anchor: "times",
    getPos: (p) => ({ x: p.cx, z: p.z0 - 6, yaw: Math.PI }),
  },
  {
    billboardNumber: 12,
    id: "bb_ts_south_tower",
    name: "Times Square South Tower Mega-Screen",
    type: "Premium Neon Canyon Screen",
    costFormatted: "$75 / mo",
    costUSD: 75,
    width: 22,
    height: 12,
    elevation: 20,
    isGantry: false,
    anchor: "times",
    getPos: (p) => ({ x: p.cx, z: p.z1 + 6, yaw: 0 }),
  },
  {
    billboardNumber: 13,
    id: "bb_ts_east",
    name: "Times Square East Marquee",
    type: "Corner Marquee LED",
    costFormatted: "$60 / mo",
    costUSD: 60,
    width: 18,
    height: 10,
    elevation: 14,
    isGantry: false,
    anchor: "times",
    getPos: (p) => ({ x: p.x1 + 6, z: p.cz, yaw: -Math.PI / 2 }),
  },
  {
    billboardNumber: 14,
    id: "bb_ts_west",
    name: "Times Square West Marquee",
    type: "Corner Marquee LED",
    costFormatted: "$60 / mo",
    costUSD: 60,
    width: 18,
    height: 10,
    elevation: 14,
    isGantry: false,
    anchor: "times",
    getPos: (p) => ({ x: p.x0 - 6, z: p.cz, yaw: Math.PI / 2 }),
  },
  {
    billboardNumber: 15,
    id: "bb_ts_gantry",
    name: "Times Square Crossroads Gantry",
    type: "Overhead Pedestrian Gantry",
    costFormatted: "$55 / mo",
    costUSD: 55,
    width: 20,
    height: 9,
    elevation: 11,
    isGantry: true,
    anchor: "times",
    getPos: (p) => ({ x: p.cx - 34, z: p.cz - 22, yaw: Math.PI / 3 }),
  },
  {
    billboardNumber: 16,
    id: "bb_ts_bleachers",
    name: "Times Square Bleacher Screen",
    type: "Plaza-Level LED Wall",
    costFormatted: "$45 / mo",
    costUSD: 45,
    width: 16,
    height: 9,
    elevation: 8,
    isGantry: false,
    anchor: "times",
    getPos: (p) => ({ x: p.cx + 34, z: p.cz + 22, yaw: -Math.PI / 1.5 }),
  },
  {
    billboardNumber: 1,
    id: "bb_commerce_ave",
    name: "Downtown Financial Avenue Mega-Screen",
    type: "Financial Hub Rooftop Billboard",
    costFormatted: "$30 / mo",
    costUSD: 30,
    width: 15,
    height: 8.2,
    elevation: 12,
    isGantry: false,
    getPos: (p) => ({ x: p.cx + 92, z: p.cz + 32, yaw: Math.PI / 2 }),
  },
  {
    billboardNumber: 2,
    id: "bb_cp_south",
    name: "Central Park South Mega-Gantry",
    type: "Overhead Highway Mega-Screen",
    costFormatted: "$30 / mo",
    costUSD: 30,
    width: 14,
    height: 7.5,
    elevation: 8,
    isGantry: true,
    getPos: (p) => ({ x: p.cx, z: p.z1 + 8, yaw: 0 }),
  },
  {
    billboardNumber: 3,
    id: "bb_cp_north",
    name: "Central Park North Digital Plaza Screen",
    type: "Grand Plaza LED Billboard",
    costFormatted: "$25 / mo",
    costUSD: 25,
    width: 12,
    height: 6.8,
    elevation: 7,
    isGantry: false,
    getPos: (p) => ({ x: p.cx, z: p.z0 - 8, yaw: Math.PI }),
  },
  {
    billboardNumber: 4,
    id: "bb_highway_east",
    name: "Commerce Highway Dual-Sided Gantry",
    type: "Highway Overhead LED Billboard",
    costFormatted: "$20 / mo",
    costUSD: 20,
    width: 14,
    height: 7.2,
    elevation: 8.5,
    isGantry: true,
    getPos: (p) => ({ x: p.cx + 120, z: p.cz - 45, yaw: 0 }),
  },
  {
    billboardNumber: 5,
    id: "bb_waterfront",
    name: "Waterfront Marina Scenic Billboard",
    type: "Coastal Marina Mega-Billboard",
    costFormatted: "$15 / mo",
    costUSD: 15,
    width: 11,
    height: 6.2,
    elevation: 6.5,
    isGantry: false,
    getPos: (p) => ({ x: p.cx - 120, z: p.cz + 45, yaw: Math.PI }),
  },
  {
    billboardNumber: 6,
    id: "bb_fountain_east",
    name: "Botanical Promenade East Video Totem",
    type: "Promenade Digital Pillar",
    costFormatted: "$15 / mo",
    costUSD: 15,
    width: 7.5,
    height: 9.5,
    elevation: 2.2,
    isGantry: false,
    getPos: (p) => ({ x: p.cx + 28, z: p.cz + 14, yaw: -Math.PI / 4 }),
  },
  {
    billboardNumber: 7,
    id: "bb_fountain_west",
    name: "Botanical Promenade West Video Totem",
    type: "Promenade Digital Pillar",
    costFormatted: "$15 / mo",
    costUSD: 15,
    width: 7.5,
    height: 9.5,
    elevation: 2.2,
    isGantry: false,
    getPos: (p) => ({ x: p.cx - 28, z: p.cz - 14, yaw: Math.PI * 0.75 }),
  },
  {
    billboardNumber: 8,
    id: "bb_tech_hub",
    name: "Westside Tech District Video Totem",
    type: "Tech Hub Interactive Display",
    costFormatted: "$10 / mo",
    costUSD: 10,
    width: 8,
    height: 8.5,
    elevation: 3,
    isGantry: false,
    getPos: (p) => ({ x: p.cx - 88, z: p.cz - 32, yaw: -Math.PI / 2 }),
  },
  {
    billboardNumber: 9,
    id: "bb_north_blvd",
    name: "North Coastal Boulevard LED Screen",
    type: "Boulevard Roadside Display",
    costFormatted: "$10 / mo",
    costUSD: 10,
    width: 10,
    height: 6.0,
    elevation: 5.5,
    isGantry: false,
    getPos: (p) => ({ x: p.cx + 42, z: p.cz - 110, yaw: Math.PI / 2 }),
  },
  {
    billboardNumber: 10,
    id: "bb_south_blvd",
    name: "South Parkview Boulevard Billboard",
    type: "Parkview Roadside Display",
    costFormatted: "$5 / mo",
    costUSD: 5,
    width: 10,
    height: 6.0,
    elevation: 5.5,
    isGantry: false,
    getPos: (p) => ({ x: p.cx - 42, z: p.cz + 110, yaw: -Math.PI / 2 }),
  },
];

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Creates a 3D Ownership Board / Pedestal placed in front of an owned building.
 */
export function makeBrandOwnershipBoard({ product, rank, amount, distColor, w, d }) {
  const g = new THREE.Group();
  g.name = `brand-board-${product.id || rank}`;

  const brandName = product.websiteName || "Featured Brand";
  const category = product.category?.name || "Corporate Enterprise";
  const desc = product.tagline || product.description || "Official brand property on TopRankWorld.lol";
  const colorHex = distColor || "#F05A38";

  // 1. Draw Canvas Signboard (512x320)
  const cv = document.createElement("canvas");
  cv.width = 512 * SIGN_SS;
  cv.height = 320 * SIGN_SS;
  const ctx = cv.getContext("2d");
  ctx.scale(SIGN_SS, SIGN_SS);
  ctx.textRendering = "geometricPrecision";

  // Modern dark glossy background
  const bgGrad = ctx.createLinearGradient(0, 0, 512, 320);
  bgGrad.addColorStop(0, "#0a0f1d");
  bgGrad.addColorStop(1, "#141c2e");
  ctx.fillStyle = bgGrad;
  roundRect(ctx, 0, 0, 512, 320, 24);
  ctx.fill();

  // Glowing brand accent border
  ctx.lineWidth = 6;
  ctx.strokeStyle = colorHex;
  roundRect(ctx, 3, 3, 506, 314, 21);
  ctx.stroke();

  // Top header: Owned Building
  ctx.fillStyle = colorHex;
  roundRect(ctx, 20, 20, 472, 42, 10);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`★ OWNED HEADQUARTERS · #${rank} RANKED`, 256, 48);

  // Logo Monogram
  const monogram = brandName.slice(0, 2).toUpperCase();
  ctx.fillStyle = "#1e293b";
  roundRect(ctx, 28, 80, 72, 72, 14);
  ctx.fill();
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 3;
  roundRect(ctx, 28, 80, 72, 72, 14);
  ctx.stroke();

  ctx.fillStyle = colorHex;
  ctx.font = "900 32px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(monogram, 64, 128);

  // Brand Name
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px 'Inter', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(brandName.length > 18 ? brandName.slice(0, 17) + "…" : brandName, 114, 112);

  // Category
  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 16px 'Inter', sans-serif";
  ctx.fillText(category.toUpperCase(), 114, 140);

  // Tagline / Description
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "16px 'Inter', sans-serif";
  const shortDesc = desc.length > 52 ? desc.slice(0, 50) + "…" : desc;
  ctx.fillText(shortDesc, 28, 192);

  // Bottom Valuation & CTA
  ctx.fillStyle = "#0f172a";
  roundRect(ctx, 20, 224, 472, 72, 14);
  ctx.fill();

  ctx.fillStyle = "#10b981";
  ctx.font = "bold 21px 'Inter', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`Valuation: ₹${(amount || 0).toLocaleString("en-IN")}`, 36, 268);

  ctx.fillStyle = "#f97316";
  ctx.font = "bold 15px 'Inter', sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("Click / [E] for Details ↗", 476, 268);

  const tex = crispTexture(cv);

  // 2. 3D Meshes
  const boardMat = new THREE.MeshStandardMaterial({
    map: tex,
    emissiveMap: tex,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.35,
    roughness: 0.25,
    metalness: 0.1,
  });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e2430, roughness: 0.4, metalness: 0.8 });
  const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(colorHex) });

  const boardW = 3.6;
  const boardH = 2.25;
  const boardMesh = new THREE.Mesh(
    new THREE.BoxGeometry(boardW, boardH, 0.12),
    [frameMat, frameMat, frameMat, frameMat, boardMat, boardMat]
  );
  boardMesh.position.y = 2.15;
  boardMesh.castShadow = true;
  g.add(boardMesh);

  // Glowing neon frame
  const edgeMesh = new THREE.Mesh(new THREE.BoxGeometry(boardW + 0.08, boardH + 0.08, 0.03), glowMat);
  edgeMesh.position.set(0, 2.15, 0);
  edgeMesh.userData.bloom = true;
  g.add(edgeMesh);

  // Twin chrome posts
  const postMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.3, metalness: 0.85 });
  [-1, 1].forEach((s) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 1.2, 10), postMat);
    post.position.set(s * (boardW * 0.38), 0.6, 0);
    post.castShadow = true;
    g.add(post);
  });

  // Base plinth
  const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(boardW * 0.95, 0.2, 0.85), frameMat);
  baseMesh.position.y = 0.1;
  baseMesh.castShadow = true;
  g.add(baseMesh);

  // Place board in front of the building entrance
  g.position.set(0, 0, d / 2 + 2.5);
  g.userData = {
    isBrandBoard: true,
    product,
    brand: brandName,
    rank,
    amount,
    district: product.district || "Downtown",
    color: colorHex,
  };

  return g;
}


/**
 * Live billboard screen behaviour.
 *
 * - Loads the brand's own imagery (OG image → logo → favicon → Google S2) and
 *   composites it onto the LED canvas once it arrives, so a booked screen
 *   actually shows the sponsor's artwork.
 * - Animates a scrolling ticker, a pulsing CTA chip and a rolling scanline,
 *   which is what makes the board read as a running ad rather than a decal.
 *
 * Returns a `tick(t, dt)` you attach to the billboard group's userData.
 */
function attachLiveScreen({ canvas, ctx, texture, brand, websiteUrl, color, claimed, costText }) {
  const W = 512;
  const H = 288;

  // snapshot the static art we drew, so each animated frame starts clean
  const base = document.createElement("canvas");
  base.width = canvas.width;
  base.height = canvas.height;
  base.getContext("2d").drawImage(canvas, 0, 0);

  // ── pull the brand's own image, best source first ────────────────────
  let art = null;
  if (claimed && websiteUrl) {
    let host = "";
    try { host = new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`).hostname; } catch { /* ignore */ }
    const candidates = [
      `https://www.google.com/s2/favicons?sz=256&domain=${host}`,
      `https://icons.duckduckgo.com/ip3/${host}.ico`,
    ];
    let ci = 0;
    const tryNext = () => {
      if (ci >= candidates.length) return;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => { art = img; };
      img.onerror = () => { ci++; tryNext(); };
      img.src = candidates[ci];
    };
    tryNext();
  }

  const ticker = claimed
    ? `${brand.toUpperCase()}   ★   ${websiteUrl || "toprankworld.lol"}   ★   OFFICIAL CITY SPONSOR   ★   `
    : `THIS SCREEN IS AVAILABLE   ★   ${costText}   ★   PRESS [E] TO BOOK IT   ★   `;

  return function tick(t) {
    const g = ctx;
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(base, 0, 0);
    g.scale(canvas.width / W, canvas.height / H);

    // brand artwork, dropped into the logo plate once loaded
    if (art) {
      g.save();
      g.beginPath();
      g.roundRect ? g.roundRect(26, 74, 62, 62, 10) : g.rect(26, 74, 62, 62);
      g.clip();
      g.drawImage(art, 26, 74, 62, 62);
      g.restore();
    }

    // ── scrolling ticker along the bottom ─────────────────────────────
    const tickerY = H - 26;
    g.fillStyle = "rgba(6,10,18,0.92)";
    g.fillRect(0, tickerY - 15, W, 26);
    g.fillStyle = color;
    g.fillRect(0, tickerY - 15, W, 2);
    g.font = "bold 15px 'Inter', sans-serif";
    g.textAlign = "left";
    g.textBaseline = "middle";
    const tw = g.measureText(ticker).width || 1;
    const off = -((t * 62) % tw);
    g.fillStyle = "#eaf4ff";
    for (let x = off; x < W; x += tw) g.fillText(ticker, x, tickerY - 1);

    // ── pulsing CTA chip ──────────────────────────────────────────────
    const pulse = 0.5 + Math.sin(t * 3.2) * 0.5;
    const label = claimed ? "VISIT  ↗" : "BOOK  [E]";
    g.font = "900 15px 'Inter', sans-serif";
    const cw = g.measureText(label).width + 30;
    const cxp = W - cw - 20;
    const cyp = H - 74;
    g.globalAlpha = 0.55 + pulse * 0.45;
    g.fillStyle = color;
    g.beginPath();
    g.roundRect ? g.roundRect(cxp, cyp, cw, 30, 15) : g.rect(cxp, cyp, cw, 30);
    g.fill();
    g.globalAlpha = 1;
    g.strokeStyle = "rgba(255,255,255,0.85)";
    g.lineWidth = 1.4;
    g.stroke();
    g.fillStyle = "#fff";
    g.textAlign = "center";
    g.fillText(label, cxp + cw / 2, cyp + 16);

    // ── rolling LED scanline + subtle vignette ────────────────────────
    const sy = (t * 46) % (H + 60) - 30;
    const grad = g.createLinearGradient(0, sy - 26, 0, sy + 26);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.5, "rgba(255,255,255,0.07)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, sy - 26, W, 52);

    g.restore();
    texture.needsUpdate = true;
  };
}

/**
 * Creates a high-impact City Billboard / LED Screen.
 */
export function makeCityBillboard({ billboardDef, product, billboardRecord }) {
  const g = new THREE.Group();
  g.name = `billboard-${billboardDef.id}`;

  const bbNum = billboardRecord?.billboardNumber || billboardDef.billboardNumber || 1;
  const rateUSD = billboardRecord?.rateUSD || billboardDef.costUSD || 20;
  const costText = `$${rateUSD} / mo`;

  const isClaimed = Boolean(
    billboardRecord?.isOccupied ||
    billboardRecord?.paymentStatus === "PAID" ||
    (product && (product.isClaimed || product.isBought))
  );

  const brandName = isClaimed
    ? (billboardRecord?.brandName || product?.websiteName || "Featured Brand Sponsor")
    : `BILLBOARD #${bbNum}`;

  const category = isClaimed
    ? (billboardRecord?.categoryName || product?.category?.name || "Official Partner")
    : `RATE: ${costText}`;

  const tagline = isClaimed
    ? (billboardRecord?.tagline || product?.tagline || product?.description || "Explore verified top ranked products & services.")
    : `Available for ${costText} • 1-Month Exclusive Placement`;

  const rank = isClaimed ? (product?.rank || 1) : null;
  const colorHex = isClaimed ? (billboardRecord?.color || product?.color || "#F05A38") : "#0ea5e9";

  // 1. Draw Digital Billboard Canvas (512x288)
  const cv = document.createElement("canvas");
  cv.width = 512 * SIGN_SS;
  cv.height = 288 * SIGN_SS;
  const ctx = cv.getContext("2d");
  ctx.scale(SIGN_SS, SIGN_SS);
  ctx.textRendering = "geometricPrecision";

  // Modern digital background
  const bgGrad = ctx.createLinearGradient(0, 0, 512, 288);
  if (isClaimed) {
    bgGrad.addColorStop(0, "#080d1a");
    bgGrad.addColorStop(0.5, "#0f172a");
    bgGrad.addColorStop(1, "#1e1b4b");
  } else {
    bgGrad.addColorStop(0, "#030712");
    bgGrad.addColorStop(0.5, "#0b1329");
    bgGrad.addColorStop(1, "#082f49");
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 512, 288);

  // Digital cyber grid lines
  ctx.strokeStyle = isClaimed ? "rgba(255, 255, 255, 0.05)" : "rgba(14, 165, 233, 0.12)";
  ctx.lineWidth = 1;
  for (let x = 0; x < 512; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 288);
    ctx.stroke();
  }
  for (let y = 0; y < 288; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Top header: Status & Fixed Monthly Rate
  ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
  roundRect(ctx, 16, 14, 480, 36, 10);
  ctx.fill();

  if (isClaimed) {
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 14px 'Inter', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("● SPONSORED BILLBOARD", 30, 37);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 14px 'Inter', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`Fixed Rate: ${costText}`, 482, 37);
  } else {
    ctx.fillStyle = "#38bdf8";
    ctx.font = "900 13px 'Inter', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("★ AVAILABLE AD SPACE", 30, 37);

    ctx.fillStyle = "#4ade80";
    ctx.font = "900 14px 'Inter', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`Fixed Cost: ${costText}`, 482, 37);
  }

  if (isClaimed) {
    // Logo Monogram
    const monogram = brandName.slice(0, 2).toUpperCase();
    ctx.fillStyle = colorHex;
    roundRect(ctx, 24, 68, 76, 76, 16);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 36px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(monogram, 62, 122);

    // Brand Name
    ctx.fillStyle = "#ffffff";
    ctx.font = "black 32px 'Inter', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(brandName.length > 17 ? brandName.slice(0, 16) + "…" : brandName, 116, 104);

    // Category Badge
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    roundRect(ctx, 116, 116, 150, 24, 6);
    ctx.fill();
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 12px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(category.toUpperCase(), 191, 132);

    // Tagline
    ctx.fillStyle = "#94a3b8";
    ctx.font = "16px 'Inter', sans-serif";
    ctx.textAlign = "left";
    const shortTag = tagline.length > 48 ? tagline.slice(0, 46) + "…" : tagline;
    ctx.fillText(shortTag, 24, 185);

    // Bottom CTA Bar
    const ctaGrad = ctx.createLinearGradient(24, 214, 488, 268);
    ctaGrad.addColorStop(0, "#f05a38");
    ctaGrad.addColorStop(1, "#ea580c");
    ctx.fillStyle = ctaGrad;
    roundRect(ctx, 24, 214, 464, 54, 14);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px 'Inter', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Rank #${rank} Official Brand`, 42, 248);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px 'Inter', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("Click to Visit Website ↗", 470, 248);
  } else {
    // Vacant Advertising Solicitation Design
    ctx.fillStyle = "rgba(14, 165, 233, 0.15)";
    roundRect(ctx, 24, 62, 464, 136, 14);
    ctx.fill();
    ctx.strokeStyle = "#0ea5e9";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#38bdf8";
    ctx.font = "900 32px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PLACE YOUR AD HERE", 256, 102);

    ctx.fillStyle = "#facc15";
    ctx.font = "bold 16px 'Inter', sans-serif";
    ctx.fillText(`1-Month Placement Plan · ${costText}`, 256, 134);

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "13px 'Inter', sans-serif";
    ctx.fillText(`Pay ${costText} to advertise your brand on this billboard`, 256, 162);

    // Bottom CTA Bar
    const ctaGrad = ctx.createLinearGradient(24, 214, 488, 268);
    ctaGrad.addColorStop(0, "#0284c7");
    ctaGrad.addColorStop(1, "#0369a1");
    ctx.fillStyle = ctaGrad;
    roundRect(ctx, 24, 214, 464, 54, 14);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Available in Map View · Click Outside City to Buy ↗", 256, 248);
  }

  const tex = crispTexture(cv);

  // 2. 3D Billboard Meshes
  const screenMat = new THREE.MeshStandardMaterial({
    map: tex,
    emissiveMap: tex,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.45,
    roughness: 0.2,
    metalness: 0.15,
  });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.8 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.9 });
  const glowEdgeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(colorHex) });

  const sW = billboardDef.width || 12;
  const sH = billboardDef.height || 6.75;
  const poleH = billboardDef.elevation || 8;

  // Screen housing
  const screenBox = new THREE.Mesh(
    new THREE.BoxGeometry(sW, sH, 0.4),
    [frameMat, frameMat, frameMat, frameMat, screenMat, screenMat]
  );
  screenBox.position.y = poleH + sH / 2;
  screenBox.castShadow = true;
  g.add(screenBox);

  // Glowing outline
  const frameMesh = new THREE.Mesh(new THREE.BoxGeometry(sW + 0.3, sH + 0.3, 0.08), glowEdgeMat);
  frameMesh.position.set(0, poleH + sH / 2, 0);
  frameMesh.userData.bloom = true;
  g.add(frameMesh);

  // Support structure
  if (billboardDef.isGantry) {
    [-1, 1].forEach((s) => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.8, poleH + sH, 0.8), steelMat);
      p.position.set(s * (sW * 0.52), (poleH + sH) / 2, 0);
      p.castShadow = true;
      g.add(p);
    });
  } else {
    const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, poleH, 16), steelMat);
    pylon.position.y = poleH / 2;
    pylon.castShadow = true;
    g.add(pylon);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.9, 0.8, 16), steelMat);
    base.position.y = 0.4;
    base.castShadow = true;
    g.add(base);
  }

  // Spotlights
  for (let i = -1; i <= 1; i += 2) {
    const lampArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 8), steelMat);
    lampArm.rotation.x = Math.PI / 4;
    lampArm.position.set(i * (sW * 0.35), poleH + sH + 0.4, 0.6);
    g.add(lampArm);

    const lampHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    lampHead.position.set(i * (sW * 0.35), poleH + sH + 0.8, 1.1);
    lampHead.userData.bloom = true;
    g.add(lampHead);
  }

  const p = billboardDef.anchor === "times" ? timesSquareRect() : plazaRect();
  const coords = billboardDef.getPos(p);
  g.position.set(coords.x, 0, coords.z);
  g.rotation.y = coords.yaw || 0;

  g.userData = {
    isBillboard: true,
    billboardNumber: bbNum,
    billboardId: billboardDef.id,
    code: billboardDef.id,
    billboardDef,
    billboardName: billboardRecord?.name || billboardDef.name,
    fixedCost: costText,
    costUSD: rateUSD,
    rateUSD: rateUSD,
    billingCycle: billboardRecord?.billingCycle || "MONTHLY",
    product: isClaimed ? (product || {
      id: `claimed_${bbNum}`,
      websiteName: brandName,
      websiteUrl: billboardRecord?.websiteUrl || product?.websiteUrl,
      tagline,
      description: tagline,
      logoUrl: billboardRecord?.logoUrl || product?.logoUrl,
      faviconUrl: billboardRecord?.faviconUrl || product?.faviconUrl,
      isClaimed: true,
      isBought: true,
    }) : {
      id: `vacant_${bbNum}`,
      websiteName: `Billboard #${bbNum}`,
      tagline,
      isClaimed: false,
    },
    brand: brandName,
    rank,
    color: colorHex,
    tick: attachLiveScreen({
      canvas: cv,
      ctx,
      texture: tex,
      brand: brandName,
      websiteUrl: billboardRecord?.websiteUrl || product?.websiteUrl,
      color: colorHex,
      claimed: isClaimed,
      costText,
    }),
    isOccupied: isClaimed,
    paymentStatus: isClaimed ? "PAID" : "VACANT",
    activeUntil: billboardRecord?.activeUntil,
  };

  return g;
}

