/**
 * towerFactory.js - procedural PBR skyscrapers, no external assets.
 *
 * All facades are CanvasTexture window grids (colour + emissive for the
 * dusk window-glow). Textures are generated once and shared by every tower.
 */
import * as THREE from "three";

const anisoRef = { value: 4 };
export function setAnisotropy(v) {
  anisoRef.value = Math.max(1, v || 1);
}

const themeRef = { dark: false, glow: 0.04 };
export function setTowerTheme(isDark) {
  themeRef.dark = !!isDark;
  themeRef.glow = themeRef.dark ? 0.32 : 0.04;
}

/**
 * How hot the lit-window layer burns on brand towers. Driven by the city clock
 * (see timeOfDay.js) so windows warm up through the evening instead of
 * snapping on with the theme.
 */
export function setTowerWindowGlow(v) {
  themeRef.glow = Math.max(0, v);
}

// ── Shared facade textures ─────────────────────────────────────────────

function makeFacade({
  cols = 10,
  rows = 14,
  wall = "#8a8f99",
  glass = "#3a4a5c",
  mullion = "#2b3038",
  emissive = false,
  litRatio = 0.35,
  seed = 1,
}) {
  const cell = 24;
  const cv = document.createElement("canvas");
  cv.width = cols * cell;
  cv.height = rows * cell;
  const ctx = cv.getContext("2d");

  ctx.fillStyle = emissive ? "#000000" : wall;
  ctx.fillRect(0, 0, cv.width, cv.height);

  let s = seed * 9301 + 49297;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  const pad = cell * 0.16;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cell + pad;
      const y = r * cell + pad;
      const w = cell - pad * 2;
      const h = cell - pad * 2;
      if (emissive) {
        const lit = rnd() < litRatio;
        if (!lit) continue;
        const warm = rnd();
        ctx.fillStyle =
          warm < 0.6 ? "#ffd9a0" : warm < 0.85 ? "#fff4d6" : "#bcd4ff";
        ctx.globalAlpha = 0.55 + rnd() * 0.45;
        ctx.fillRect(x, y, w, h);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = mullion;
        ctx.fillRect(c * cell, r * cell, cell, cell);
        const tint = 0.85 + rnd() * 0.3;
        const g = new THREE.Color(glass).multiplyScalar(tint);
        ctx.fillStyle = `rgb(${(g.r * 255) | 0},${(g.g * 255) | 0},${(g.b * 255) | 0})`;
        ctx.fillRect(x, y, w, h);
      }
    }
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = anisoRef.value;
  if (!emissive) tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return { tex, cols, rows };
}

let PALETTES = null;
function palettes() {
  if (PALETTES) return PALETTES;
  const defs = [
    { wall: "#c8d4e0", glass: "#8fb6cf", mullion: "#5c7183", metalness: 0.35, roughness: 0.28 }, // bright glass
    { wall: "#d8c7a8", glass: "#b7c3cc", mullion: "#8a7a5f", metalness: 0.12, roughness: 0.6 }, // limestone
    { wall: "#aeb6c0", glass: "#7f97ab", mullion: "#4a525c", metalness: 0.3, roughness: 0.35 }, // steel
    { wall: "#e2ded6", glass: "#aab6bd", mullion: "#8b8f93", metalness: 0.08, roughness: 0.72 }, // pale concrete
  ];
  PALETTES = defs.map((p, i) => {
    const cols = 8 + (i % 3) * 3;
    const rows = 16 + (i % 2) * 4;
    return {
      ...p,
      color: makeFacade({ cols, rows, wall: p.wall, glass: p.glass, mullion: p.mullion, seed: i + 3 }),
      emissive: makeFacade({ cols, rows, emissive: true, litRatio: 0.22 + i * 0.05, seed: i + 11 }),
    };
  });
  return PALETTES;
}

function facadeMaterial(palIndex, volW, volH) {
  const p = palettes()[palIndex % palettes().length];
  const color = p.color.tex.clone();
  const emissive = p.emissive.tex.clone();
  const repX = Math.max(1, Math.round(volW / 12));
  const repY = Math.max(1, Math.round(volH / 14));
  color.repeat.set(repX, repY);
  emissive.repeat.set(repX, repY);
  color.needsUpdate = emissive.needsUpdate = true;
  return new THREE.MeshStandardMaterial({
    map: color,
    emissiveMap: emissive,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: themeRef.glow,
    metalness: p.metalness,
    roughness: p.roughness,
    envMapIntensity: 1.15,
  });
}

