/**
 * towerFactory.js — procedural PBR skyscrapers, no external assets.
 *
 * All facades are CanvasTexture window grids (colour + emissive for the
 * dusk window-glow). Textures are generated once and shared by every tower.
 */
import * as THREE from "three";

const anisoRef = { value: 4 };
export function setAnisotropy(v) {
  anisoRef.value = Math.max(1, v || 1);
}

const themeRef = { dark: false };
export function setTowerTheme(isDark) {
  themeRef.dark = !!isDark;
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
    emissiveIntensity: themeRef.dark ? 0.32 : 0.04,
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
export function makeTower({ w, d, h, tier = "standard", accentHex = 0xffffff, seed = 1 }) {
  const g = new THREE.Group();
  const rnd = mulberry(seed);
  const palIndex = tier === "crown" ? 0 : Math.floor(rnd() * 4);

  // massing: stacked setback volumes — only tall buildings get setbacks.
  const tiers = h > 150 ? 3 : h > 80 ? 2 : 1;
  let y = 0;
  let curW = w;
  let curD = d;
  const shrink = 0.8;

  for (let t = 0; t < tiers; t++) {
    const share = t === 0 ? 0.5 : (0.5 / (tiers - 1 || 1)) * (1 - t * 0.12);
    const vh = Math.max(3, h * (tiers === 1 ? 1 : share));
    const geo = new THREE.BoxGeometry(curW, vh, curD);
    const mat = facadeMaterial(palIndex, Math.max(curW, curD), vh);
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y + vh / 2;
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);

    // subtle accent-coloured outline — this is the only part that blooms,
    // so brand towers read as "glowing at the edges" not lit up like a lamp.
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: accentHex, transparent: true, opacity: 0.9 })
    );
    edges.position.y = y + vh / 2;
    edges.userData.bloom = true;
    g.add(edges);

    // parapet ledge — a slim shadow line between volumes, not a black slab
    const ledge = new THREE.Mesh(
      new THREE.BoxGeometry(curW + 1.1, 0.8, curD + 1.1),
      tier === "crown" ? crownTrimMat : trimMat
    );
    ledge.position.y = y + vh;
    ledge.castShadow = true;
    g.add(ledge);

    y += vh;
    curW *= shrink;
    curD *= shrink;
  }

  // rooftop clutter (only on buildings tall enough to have a real roof)
  if (h > 14) {
    const roofBox = new THREE.Mesh(
      new THREE.BoxGeometry(curW * 0.5, 3 + rnd() * 5, curD * 0.5),
      roofMat
    );
    roofBox.position.y = y + 2;
    roofBox.castShadow = true;
    g.add(roofBox);
  }

  // antenna / spire + beacon — scaled to the building so a short tower
  // never gets a giant mast.
  const wantMast = (tier === "crown" || tier === "top3") ? h > 26 : h > 60 && rnd() > 0.6;
  if (wantMast) {
    const mastH = THREE.MathUtils.clamp(h * 0.35, 8, tier === "crown" ? 44 : 28);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.4, mastH, 10), trimMat);
    mast.position.y = y + mastH / 2;
    g.add(mast);
    if (tier === "crown" || tier === "top3") {
      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(tier === "crown" ? 3 : 2, 14, 14),
        new THREE.MeshStandardMaterial({ color: accentHex, emissive: accentHex, emissiveIntensity: 2.4 })
      );
      beacon.position.y = y + mastH;
      beacon.userData.bloom = true;
      g.add(beacon);
    }
  }

  // ── #1 CROWN TREATMENT — the city's centre of attraction ────────────
  if (tier === "crown") {
    const gold = 0xffd54a;
    const spin = [];

    // slim gold crown cap sitting on the roof line
    const capW = curW * 1.28;
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(capW, 1.1, curD * 1.28),
      new THREE.MeshStandardMaterial({
        color: gold,
        emissive: gold,
        emissiveIntensity: 0.75,
        metalness: 0.9,
        roughness: 0.18,
      })
    );
    band.position.y = y + 0.55;
    band.userData.bloom = true;
    g.add(band);

    // twin halo rings that slowly counter-rotate above the roof
    [
      { r: Math.max(curW, 8) * 0.85, y: y + 9, tilt: 0, dir: 1 },
      { r: Math.max(curW, 8) * 1.15, y: y + 15, tilt: 0.22, dir: -1 },
    ].forEach((cfg) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(cfg.r, 0.5, 8, 48),
        new THREE.MeshStandardMaterial({ color: gold, emissive: gold, emissiveIntensity: 2.6 })
      );
      ring.rotation.x = Math.PI / 2 + cfg.tilt;
      ring.position.y = cfg.y;
      ring.userData.bloom = true;
      ring.userData.spinDir = cfg.dir;
      spin.push(ring);
      g.add(ring);
    });

    // vertical beacon shaft rising out of the roof
    const beamH = Math.max(120, h * 0.7);
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 5.5, beamH, 20, 1, true),
      new THREE.MeshBasicMaterial({
        color: gold,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      })
    );
    beam.position.y = y + beamH / 2;
    beam.userData.bloom = true;
    g.add(beam);

    // ground halo so the plot itself reads as "the #1 spot"
    const pad = new THREE.Mesh(
      new THREE.RingGeometry(w * 0.82, w * 0.98, 48),
      new THREE.MeshBasicMaterial({
        color: gold,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.35;
    pad.userData.bloom = true;
    spin.push(Object.assign(pad, { userData: { ...pad.userData, spinDir: 0.35, flat: true } }));
    g.add(pad);

    g.userData.spinners = spin;
    g.userData.beam = beam;
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
