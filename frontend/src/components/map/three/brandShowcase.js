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

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "/api";

export function proxyImageUrl(url) {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("/api/proxy-image")) return url;
  return `${API_BASE}/proxy-image?url=${encodeURIComponent(url)}`;
}

export function loadSafeFavicon(rawSources, onImageLoaded) {
  const sources = [];
  rawSources.filter(Boolean).forEach((url) => {
    sources.push(proxyImageUrl(url));
    sources.push(url);
  });

  let idx = 0;
  const tryNext = () => {
    if (idx >= sources.length) return;
    const src = sources[idx];
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (img.width > 0) {
        onImageLoaded(img);
      } else {
        idx++;
        tryNext();
      }
    };
    img.onerror = () => {
      idx++;
      tryNext();
    };
    img.src = src;
  };
  tryNext();
}

/**
 * Signage brightness, driven by the city clock (see timeOfDay.js).
 *
 * `screen` is how hot the panel's own artwork burns. It is deliberately modest:
 * an over-driven emissive screen (plus bloom on top) turned every billboard
 * into a white rectangle you could not actually read. `edge` only affects the
 * accent frame, which IS on the bloom layer and is what should glow.
 */
export const SIGN_LIGHT = { screen: 1.0, edge: 0.9 };
export function setSignageMode(preset) {
  SIGN_LIGHT.screen = preset?.signEmissive ?? 1.0;
  SIGN_LIGHT.edge = preset?.signEdgeEmissive ?? 0.9;
}


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
  } catch (e) {
    return {};
  }
}

export function saveClaimedBillboards(obj) {
  try {
    localStorage.setItem(BILLBOARD_CLAIM_KEY, JSON.stringify(obj));
  } catch (e) {
    /* ignore */
  }
}