// roof / structural material shared
const roofMat = new THREE.MeshStandardMaterial({ color: 0x3b3f46, roughness: 0.8, metalness: 0.3 });
const trimMat = new THREE.MeshStandardMaterial({ color: 0x4a5058, roughness: 0.55, metalness: 0.5 });
// the #1 landmark wears brushed gold trim instead of grey steel
const crownTrimMat = new THREE.MeshStandardMaterial({
  color: 0xd9b04a,
  roughness: 0.3,
  metalness: 0.85,
});

// ── Tower builder ──────────────────────────────────────────────────────

/**
 * makeTower({ w, d, h, tier, accentHex, seed })
 *   tier: "crown" | "top3" | "top10" | "standard"
 * Returns a THREE.Group whose origin is the ground centre of the lot.
 * Meshes tagged .userData.bloom = true are picked up by selective bloom.
 */
export function makeTower({ w, d, h, tier = "standard", accentHex = 0xffffff, seed = 1, isBrandTower = false }) {
  const g = new THREE.Group();
  const rnd = mulberry(seed);
  const palIndex = tier === "crown" ? 0 : Math.floor(rnd() * 4);
  const isCrown = tier === "crown";

  // Classic New York Art Deco stepped massing for the #1 Landmark Skyscraper
  // Multiple setback volumes (Podium, Mid-Shaft, Upper Setback, Crown Spire Tier)
  const tiers = isCrown ? (h > 50 ? 4 : 3) : (h > 150 ? 3 : h > 80 ? 2 : 1);
  let y = 0;
  let curW = w;
  let curD = d;

  const crownTierShares = tiers === 4 ? [0.24, 0.42, 0.22, 0.12] : [0.30, 0.45, 0.25];
  const crownTierWidths = tiers === 4 ? [1.08, 0.88, 0.68, 0.50] : [1.06, 0.84, 0.62];

  for (let t = 0; t < tiers; t++) {
    let vh;
    if (isCrown) {
      vh = Math.max(3.5, h * (crownTierShares[t] || 0.33));
      curW = w * (crownTierWidths[t] || 0.8);
      curD = d * (crownTierWidths[t] || 0.8);
    } else {
      const share = t === 0 ? 0.5 : (0.5 / (tiers - 1 || 1)) * (1 - t * 0.12);
      vh = Math.max(3, h * (tiers === 1 ? 1 : share));
    }

    const geo = new THREE.BoxGeometry(curW, vh, curD);
    const mat = facadeMaterial(palIndex, Math.max(curW, curD), vh);
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y + vh / 2;
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);

    // Subtle accent outline
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: accentHex, transparent: true, opacity: 0.9 })
    );
    edges.position.y = y + vh / 2;
    edges.userData.bloom = true;
    g.add(edges);

    // Parapet ledge / Art Deco stepped cornice
    const ledgeH = isCrown ? 1.0 : 0.8;
    const ledge = new THREE.Mesh(
      new THREE.BoxGeometry(curW + 1.2, ledgeH, curD + 1.2),
      tier === "crown" ? crownTrimMat : trimMat
    );
    ledge.position.y = y + vh;
    ledge.castShadow = true;
    g.add(ledge);

    // Art Deco vertical corner pilasters / fluting on New York tower
    if (isCrown) {
      const pilasterMat = new THREE.MeshStandardMaterial({
        color: 0x333b47,
        roughness: 0.45,
        metalness: 0.6,
      });
      const pw = 0.5;
      const cornerOffsets = [
        { x: curW / 2, z: curD / 2 },
        { x: -curW / 2, z: curD / 2 },
        { x: curW / 2, z: -curD / 2 },
        { x: -curW / 2, z: -curD / 2 },
      ];
      cornerOffsets.forEach((pos) => {
        const col = new THREE.Mesh(new THREE.BoxGeometry(pw, vh, pw), pilasterMat);
        col.position.set(pos.x, y + vh / 2, pos.z);
        g.add(col);
      });
    }

    y += vh;
    if (!isCrown) {
      curW *= 0.8;
      curD *= 0.8;
    }
  }

  // Save top tier dimensions
  g.userData.topW = curW;
  g.userData.topD = curD;

  // rooftop clutter & masts (only on generic filler buildings, brand buildings get clean logo roofs)
  if (!isBrandTower) {
    if (h > 14) {
      const roofBox = new THREE.Mesh(
        new THREE.BoxGeometry(curW * 0.5, 3 + rnd() * 5, curD * 0.5),
        roofMat
      );
      roofBox.position.y = y + 2;
      roofBox.castShadow = true;
      g.add(roofBox);
    }

    const wantMast = (tier === "crown" || tier === "top3") ? h > 26 : h > 60 && rnd() > 0.6;
    if (wantMast) {
      const mastH = THREE.MathUtils.clamp(h * 0.35, 8, tier === "crown" ? 44 : 28);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.4, mastH, 10), trimMat);
      mast.position.y = y + mastH / 2;
      g.add(mast);
    }
  }

  // ── #1 CROWN TREATMENT - grand realistic architectural golden crown ────────
  if (tier === "crown") {
    const crownGroup = new THREE.Group();
    crownGroup.name = "rank1-golden-crown";

    // Realistic PBR metallic gold material with natural reflections and zero emissive glare
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37, // warm classic metallic gold
      metalness: 0.90,
      roughness: 0.24,
    });

    // Sized much bigger, spanning across and over the roof profile of the top tier
    const crownRadius = Math.max(curW * 0.65, 4.8);
    const crownH = Math.min(curW * 0.72, 6.4);

    // 1. Lower Grand Circlet Band (stepped Art Deco base)
    const baseBand = new THREE.Mesh(
      new THREE.CylinderGeometry(crownRadius * 0.98, crownRadius * 0.92, crownH * 0.24, 32, 1, true),
      goldMat
    );
    baseBand.position.y = crownH * 0.12;
    baseBand.castShadow = true;
    crownGroup.add(baseBand);

    // 2. Base & Upper Gold Torus Rings
    const lowerRim = new THREE.Mesh(
      new THREE.TorusGeometry(crownRadius * 0.94, 0.18, 8, 36),
      goldMat
    );
    lowerRim.rotation.x = Math.PI / 2;
    lowerRim.position.y = 0.05;
    crownGroup.add(lowerRim);

    const midRim = new THREE.Mesh(
      new THREE.TorusGeometry(crownRadius * 0.98, 0.20, 8, 36),
      goldMat
    );
    midRim.rotation.x = Math.PI / 2;
    midRim.position.y = crownH * 0.26;
    crownGroup.add(midRim);

    // 3. 8 Majestic Sculpted Art Deco Crown Peaks spanning over the roof
    const numPeaks = 8;
    for (let i = 0; i < numPeaks; i++) {
      const angle = (i / numPeaks) * Math.PI * 2;
      const px = Math.cos(angle) * (crownRadius * 0.96);
      const pz = Math.sin(angle) * (crownRadius * 0.96);

      // Main triangular crown spire
      const peak = new THREE.Mesh(
        new THREE.ConeGeometry(0.52, crownH * 0.74, 4),
        goldMat
      );
      peak.position.set(px, crownH * 0.26 + (crownH * 0.74) / 2, pz);
      peak.rotation.y = angle + Math.PI / 4;
      peak.castShadow = true;
      crownGroup.add(peak);

      // Royal Gold Finial Sphere
      const finial = new THREE.Mesh(
        new THREE.SphereGeometry(0.36, 12, 12),
        goldMat
      );
      finial.position.set(px, crownH + 0.18, pz);
      crownGroup.add(finial);

      // Inner connecting gold arch strut
      const strut = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, crownRadius * 0.85, 8),
        goldMat
      );
      strut.position.set(px * 0.5, crownH * 0.65, pz * 0.5);
      strut.rotation.z = Math.PI / 3.2;
      strut.rotation.y = angle;
      crownGroup.add(strut);
    }

    // 4. Central Art Deco Crown Finial / Crest
    const centerApex = new THREE.Mesh(
      new THREE.ConeGeometry(0.45, crownH * 0.45, 6),
      goldMat
    );
    centerApex.position.set(0, crownH * 0.75, 0);
    crownGroup.add(centerApex);

    const centerBall = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 14, 14),
      goldMat
    );
    centerBall.position.set(0, crownH + 0.25, 0);
    crownGroup.add(centerBall);

    // Position crown with a minimum 0.45 gap above the roof line
    const roofGap = 0.45;
    crownGroup.position.set(0, y + roofGap, 0);
    g.add(crownGroup);
  }

  // plinth so the tower reads as seated on its lot
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(w + 2.5, 3, d + 2.5),
    new THREE.MeshStandardMaterial({ color: 0x6b6f77, roughness: 0.85 })
  );
  plinth.position.y = 1.5;
  plinth.receiveShadow = true;
  g.add(plinth);

  g.userData.totalHeight = y;
  return g;
}

function mulberry(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function disposeGroup(group) {
  group.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (m.map) m.map.dispose();
        if (m.emissiveMap) m.emissiveMap.dispose();
        m.dispose();
      });
    }
  });
}