export const CITY_BILLBOARD_LOCATIONS = [
  // ── TIMES SQUARE ────────────────────────────────────────────────────
  // The square sells SIGNAGE, not property. Every board here is bolted to the
  // face of a building that belongs to the city permanently, so the whole
  // inventory of the crossroads is what you see below.
  //
  // Three deliberate rules, all learned from walking it in third person:
  //   1. `mount: "facade"` / `"folded"` dominate - a forest of roadside pylons
  //      looked nothing like the real place. Only two poles survive.
  //   2. Elevations stay between 7m and 34m. Anything higher is invisible to a
  //      character standing on the plaza, which defeats the point of it.
  //   3. A mix of landscape, portrait and corner-wrapped panels, because a
  //      wall of identical 16:9 rectangles reads as a spreadsheet.
  //
  // The rect passed to getPos is the square itself. Its edges are the CENTRES
  // of the roads that box the crossing. Panels stand proud of the building
  // walls facing into the square so they are never buried inside architecture.

  // North frontage - the big landscape pair over the crossing
  {
    billboardNumber: 11,
    id: "bb_ts_north_marquee",
    name: "Times Square North Marquee",
    type: "Building-Mounted Mega-Screen",
    costFormatted: "$90 / mo",
    costUSD: 90,
    width: 26,
    height: 13,
    elevation: 15,
    orientation: "landscape",
    mount: "facade",
    anchor: "times",
    getPos: (p) => ({ x: p.cx - 30, z: p.z0 - 14.8, yaw: 0 }),
  },
  {
    billboardNumber: 12,
    id: "bb_ts_north_tower",
    name: "Times Square North Tower Screen",
    type: "Building-Mounted Mega-Screen",
    costFormatted: "$80 / mo",
    costUSD: 80,
    width: 22,
    height: 11,
    elevation: 31,
    orientation: "landscape",
    mount: "facade",
    anchor: "times",
    getPos: (p) => ({ x: p.cx + 34, z: p.z0 - 14.8, yaw: 0 }),
  },
  // North frontage - a tall portrait poster between them
  {
    billboardNumber: 13,
    id: "bb_ts_north_portrait",
    name: "Times Square North Vertical Banner",
    type: "Vertical Building Banner",
    costFormatted: "$70 / mo",
    costUSD: 70,
    width: 9,
    height: 20,
    elevation: 9,
    orientation: "portrait",
    mount: "facade",
    anchor: "times",
    getPos: (p) => ({ x: p.cx + 2, z: p.z0 - 14.8, yaw: 0 }),
  },

  // South frontage
  {
    billboardNumber: 14,
    id: "bb_ts_south_marquee",
    name: "Times Square South Marquee",
    type: "Building-Mounted Mega-Screen",
    costFormatted: "$90 / mo",
    costUSD: 90,
    width: 26,
    height: 13,
    elevation: 14,
    orientation: "landscape",
    mount: "facade",
    anchor: "times",
    getPos: (p) => ({ x: p.cx + 30, z: p.z1 + 14.8, yaw: Math.PI }),
  },
  {
    billboardNumber: 15,
    id: "bb_ts_south_portrait",
    name: "Times Square South Vertical Banner",
    type: "Vertical Building Banner",
    costFormatted: "$70 / mo",
    costUSD: 70,
    width: 9,
    height: 20,
    elevation: 9,
    orientation: "portrait",
    mount: "facade",
    anchor: "times",
    getPos: (p) => ({ x: p.cx - 24, z: p.z1 + 14.8, yaw: Math.PI }),
  },
  {
    billboardNumber: 16,
    id: "bb_ts_south_ribbon",
    name: "Times Square South Ribbon Board",
    type: "Wrap-Around Ribbon LED",
    costFormatted: "$55 / mo",
    costUSD: 55,
    width: 24,
    height: 6,
    elevation: 26,
    orientation: "landscape",
    mount: "facade",
    anchor: "times",
    getPos: (p) => ({ x: p.cx - 46, z: p.z1 + 14.8, yaw: Math.PI }),
  },

  // East frontage - including a folded corner wrap
  {
    billboardNumber: 17,
    id: "bb_ts_east_corner",
    name: "Times Square East Corner Wrap",
    type: "Folded Corner Screen",
    costFormatted: "$85 / mo",
    costUSD: 85,
    width: 24,
    height: 12,
    elevation: 12,
    orientation: "landscape",
    mount: "folded",
    anchor: "times",
    getPos: (p) => ({ x: p.x1 + 18.8, z: p.cz - 34, yaw: -Math.PI / 2 }),
  },
  {
    billboardNumber: 18,
    id: "bb_ts_east_portrait",
    name: "Times Square East Vertical Banner",
    type: "Vertical Building Banner",
    costFormatted: "$65 / mo",
    costUSD: 65,
    width: 8,
    height: 18,
    elevation: 8,
    orientation: "portrait",
    mount: "facade",
    anchor: "times",
    getPos: (p) => ({ x: p.x1 + 18.8, z: p.cz + 12, yaw: -Math.PI / 2 }),
  },
  {
    billboardNumber: 19,
    id: "bb_ts_east_upper",
    name: "Times Square East Upper Screen",
    type: "Building-Mounted Mega-Screen",
    costFormatted: "$75 / mo",
    costUSD: 75,
    width: 20,
    height: 10,
    elevation: 28,
    orientation: "landscape",
    mount: "facade",
    anchor: "times",
    getPos: (p) => ({ x: p.x1 + 18.8, z: p.cz + 42, yaw: -Math.PI / 2 }),
  },

  // West frontage - the other corner wrap
  {
    billboardNumber: 20,
    id: "bb_ts_west_corner",
    name: "Times Square West Corner Wrap",
    type: "Folded Corner Screen",
    costFormatted: "$85 / mo",
    costUSD: 85,
    width: 24,
    height: 12,
    elevation: 12,
    orientation: "landscape",
    mount: "folded",
    anchor: "times",
    getPos: (p) => ({ x: p.x0 - 18.8, z: p.cz + 34, yaw: Math.PI / 2 }),
  },
  {
    billboardNumber: 21,
    id: "bb_ts_west_portrait",
    name: "Times Square West Vertical Banner",
    type: "Vertical Building Banner",
    costFormatted: "$65 / mo",
    costUSD: 65,
    width: 8,
    height: 18,
    elevation: 8,
    orientation: "portrait",
    mount: "facade",
    anchor: "times",
    getPos: (p) => ({ x: p.x0 - 18.8, z: p.cz - 12, yaw: Math.PI / 2 }),
  },
  {
    billboardNumber: 22,
    id: "bb_ts_west_upper",
    name: "Times Square West Upper Screen",
    type: "Building-Mounted Mega-Screen",
    costFormatted: "$75 / mo",
    costUSD: 75,
    width: 20,
    height: 10,
    elevation: 28,
    orientation: "landscape",
    mount: "facade",
    anchor: "times",
    getPos: (p) => ({ x: p.x0 - 18.8, z: p.cz - 42, yaw: Math.PI / 2 }),
  },

  // Two eye-level totems standing ON the pedestrian pads
  {
    billboardNumber: 23,
    id: "bb_ts_totem_nw",
    name: "Times Square Plaza Totem (North-West)",
    type: "Pedestrian Video Totem",
    costFormatted: "$35 / mo",
    costUSD: 35,
    width: 6,
    height: 12,
    elevation: 1.6,
    orientation: "portrait",
    mount: "pole",
    anchor: "times",
    getPos: (p) => ({ x: p.cx - 50, z: p.cz - 28, yaw: Math.PI * 0.25 }),
  },
  {
    billboardNumber: 24,
    id: "bb_ts_totem_se",
    name: "Times Square Plaza Totem (South-East)",
    type: "Pedestrian Video Totem",
    costFormatted: "$35 / mo",
    costUSD: 35,
    width: 6,
    height: 12,
    elevation: 1.6,
    orientation: "portrait",
    mount: "pole",
    anchor: "times",
    getPos: (p) => ({ x: p.cx + 50, z: p.cz + 28, yaw: -Math.PI * 0.75 }),
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
 * Creates a flat, clean, raised 3D Brand Logo Plaque mounted directly onto the building's roof surface.
 * Occupies 70–85% of the roof area with subtle physical thickness, shadow, edge bezel,
 * and the company's respective website favicon/logo matching its facade branding.
 */
export function makeBrandRoofMesh({ product = {}, rank = 1, color = "#F05A38", w = 10, d = 10, height = 30 }) {
  const g = new THREE.Group();
  g.name = `brand-roof-${product.id || rank}`;

  const brandName = (product.websiteName || "Brand").trim();
  const colorHex = new THREE.Color(color).getHex();
  let host = "";
  try {
    host = new URL(product.websiteUrl?.startsWith("http") ? product.websiteUrl : `https://${product.websiteUrl || ""}`).hostname.replace(/^www\./, "");
  } catch (e) {
    host = (product.websiteUrl || "").replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || "";
  }

  const roofW = w * 0.96;
  const roofD = d * 0.96;

  // Sized to occupy 75–85% of usable roof area with a small visible roof border around it
  const plaqueW = roofW * 0.82;
  const plaqueD = roofD * 0.82;
  const plaqueH = 0.16;

  // 1. Draw 512x512 Canvas for the top plaque face
  const CS = 512;
  const cv = document.createElement("canvas");
  cv.width = CS * SIGN_SS;
  cv.height = CS * SIGN_SS;
  const ctx = cv.getContext("2d");
  ctx.scale(SIGN_SS, SIGN_SS);
  ctx.textRendering = "geometricPrecision";

  let loadedImg = null;

  const paint = (img = loadedImg) => {
    ctx.clearRect(0, 0, CS, CS);

    // 1. Crisp clean white plaque face
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, 4, 4, CS - 8, CS - 8, 36);
    ctx.fill();

    // 2. Clean dark outer edge bezel
    ctx.lineWidth = 10;
    ctx.strokeStyle = "#1e293b";
    roundRect(ctx, 5, 5, CS - 10, CS - 10, 34);
    ctx.stroke();

    // 3. Subtle inner accent border in district/brand color
    ctx.lineWidth = 4;
    ctx.strokeStyle = color;
    roundRect(ctx, 16, 16, CS - 32, CS - 32, 26);
    ctx.stroke();

    // 4. Center Favicon / Logo (Upper 64% of plaque)
    const logoPadX = 54;
    const logoTopY = 36;
    const logoAvailW = CS - logoPadX * 2;
    const logoAvailH = CS * 0.58;

    if (img && img.width > 0) {
      const imgAspect = img.width / img.height;
      let drawW = logoAvailW;
      let drawH = drawW / imgAspect;
      if (drawH > logoAvailH) {
        drawH = logoAvailH;
        drawW = drawH * imgAspect;
      }
      const drawX = (CS - drawW) / 2;
      const drawY = logoTopY + (logoAvailH - drawH) / 2;
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    } else {
      // Unique vector logo glyph tailored to this exact brand
      const initials = brandName
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase() || brandName.slice(0, 2).toUpperCase() || "?";

      // Colored icon badge
      const iconSize = Math.min(logoAvailW * 0.55, logoAvailH * 0.85);
      const iconX = (CS - iconSize) / 2;
      const iconY = logoTopY + (logoAvailH - iconSize) / 2;

      ctx.fillStyle = color;
      roundRect(ctx, iconX, iconY, iconSize, iconSize, 22);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = `900 ${Math.round(iconSize * 0.52)}px 'Inter', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(initials, iconX + iconSize / 2, iconY + iconSize / 2 + 2);
    }

    // 5. Brand Name in bold dark typography at bottom of plaque (matching reference image)
    const textY = CS * 0.82;
    ctx.fillStyle = "#0f172a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    let fontSize = 34;
    ctx.font = `900 ${fontSize}px 'Inter', sans-serif`;
    let displayName = brandName.toUpperCase();
    const maxTextW = CS - 64;
    while (ctx.measureText(displayName).width > maxTextW && fontSize > 16) {
      fontSize -= 2;
      ctx.font = `900 ${fontSize}px 'Inter', sans-serif`;
    }
    if (ctx.measureText(displayName).width > maxTextW) {
      while (ctx.measureText(displayName + "…").width > maxTextW && displayName.length > 3) {
        displayName = displayName.slice(0, -1);
      }
      displayName += "…";
    }
    ctx.fillText(displayName, CS / 2, textY);
  };

  paint();
  const tex = crispTexture(cv);

  // Multi-source guaranteed favicon loader matching facade branding (favicons only, never og:image)
  if (product.websiteUrl || product.logoUrl || product.faviconUrl) {
    const isOg = (u) => typeof u === "string" && /ogimage|og-image|og_image|twitter-image|banner/i.test(u);
    const validLogo = product.logoUrl && !isOg(product.logoUrl) ? product.logoUrl : null;
    const rawSources = [
      product.faviconUrl,
      host && `https://www.google.com/s2/favicons?sz=256&domain=${host}`,
      host && `https://icon.horse/icon/${host}`,
      host && `https://icons.duckduckgo.com/ip3/${host}.ico`,
      host && `https://logo.clearbit.com/${host}`,
      validLogo,
    ].filter(Boolean);

    loadSafeFavicon(rawSources, (img) => {
      loadedImg = img;
      paint(img);
      tex.needsUpdate = true;
    });
  }

  // 2. Physical 3D Raised Plaque Mesh
  const topMat = new THREE.MeshStandardMaterial({
    map: tex,
    emissiveMap: tex,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.28,
    roughness: 0.3,
    metalness: 0.05,
  });
  const sideMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.4,
    metalness: 0.7,
  });

  // Raised 3D Plaque Box (Top face has the brand graphic, sides have dark steel bezel)
  const plaqueMesh = new THREE.Mesh(
    new THREE.BoxGeometry(plaqueW, plaqueH, plaqueD),
    [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]
  );
  plaqueMesh.position.y = plaqueH / 2 + 0.04;
  plaqueMesh.castShadow = true;
  plaqueMesh.receiveShadow = true;
  g.add(plaqueMesh);

  // Subtle shadow plate underneath the plaque
  const shadowMesh = new THREE.Mesh(
    new THREE.BoxGeometry(plaqueW * 1.03, 0.04, plaqueD * 1.03),
    new THREE.MeshBasicMaterial({ color: 0x05080e, transparent: true, opacity: 0.55 })
  );
  shadowMesh.position.y = 0.02;
  g.add(shadowMesh);

  // Glowing Neon Parapet Trim outlining the entire roof perimeter
  const rimGeo = new THREE.BoxGeometry(roofW + 0.2, 0.35, roofD + 0.2);
  const rimMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: new THREE.Color(colorHex),
    emissiveIntensity: 1.8,
    roughness: 0.2,
  });
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  rimMesh.position.y = -0.12;
  rimMesh.userData.bloom = true;
  g.add(rimMesh);

  // Set position directly at building rooftop height
  g.position.set(0, height, 0);

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
function attachLiveScreen({ canvas, ctx, texture, width, height, brand, websiteUrl, color, claimed, costText }) {
  // Logical drawing space - matches whatever aspect the panel was authored at
  // (landscape 512×288 or portrait 288×512).
  const W = width || 512;
  const H = height || 288;

  // snapshot the static art we drew, so each animated frame starts clean
  const base = document.createElement("canvas");
  base.width = canvas.width;
  base.height = canvas.height;
  base.getContext("2d").drawImage(canvas, 0, 0);

  // ── pull the brand's own image, best source first ────────────────────
  let art = null;
  if (claimed && websiteUrl) {
    let host = "";
    try { host = new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`).hostname.replace(/^www\./, ""); } catch (e) { /* ignore */ }
    const candidates = [
      host && `https://www.google.com/s2/favicons?sz=256&domain=${host}`,
      host && `https://icon.horse/icon/${host}`,
      host && `https://icons.duckduckgo.com/ip3/${host}.ico`,
      host && `https://logo.clearbit.com/${host}`,
    ].filter(Boolean);

    loadSafeFavicon(candidates, (img) => {
      art = img;
    });
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
      const portrait = H > W;
      const plate = portrait ? 96 : 76;
      const px = portrait ? (W - plate) / 2 : 24;
      const py = portrait ? 92 : 68;
      g.save();
      g.beginPath();
      g.roundRect ? g.roundRect(px, py, plate, plate, 12) : g.rect(px, py, plate, plate);
      g.clip();
      g.drawImage(art, px, py, plate, plate);
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
    const cxp = H > W ? (W - cw) / 2 : W - cw - 20;
    const cyp = H - 74 - (H > W ? 34 : 0);
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
 * A city billboard: the canvas artwork plus the physical structure it hangs on.
 *
 * Two things drive the shape:
 *   • `orientation` - "landscape" (wide) or "portrait" (tall). The artwork is
 *     laid out proportionally, so a portrait board is a real vertical poster,
 *     not a squashed wide one.
 *   • `mount` - how it attaches to the world:
 *       "facade"  flat on a building wall, no supporting structure at all
 *       "folded"  two panels meeting in a shallow V, wrapping a corner
 *       "gantry"  two legs straddling a plaza
 *       "pole"    the classic roadside single pylon (kept rare on purpose)
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

  const sW = billboardDef.width || 12;
  const sH = billboardDef.height || 6.75;
  const portrait = (billboardDef.orientation || (sH > sW ? "portrait" : "landscape")) === "portrait";

  // ── 1. Artwork ───────────────────────────────────────────────────────
  // Logical drawing space matches the panel's own aspect so nothing stretches.
  const W = portrait ? 320 : 512;
  const H = portrait ? 512 : 300;

  const cv = document.createElement("canvas");
  cv.width = W * SIGN_SS;
  cv.height = H * SIGN_SS;
  const ctx = cv.getContext("2d");
  ctx.scale(SIGN_SS, SIGN_SS);
  ctx.textRendering = "geometricPrecision";

  // Deep vibrant LED body
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  if (isClaimed) {
    bgGrad.addColorStop(0, "#08101e");
    bgGrad.addColorStop(0.5, "#0f172a");
    bgGrad.addColorStop(1, "#1e1b4b");
  } else {
    bgGrad.addColorStop(0, "#041021");
    bgGrad.addColorStop(0.4, "#08213d");
    bgGrad.addColorStop(1, "#03324d");
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Digital LED grid pattern
  ctx.strokeStyle = isClaimed ? "rgba(255, 255, 255, 0.08)" : "rgba(56, 189, 248, 0.18)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  const PAD = 14;
  const headerH = 34;

  // Header banner: status pill + slot number
  ctx.fillStyle = isClaimed ? "rgba(30, 41, 59, 0.95)" : "rgba(12, 45, 72, 0.95)";
  roundRect(ctx, PAD, 12, W - PAD * 2, headerH, 8);
  ctx.fill();
  ctx.strokeStyle = isClaimed ? "#facc15" : "#38bdf8";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.textBaseline = "middle";

  if (portrait) {
    ctx.fillStyle = isClaimed ? "#fde047" : "#38bdf8";
    ctx.font = "900 12px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(isClaimed ? `● SPONSORED · #${bbNum}` : `★ AD SPACE #${bbNum}`, W / 2, 29);
  } else {
    ctx.fillStyle = isClaimed ? "#fde047" : "#38bdf8";
    ctx.font = "900 13px 'Inter', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(isClaimed ? `● SPONSORED BILLBOARD #${bbNum}` : `★ AVAILABLE AD SPACE #${bbNum}`, PAD + 12, 29);

    ctx.fillStyle = isClaimed ? "#38bdf8" : "#4ade80";
    ctx.font = "900 13px 'Inter', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(costText, W - PAD - 12, 29);
  }

  const ctaH = 48;
  const ctaY = H - ctaH - 24;

  if (isClaimed) {
    const plate = portrait ? 92 : 72;
    const plateX = portrait ? (W - plate) / 2 : 24;
    const plateY = portrait ? 86 : 64;

    ctx.fillStyle = colorHex;
    roundRect(ctx, plateX, plateY, plate, plate, 14);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 ${Math.round(plate * 0.46)}px 'Inter', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(brandName.slice(0, 2).toUpperCase(), plateX + plate / 2, plateY + plate * 0.70);

    const textX = portrait ? W / 2 : 112;
    const nameY = portrait ? plateY + plate + 48 : 98;
    ctx.textAlign = portrait ? "center" : "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 ${portrait ? 26 : 28}px 'Inter', sans-serif`;
    const maxChars = portrait ? 14 : 18;
    ctx.fillText(
      brandName.length > maxChars ? `${brandName.slice(0, maxChars - 1)}…` : brandName,
      textX,
      nameY
    );

    // category chip
    ctx.font = "bold 11px 'Inter', sans-serif";
    const catUpper = category.toUpperCase();
    const measuredCatW = ctx.measureText(catUpper).width;
    const maxAvailableChipW = portrait ? W - 60 : Math.min(220, W - 140);
    const chipW = Math.min(maxAvailableChipW, measuredCatW + 20);
    const chipX = portrait ? (W - chipW) / 2 : 112;
    const chipY = portrait ? nameY + 14 : 108;
    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    roundRect(ctx, chipX, chipY, chipW, 22, 5);
    ctx.fill();
    ctx.fillStyle = "#e2e8f0";
    ctx.textAlign = "center";
    ctx.fillText(catUpper, chipX + chipW / 2, chipY + 15);

    // tagline
    ctx.fillStyle = "#94a3b8";
    ctx.font = `${portrait ? 14 : 15}px 'Inter', sans-serif`;
    ctx.textAlign = portrait ? "center" : "left";
    const tagMax = portrait ? 30 : 48;
    ctx.fillText(
      tagline.length > tagMax ? `${tagline.slice(0, tagMax - 2)}…` : tagline,
      portrait ? W / 2 : 24,
      chipY + (portrait ? 56 : 64)
    );

    const ctaGrad = ctx.createLinearGradient(24, ctaY, W - 24, ctaY + ctaH);
    ctaGrad.addColorStop(0, "#f05a38");
    ctaGrad.addColorStop(1, "#ea580c");
    ctx.fillStyle = ctaGrad;
    roundRect(ctx, 24, ctaY, W - 48, ctaH, 12);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    if (portrait) {
      ctx.font = "bold 15px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Click to Visit Website ↗", W / 2, ctaY + 30);
    } else {
      ctx.font = "bold 15px 'Inter', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Rank #${rank || 1} Official Sponsor`, 40, ctaY + 30);
      ctx.font = "bold 15px 'Inter', sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("Click to Visit ↗", W - 40, ctaY + 30);
    }
  } else {
    // ── Vacant: High-impact ad invitation ─────────────────────────────
    const boxY = portrait ? 68 : 58;
    const boxH = ctaY - boxY - 14;

    // Glowing container box
    ctx.fillStyle = "rgba(14, 165, 233, 0.22)";
    roundRect(ctx, 20, boxY, W - 40, boxH, 12);
    ctx.fill();
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    if (portrait) {
      ctx.fillStyle = "#38bdf8";
      ctx.font = "900 28px 'Inter', sans-serif";
      ctx.fillText("PLACE", W / 2, boxY + boxH * 0.22);
      ctx.fillText("YOUR AD", W / 2, boxY + boxH * 0.38);
      ctx.fillText("HERE", W / 2, boxY + boxH * 0.54);

      // Price pill
      ctx.fillStyle = "#facc15";
      ctx.font = "900 20px 'Inter', sans-serif";
      ctx.fillText(costText, W / 2, boxY + boxH * 0.74);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "600 12px 'Inter', sans-serif";
      ctx.fillText("1-Month Exclusive Sponsorship", W / 2, boxY + boxH * 0.88);
    } else {
      ctx.fillStyle = "#38bdf8";
      ctx.font = "900 28px 'Inter', sans-serif";
      ctx.fillText("⚡ PLACE YOUR AD HERE ⚡", W / 2, boxY + boxH * 0.32);

      // Price badge
      ctx.fillStyle = "#facc15";
      ctx.font = "900 22px 'Inter', sans-serif";
      ctx.fillText(`Fixed Rate: ${costText}`, W / 2, boxY + boxH * 0.58);

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "600 13px 'Inter', sans-serif";
      ctx.fillText("Reach founders & players globally · 1-Month Placement Plan", W / 2, boxY + boxH * 0.80);
    }

    // CTA Button
    const ctaGrad = ctx.createLinearGradient(20, ctaY, W - 20, ctaY + ctaH);
    ctaGrad.addColorStop(0, "#0284c7");
    ctaGrad.addColorStop(1, "#0369a1");
    ctx.fillStyle = ctaGrad;
    roundRect(ctx, 20, ctaY, W - 40, ctaH, 12);
    ctx.fill();
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 16px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(portrait ? "⚡ CLICK TO BOOK [E] ↗" : "⚡ CLICK THIS SCREEN TO BUY [E] ↗", W / 2, ctaY + 30);
  }

  const tex = crispTexture(cv);

  // ── 2. The physical panel ────────────────────────────────────────────
  const screenMat = new THREE.MeshStandardMaterial({
    map: tex,
    emissiveMap: tex,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 1.0,
    roughness: 0.18,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.8 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.9 });

  const mount = billboardDef.mount || (billboardDef.isGantry ? "gantry" : "pole");
  const poleH = billboardDef.elevation ?? 8;

  /** One screen slab + its thin glowing border. Returns the group. */
  const makePanel = (pw, ph) => {
    const panel = new THREE.Group();
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(pw, ph, 0.4),
      [frameMat, frameMat, frameMat, frameMat, screenMat, screenMat]
    );
    box.castShadow = true;
    panel.add(box);

    // hairline accent border - four thin bars, so bloom reads as an edge glow
    const edgeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(colorHex) });
    const T = 0.28;
    [
      [pw + T * 2, T, 0, ph / 2 + T / 2],
      [pw + T * 2, T, 0, -ph / 2 - T / 2],
      [T, ph, -pw / 2 - T / 2, 0],
      [T, ph, pw / 2 + T / 2, 0],
    ].forEach(([bw, bh, bx, by]) => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.5), edgeMat);
      bar.position.set(bx, by, -0.02);
      bar.userData.bloom = true;
      panel.add(bar);
    });
    return panel;
  };

  const panelY = poleH + sH / 2;

  if (mount === "folded") {
    // Corner wrap: two half-width panels meeting in a shallow V.
    const half = sW / 2;
    [-1, 1].forEach((side) => {
      const panel = makePanel(half, sH);
      panel.position.set(side * half * 0.48, panelY, side * half * 0.09);
      panel.rotation.y = side * 0.22;
      g.add(panel);
    });
  } else {
    const panel = makePanel(sW, sH);
    panel.position.y = panelY;
    g.add(panel);
  }

  // Bezel so the screen sits proud of whatever it is bolted to.
  const bezel = new THREE.Mesh(
    new THREE.BoxGeometry(sW * 1.04, sH * 1.06, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 0.6, metalness: 0.5 })
  );
  bezel.position.set(0, panelY, -0.4);
  g.add(bezel);

  // ── 3. Supporting structure ──────────────────────────────────────────
  if (mount === "facade" || mount === "folded") {
    // Bolted straight to a wall: just the mounting brackets, no pylons. This
    // is the default in Times Square, where signage belongs to the buildings.
    [-1, 1].forEach((side) => {
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 1.6), steelMat);
      bracket.position.set(side * sW * 0.4, panelY, -1.1);
      g.add(bracket);
    });
  } else if (mount === "gantry") {
    [-1, 1].forEach((side) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.8, poleH + sH, 0.8), steelMat);
      leg.position.set(side * (sW * 0.52), (poleH + sH) / 2, 0);
      leg.castShadow = true;
      g.add(leg);
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

  // Housing spotlights - small, and only on structures that really have them.
  if (mount !== "facade" && mount !== "folded") {
    for (let i = -1; i <= 1; i += 2) {
      const lampArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 8), steelMat);
      lampArm.rotation.x = Math.PI / 4;
      lampArm.position.set(i * (sW * 0.35), poleH + sH + 0.4, 0.6);
      g.add(lampArm);

      const lampHead = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xfff0cf })
      );
      lampHead.position.set(i * (sW * 0.35), poleH + sH + 0.8, 1.1);
      lampHead.userData.bloom = true;
      g.add(lampHead);
    }
  }

  const anchorRect = billboardDef.anchor === "times" ? timesSquareRect() : plazaRect();
  const coords = billboardDef.getPos(anchorRect);
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
      width: W,
      height: H,
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


// ────────────────────────────────────────────────────────────────────────
// FACADE BILLBOARD - a giant ad mounted FLAT ON the building's wall
// (Times-Square style), proving who owns the tower.
// ────────────────────────────────────────────────────────────────────────

/**
 * @param w,h        panel size in world units
 * @param product    { websiteName, websiteUrl, logoUrl, faviconUrl, categoryName }
 * @param rank       leaderboard position
 */
export function makeFacadeBillboard({ w = 12, h = 6, product = {}, rank = 1, amountText = "", color = "#7c3aed" }) {
  const g = new THREE.Group();
  const CW = Math.round(512 * SIGN_SS);
  const CH = Math.round((h / w) * 512 * SIGN_SS);
  const cv = document.createElement("canvas");
  cv.width = CW;
  cv.height = Math.max(CW * 0.48, CH);
  const actualH = cv.height;
  const ctx = cv.getContext("2d");
  ctx.scale(SIGN_SS, SIGN_SS);
  ctx.textRendering = "geometricPrecision";

  const DW = CW / SIGN_SS; // 512
  const DH = actualH / SIGN_SS; // ~288 to 400

  const brand = (product.websiteName || "Featured Brand").trim();
  const category = product.categoryName || product.category?.name || "Corporate Enterprise";
  const subtitle = product.tagline || `${category} Platform`;
  const colorHex = color || "#7c3aed";

  let loadedImg = null;

  const paint = (img = loadedImg) => {
    ctx.clearRect(0, 0, DW, DH);

    // 1. Sleek obsidian dark background
    const bg = ctx.createLinearGradient(0, 0, DW, DH);
    bg.addColorStop(0, "#0b0f19");
    bg.addColorStop(0.5, "#101726");
    bg.addColorStop(1, "#070a12");
    ctx.fillStyle = bg;
    roundRect(ctx, 2, 2, DW - 4, DH - 4, 18);
    ctx.fill();

    // 2. Faint LED grid texture
    ctx.strokeStyle = "rgba(255,255,255,0.025)";
    ctx.lineWidth = 1;
    for (let x = 0; x < DW; x += 12) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, DH); ctx.stroke(); }
    for (let y = 0; y < DH; y += 12) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(DW, y); ctx.stroke(); }

    // 3. Top Header Bar (Purple/Accent banner matching mockup)
    const headerH = Math.max(38, Math.min(48, Math.round(DH * 0.14)));
    const headerGrad = ctx.createLinearGradient(0, 0, DW, 0);
    headerGrad.addColorStop(0, colorHex);
    headerGrad.addColorStop(1, "#4f46e5");
    ctx.fillStyle = headerGrad;

    // Header shape with rounded top corners
    ctx.beginPath();
    ctx.moveTo(18, 4);
    ctx.lineTo(DW - 18, 4);
    ctx.quadraticCurveTo(DW - 4, 4, DW - 4, 18);
    ctx.lineTo(DW - 4, headerH);
    ctx.lineTo(4, headerH);
    ctx.lineTo(4, 18);
    ctx.quadraticCurveTo(4, 4, 18, 4);
    ctx.closePath();
    ctx.fill();

    // Left Header Text: ((•)) LIVE LAND AUCTION
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 13px 'Inter', sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("((•))  LIVE LAND AUCTION", 18, headerH / 2 + 1);

    // Right Header Pill: LIVE ●
    const pillW = 68;
    const pillH = 24;
    const pillX = DW - pillW - 14;
    const pillY = (headerH - pillH) / 2 + 1;
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    roundRect(ctx, pillX, pillY, pillW, pillH, 12);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px 'Inter', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("LIVE", pillX + 12, pillY + pillH / 2);

    // Green glowing dot
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.arc(pillX + pillW - 14, pillY + pillH / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    // 4. Middle Section: Hero Brand Box
    const pad = 20;
    const midY = headerH + 14;
    const isTall = DH >= DW * 0.65;
    const bottomH = isTall ? Math.min(105, Math.round(DH * 0.30)) : Math.min(80, Math.round(DH * 0.28));
    const bottomY = DH - bottomH - 12;
    const midAvailH = bottomY - midY - 6;

    const plateSize = Math.max(56, Math.min(92, Math.round(midAvailH * 0.82)));
    const plateX = pad;
    const plateY = midY + (midAvailH - plateSize) / 2;

    // White rounded app-icon plate
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, plateX, plateY, plateSize, plateSize, 18);
    ctx.fill();

    // Inner icon / Favicon
    if (img && img.width > 0) {
      ctx.save();
      ctx.beginPath();
      roundRect(ctx, plateX + 4, plateY + 4, plateSize - 8, plateSize - 8, 14);
      ctx.clip();

      const imgAspect = img.width / img.height;
      const targetSize = plateSize - 16;
      let dw = targetSize;
      let dh = dw / imgAspect;
      if (dh > targetSize) {
        dh = targetSize;
        dw = dh * imgAspect;
      }
      const dx = plateX + (plateSize - dw) / 2;
      const dy = plateY + (plateSize - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();
    } else {
      // Monogram fallback
      ctx.fillStyle = colorHex;
      ctx.font = `900 ${Math.round(plateSize * 0.48)}px 'Inter', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText((brand[0] || "?").toUpperCase(), plateX + plateSize / 2, plateY + plateSize / 2 + 1);
    }

    // Brand Name & Subtitle to the right of icon
    const infoX = plateX + plateSize + 16;
    const maxInfoW = DW - infoX - 16;

    ctx.textAlign = "left";
    let brandSize = Math.max(18, Math.min(32, Math.round(plateSize * 0.38)));
    ctx.font = `900 ${brandSize}px 'Inter', sans-serif`;
    let brandText = brand;
    while (ctx.measureText(brandText).width > maxInfoW && brandSize > 14) {
      brandSize -= 1;
      ctx.font = `900 ${brandSize}px 'Inter', sans-serif`;
    }
    if (ctx.measureText(brandText).width > maxInfoW) {
      while (ctx.measureText(brandText + "…").width > maxInfoW && brandText.length > 2) {
        brandText = brandText.slice(0, -1);
      }
      brandText += "…";
    }
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.fillText(brandText, infoX, plateY + plateSize * 0.35);

    // Subtitle in purple / lavender
    ctx.fillStyle = "#a5b4fc";
    ctx.font = `bold ${Math.max(12, Math.min(16, Math.round(plateSize * 0.20)))}px 'Inter', sans-serif`;
    let subText = subtitle;
    if (ctx.measureText(subText).width > maxInfoW) {
      while (ctx.measureText(subText + "…").width > maxInfoW && subText.length > 3) {
        subText = subText.slice(0, -1);
      }
      subText += "…";
    }
    ctx.fillText(subText, infoX, plateY + plateSize * 0.72);

    // 5. Bottom Two-Column Stat Bar (Matching Mockup exactly)
    const colW = (DW - pad * 2 - 16) / 2;

    // Left Column: CATEGORY
    const leftColX = pad;
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 11px 'Inter', sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("CATEGORY", leftColX, bottomY + 2);

    // Category Value with building icon 🏢
    ctx.fillStyle = "#ffffff";
    let catFontSize = Math.max(14, Math.min(20, Math.round(bottomH * 0.24)));
    ctx.font = `900 ${catFontSize}px 'Inter', sans-serif`;
    let catText = `🏢 ${category}`;
    while (ctx.measureText(catText).width > colW && catFontSize > 11) {
      catFontSize -= 1;
      ctx.font = `900 ${catFontSize}px 'Inter', sans-serif`;
    }
    if (ctx.measureText(catText).width > colW) {
      while (ctx.measureText(catText + "…").width > colW && catText.length > 3) {
        catText = catText.slice(0, -1);
      }
      catText += "…";
    }
    ctx.fillText(catText, leftColX, bottomY + 22);

    // Right Column: BID AMOUNT + Highest Bidder
    const rightColX = DW - pad - colW;
    ctx.fillStyle = "#10b981"; // Bright emerald green
    ctx.font = "bold 12px 'Inter', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("BID AMOUNT", rightColX, bottomY + 2);

    // Price
    ctx.fillStyle = "#ffffff";
    const priceText = amountText || "$12,750";
    let priceSize = Math.max(16, Math.min(24, Math.round(bottomH * 0.28)));
    ctx.font = `900 ${priceSize}px 'JetBrains Mono', monospace`;
    ctx.fillText(priceText, rightColX, bottomY + 20);

    // Sub-label: Highest Bidder
    ctx.fillStyle = "#22c55e";
    ctx.font = "bold 11px 'Inter', sans-serif";
    ctx.fillText("Highest Bidder", rightColX, bottomY + 20 + priceSize + 4);

    // 6. Perimeter Glowing Border
    ctx.lineWidth = 4;
    ctx.strokeStyle = colorHex;
    roundRect(ctx, 2, 2, DW - 4, DH - 4, 18);
    ctx.stroke();
  };

  paint();
  const tex = crispTexture(cv);

  // ── the physical panel ────────────────────────────────────────────
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: SIGN_LIGHT.screen,
      roughness: 0.32,
      metalness: 0.05,
    })
  );
  g.add(screen);

  // Bezel frame matching the sleek mockup
  const bezel = new THREE.Mesh(
    new THREE.BoxGeometry(w * 1.04, h * 1.06, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 0.5, metalness: 0.6 })
  );
  bezel.position.z = -0.25;
  g.add(bezel);

  // Glowing neon accent edge
  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(w * 1.08, h * 1.10, 0.18),
    new THREE.MeshStandardMaterial({
      color,
      emissive: new THREE.Color(color),
      emissiveIntensity: SIGN_LIGHT.edge,
      roughness: 0.3,
    })
  );
  edge.position.z = -0.36;
  edge.userData.bloom = true;
  g.add(edge);

  // Safe Multi-source Favicon Loader (favicons only, never og:image)
  if (product.websiteUrl || product.logoUrl || product.faviconUrl) {
    let host = "";
    const rawUrl = product.websiteUrl || "";
    try {
      const fullUrl = rawUrl.startsWith("http") ? rawUrl : "https://" + rawUrl;
      host = new URL(fullUrl).hostname.replace(/^www\./, "");
    } catch (e) {
      host = rawUrl.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || "";
    }
    const isOg = (u) => typeof u === "string" && /ogimage|og-image|og_image|twitter-image|banner/i.test(u);
    const validLogo = product.logoUrl && !isOg(product.logoUrl) ? product.logoUrl : null;
    const sources = [
      product.faviconUrl,
      host && `https://www.google.com/s2/favicons?sz=256&domain=${host}`,
      host && `https://icon.horse/icon/${host}`,
      host && `https://icons.duckduckgo.com/ip3/${host}.ico`,
      host && `https://logo.clearbit.com/${host}`,
      validLogo,
    ].filter(Boolean);

    loadSafeFavicon(sources, (img) => {
      loadedImg = img;
      paint(img);
      tex.needsUpdate = true;
    });
  }

  const tick = (t) => {
    const s0 = SIGN_LIGHT.screen;
    const e0 = SIGN_LIGHT.edge;
    screen.material.emissiveIntensity = s0 + Math.sin(t * 1.3) * s0 * 0.18;
    edge.material.emissiveIntensity = e0 + Math.sin(t * 2.1) * e0 * 0.22;
  };

  return { group: g, tick };
}
