import * as THREE from "three";

/**
 * Unique NPC Character Generator.
 *
 * Builds highly detailed, expressive, and distinct humanoid characters
 * with rich clothing archetypes, hairstyles, hats, glasses, backpacks,
 * and accessories - ensuring every NPC is unique from each other and
 * distinct from the player character.
 */

export const NPC_ARCHETYPES = [
  "streetwear_hoodie",
  "business_suit",
  "summer_active",
  "cozy_sweater",
  "urban_jacket",
  "chic_beret",
];

const SKIN_PALETTES = [
  0xf8d7bd, 0xf3c8a4, 0xdfab82, 0xc68c5d, 0xa7683e,
  0x7d4928, 0x5a3118, 0xffe0c8, 0xe8b894, 0x8d532b,
];

const HAIR_PALETTES = [
  0x1b1612, 0x362316, 0x58351c, 0x824e2b, 0xd4a359,
  0xb25329, 0x3d3a39, 0xe2d6c3, 0x8a2332, 0x224263,
  0x6e3557, 0x4a3b32,
];

const TOP_PALETTES = [
  0xde3838, 0x2563eb, 0x059669, 0xd97706, 0x7c3aed,
  0x0891b2, 0xdb2777, 0x475569, 0x16a34a, 0xe11d48,
  0xf59e0b, 0x4f46e5, 0x0d9488, 0x9333ea, 0x64748b,
  0x1e293b, 0xfaebd7, 0xc084fc, 0x38bdf8, 0x4ade80,
];

const BOTTOM_PALETTES = [
  0x1e293b, 0x334155, 0x1e3a5f, 0x27272a, 0x3f3f46,
  0x4b5563, 0x2d3748, 0x18181b, 0x52525b, 0x312e81,
  0x14532d, 0x713f12, 0x831843, 0x374151,
];

const SHOE_PALETTES = [
  0x18181b, 0xf8fafc, 0x78350f, 0x451a03, 0x1e293b,
  0x991b1b, 0x1e40af, 0x065f46, 0x581c87,
];

const ACCENT_PALETTES = [
  0xfacc15, 0xf43f5e, 0x06b6d4, 0x10b981, 0x8b5cf6,
  0xf97316, 0xffffff, 0x0f172a, 0xe2e8f0,
];

function pseudoRandom(seed) {
  let s = Math.sin(seed * 9999.123) * 10000;
  return s - Math.floor(s);
}

export function createNpcModel({
  seed = Math.random() * 10000,
  skin,
  shirt,
  pants,
  shoes,
  hair,
  archetypeIndex,
} = {}) {
  let rIdx = 0;
  const rnd = () => pseudoRandom(seed + (++rIdx) * 13.37);

  const archIdx = archetypeIndex !== undefined
    ? archetypeIndex
    : Math.floor(rnd() * NPC_ARCHETYPES.length);
  const archetype = NPC_ARCHETYPES[archIdx % NPC_ARCHETYPES.length];

  const skinColor = skin ?? SKIN_PALETTES[Math.floor(rnd() * SKIN_PALETTES.length)];
  const hairColor = hair ?? HAIR_PALETTES[Math.floor(rnd() * HAIR_PALETTES.length)];
  const topColor = shirt ?? TOP_PALETTES[Math.floor(rnd() * TOP_PALETTES.length)];
  const bottomColor = pants ?? BOTTOM_PALETTES[Math.floor(rnd() * BOTTOM_PALETTES.length)];
  const shoeColor = shoes ?? SHOE_PALETTES[Math.floor(rnd() * SHOE_PALETTES.length)];
  const accentColor = ACCENT_PALETTES[Math.floor(rnd() * ACCENT_PALETTES.length)];

  // Randomized Proportions
  const heightScale = 0.88 + rnd() * 0.22; // 0.88 to 1.10
  const widthScale = 0.90 + rnd() * 0.20;

  const P = {
    hipY: 0.68 * heightScale,
    spine: 0.16 * heightScale,
    chest: 0.20 * heightScale,
    neck: 0.05 * heightScale,
    headR: 0.28 * Math.min(1.05, heightScale * 1.05),
    shoulderW: 0.19 * widthScale,
    upperArm: 0.21 * heightScale,
    foreArm: 0.19 * heightScale,
    hipW: 0.10 * widthScale,
    thigh: 0.28 * heightScale,
    shin: 0.26 * heightScale,
    foot: 0.20 * heightScale,
  };

  const root = new THREE.Group();
  root.name = `npc-${archetype}-${seed | 0}`;

  const mats = {
    skin: new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.65 }),
    top: new THREE.MeshStandardMaterial({ color: topColor, roughness: 0.75 }),
    topDark: new THREE.MeshStandardMaterial({
      color: new THREE.Color(topColor).multiplyScalar(0.80),
      roughness: 0.78,
    }),
    bottom: new THREE.MeshStandardMaterial({ color: bottomColor, roughness: 0.82 }),
    shoes: new THREE.MeshStandardMaterial({ color: shoeColor, roughness: 0.5, metalness: 0.1 }),
    hair: new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.85 }),
    accent: new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.6 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1a1816, roughness: 0.3 }),
    white: new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.4 }),
    mouth: new THREE.MeshStandardMaterial({ color: 0x8a3830, roughness: 0.6 }),
    blush: new THREE.MeshStandardMaterial({
      color: 0xe88a78,
      roughness: 0.9,
      transparent: true,
      opacity: 0.4,
    }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.1,
      metalness: 0.85,
      transparent: true,
      opacity: 0.88,
    }),
  };

  const mesh = (geo, mat, cast = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = cast;
    m.receiveShadow = true;
    return m;
  };

  const limb = (rTop, rBot, len, mat) => {
    const rad = (rTop + rBot) / 2;
    const g = new THREE.CapsuleGeometry(rad, Math.max(0.01, len - rad * 2), 4, 10);
    g.translate(0, -len / 2, 0);
    return mesh(g, mat);
  };

  // ── Pelvis / Spine / Chest ──────────────────────────────────────────
  const hip = new THREE.Group();
  hip.position.y = P.hipY;
  root.add(hip);

  const isSkirt = (archetype === "chic_beret" || archetype === "summer_active") && rnd() > 0.45;

  const pelvis = mesh(new THREE.SphereGeometry(0.15 * widthScale, 16, 12), mats.bottom);
  pelvis.scale.set(1.1, 0.82, 0.86);
  hip.add(pelvis);

  if (isSkirt) {
    const skirt = mesh(new THREE.CylinderGeometry(0.14, 0.25, 0.22, 16), mats.bottom);
    skirt.position.y = -0.08;
    hip.add(skirt);
  }

  const spine = new THREE.Group();
  spine.position.y = P.spine * 0.4;
  hip.add(spine);

  const chest = new THREE.Group();
  chest.position.y = P.spine * 0.6;
  spine.add(chest);

  // Torso Shape according to archetype
  let torsoRadius = 0.20 * widthScale;
  if (archetype === "streetwear_hoodie" || archetype === "cozy_sweater") {
    torsoRadius *= 1.12; // bulkier cozy fit
  }

  const torso = mesh(new THREE.SphereGeometry(torsoRadius, 18, 14), mats.top);
  torso.scale.set(1.05, 1.1, 0.86);
  torso.position.y = 0.1;
  chest.add(torso);

  // Archetype details on chest
  if (archetype === "streetwear_hoodie") {
    // Kangaroo front pouch
    const pouch = mesh(new THREE.BoxGeometry(0.24, 0.12, 0.08), mats.topDark);
    pouch.position.set(0, 0.02, 0.16);
    chest.add(pouch);
    // Back hood volume
    const hood = mesh(new THREE.SphereGeometry(0.16, 14, 12), mats.topDark);
    hood.scale.set(1.1, 0.7, 0.9);
    hood.position.set(0, 0.20, -0.16);
    chest.add(hood);
  } else if (archetype === "business_suit") {
    // Shirt V-neck collar & silk tie
    const innerShirt = mesh(new THREE.PlaneGeometry(0.14, 0.18), mats.white);
    innerShirt.position.set(0, 0.16, 0.18);
    chest.add(innerShirt);

    const tie = mesh(new THREE.BoxGeometry(0.045, 0.22, 0.02), mats.accent);
    tie.position.set(0, 0.08, 0.19);
    chest.add(tie);

    // Suit lapels
    [-1, 1].forEach((s) => {
      const lapel = mesh(new THREE.BoxGeometry(0.06, 0.20, 0.03), mats.topDark);
      lapel.position.set(s * 0.09, 0.14, 0.18);
      lapel.rotation.z = -s * 0.2;
      chest.add(lapel);
    });
  } else if (archetype === "cozy_sweater") {
    // Chunky wrapped scarf
    const scarfRing = mesh(new THREE.TorusGeometry(0.17, 0.06, 8, 18), mats.accent);
    scarfRing.rotation.x = Math.PI / 2;
    scarfRing.position.y = 0.24;
    chest.add(scarfRing);

    const scarfTail = mesh(new THREE.BoxGeometry(0.09, 0.26, 0.04), mats.accent);
    scarfTail.position.set(0.07, 0.08, 0.18);
    scarfTail.rotation.z = -0.15;
    chest.add(scarfTail);
  } else if (archetype === "urban_jacket") {
    // Open jacket over tee
    const innerTee = mesh(new THREE.SphereGeometry(0.185, 14, 12), mats.white);
    innerTee.scale.set(1.0, 1.05, 0.85);
    innerTee.position.set(0, 0.1, 0.03);
    chest.add(innerTee);

    // Backpack
    const backpack = mesh(new THREE.BoxGeometry(0.26, 0.32, 0.15), mats.accent);
    backpack.position.set(0, 0.12, -0.22);
    chest.add(backpack);
    const pocket = mesh(new THREE.BoxGeometry(0.20, 0.14, 0.06), mats.topDark);
    pocket.position.set(0, 0.06, -0.30);
    chest.add(pocket);
  }

  // Hem band
  const hem = mesh(new THREE.CylinderGeometry(0.175 * widthScale, 0.16 * widthScale, 0.07, 16), mats.topDark);
  hem.position.y = -0.06;
  hem.scale.z = 0.88;
  chest.add(hem);

  // ── Neck + Head ─────────────────────────────────────────────────────
  const neck = new THREE.Group();
  neck.position.y = 0.245;
  chest.add(neck);

  const neckMesh = mesh(new THREE.CylinderGeometry(0.07, 0.085, P.neck + 0.05, 10), mats.skin);
  neckMesh.position.y = 0.01;
  neck.add(neckMesh);

  const head = new THREE.Group();
  head.position.y = P.headR * 0.78;
  neck.add(head);

  // Skull & Jaw
  const skull = mesh(new THREE.SphereGeometry(P.headR, 22, 18), mats.skin);
  skull.scale.set(0.9, 1.0, 0.92);
  head.add(skull);

  const jaw = mesh(new THREE.SphereGeometry(P.headR * 0.82, 18, 14), mats.skin);
  jaw.scale.set(0.92, 0.78, 0.94);
  jaw.position.set(0, -P.headR * 0.34, P.headR * 0.05);
  head.add(jaw);

  // ── 6 Distinct Hairstyles & Headwear ────────────────────────────────
  const hairStyle = Math.floor(rnd() * 6);

  if (hairStyle === 0) {
    // Short crop with fringe & textured locks
    const cap = mesh(new THREE.SphereGeometry(P.headR * 1.04, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.44), mats.hair);
    cap.scale.set(0.94, 1.08, 0.98);
    cap.position.y = P.headR * 0.03;
    head.add(cap);

    const backHair = mesh(new THREE.SphereGeometry(P.headR * 1.04, 18, 14, Math.PI, Math.PI, 0, Math.PI * 0.72), mats.hair);
    backHair.scale.set(0.94, 1.08, 0.98);
    backHair.position.y = P.headR * 0.03;
    head.add(backHair);

    // Front fringe
    const lock = mesh(new THREE.SphereGeometry(P.headR * 0.32, 12, 10), mats.hair);
    lock.scale.set(1.4, 0.65, 0.9);
    lock.position.set(-P.headR * 0.2, P.headR * 0.55, P.headR * 0.6);
    head.add(lock);
  } else if (hairStyle === 1) {
    // Long flowing hair / ponytail
    const cap = mesh(new THREE.SphereGeometry(P.headR * 1.05, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.48), mats.hair);
    cap.scale.set(0.95, 1.08, 1.0);
    cap.position.y = P.headR * 0.04;
    head.add(cap);

    const longDrape = mesh(new THREE.CylinderGeometry(P.headR * 0.75, P.headR * 0.9, P.headR * 1.5, 14), mats.hair);
    longDrape.position.set(0, -P.headR * 0.5, -P.headR * 0.45);
    head.add(longDrape);

    // High Ponytail / Bun
    const bun = mesh(new THREE.SphereGeometry(P.headR * 0.42, 14, 12), mats.hair);
    bun.position.set(0, P.headR * 0.8, -P.headR * 0.75);
    head.add(bun);
  } else if (hairStyle === 2) {
    // Afro puffs / voluminous curly hair
    const afro = mesh(new THREE.SphereGeometry(P.headR * 1.22, 18, 16), mats.hair);
    afro.position.set(0, P.headR * 0.25, -P.headR * 0.12);
    head.add(afro);
  } else if (hairStyle === 3) {
    // Baseball / Snapback Cap
    const capDome = mesh(new THREE.SphereGeometry(P.headR * 1.06, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), mats.accent);
    capDome.position.y = P.headR * 0.15;
    head.add(capDome);

    const isBackwards = rnd() > 0.5;
    const visor = mesh(new THREE.BoxGeometry(P.headR * 1.1, 0.035, P.headR * 0.8), mats.accent);
    visor.position.set(0, P.headR * 0.12, isBackwards ? -P.headR * 1.05 : P.headR * 1.05);
    visor.rotation.x = isBackwards ? 0.18 : -0.18;
    head.add(visor);
  } else if (hairStyle === 4) {
    // Cozy Beanie Hat
    const beanie = mesh(new THREE.CylinderGeometry(P.headR * 0.95, P.headR * 1.05, P.headR * 0.9, 16), mats.accent);
    beanie.position.set(0, P.headR * 0.65, -P.headR * 0.05);
    head.add(beanie);

    const pompom = mesh(new THREE.SphereGeometry(P.headR * 0.24, 12, 10), mats.white);
    pompom.position.set(0, P.headR * 1.15, -P.headR * 0.05);
    head.add(pompom);
  } else {
    // French Beret / Chic Bob
    const beret = mesh(new THREE.CylinderGeometry(P.headR * 1.3, P.headR * 0.95, 0.15, 18), mats.topDark);
    beret.position.set(0.04, P.headR * 0.72, 0);
    beret.rotation.z = -0.25;
    head.add(beret);

    const stem = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 6), mats.topDark);
    stem.position.set(0.08, P.headR * 0.88, 0);
    head.add(stem);
  }

  // Ears
  [-1, 1].forEach((s) => {
    const ear = mesh(new THREE.SphereGeometry(P.headR * 0.2, 12, 10), mats.skin);
    ear.scale.set(0.42, 1.05, 0.95);
    ear.position.set(s * P.headR * 0.9, -P.headR * 0.03, 0);
    head.add(ear);
  });

  // ── Face Features & Eyewear ─────────────────────────────────────────
  const hasGlasses = rnd() > 0.65;
  const isShades = hasGlasses && rnd() > 0.45;

  const SK = { x: 0.9, y: 1.0, z: 0.92 };
  const faceZ = (x, y, sink = 0.94) => {
    const nx = x / (P.headR * SK.x);
    const ny = y / (P.headR * SK.y);
    const k = Math.max(0.05, 1 - nx * nx - ny * ny);
    return Math.sqrt(k) * P.headR * SK.z * sink;
  };

  // Eyes
  [-1, 1].forEach((s) => {
    const ex = s * P.headR * 0.33;
    const ey = P.headR * 0.1;
    const eye = mesh(new THREE.SphereGeometry(P.headR * 0.13, 14, 12), mats.dark, false);
    eye.scale.set(0.82, 1.15, 0.55);
    eye.position.set(ex, ey, faceZ(ex, ey, 0.95));
    head.add(eye);

    const glint = mesh(new THREE.SphereGeometry(P.headR * 0.04, 8, 6), mats.white, false);
    glint.position.set(ex - s * P.headR * 0.04, ey + P.headR * 0.05, faceZ(ex, ey, 1.02));
    head.add(glint);

    // Eyebrows
    const brow = mesh(new THREE.CapsuleGeometry(P.headR * 0.04, P.headR * 0.18, 4, 6), mats.hair, false);
    brow.rotation.z = Math.PI / 2 - s * 0.18;
    brow.position.set(ex, P.headR * 0.24, faceZ(ex, ey, 1.0));
    head.add(brow);
  });

  // Glasses / Sunglasses
  if (hasGlasses) {
    const gMat = isShades ? mats.glass : mats.dark;
    [-1, 1].forEach((s) => {
      const gx = s * P.headR * 0.33;
      const gy = P.headR * 0.1;
      const lens = mesh(new THREE.BoxGeometry(P.headR * 0.36, P.headR * 0.28, 0.03), gMat, false);
      lens.position.set(gx, gy, faceZ(gx, gy, 1.06));
      head.add(lens);
    });
    const bridge = mesh(new THREE.BoxGeometry(P.headR * 0.22, 0.03, 0.03), mats.dark, false);
    bridge.position.set(0, P.headR * 0.14, faceZ(0, P.headR * 0.14, 1.07));
    head.add(bridge);
  }

  // Button Nose
  const nose = mesh(new THREE.SphereGeometry(P.headR * 0.12, 12, 10), mats.skin, false);
  nose.scale.set(0.88, 0.8, 1.05);
  nose.position.set(0, -P.headR * 0.05, faceZ(0, -P.headR * 0.05, 1.0));
  head.add(nose);

  // Smile
  const smile = new THREE.Group();
  smile.position.set(0, -P.headR * 0.36, faceZ(0, -P.headR * 0.36, 0.99));
  head.add(smile);

  const lips = mesh(new THREE.TorusGeometry(P.headR * 0.18, P.headR * 0.03, 6, 18, Math.PI), mats.mouth, false);
  lips.rotation.z = Math.PI;
  lips.scale.set(1, 0.65, 0.7);
  smile.add(lips);

  // Blush Cheeks
  [-1, 1].forEach((s) => {
    const cheek = mesh(new THREE.SphereGeometry(P.headR * 0.12, 10, 8), mats.blush, false);
    cheek.scale.set(1.1, 0.75, 0.3);
    cheek.position.set(s * P.headR * 0.44, -P.headR * 0.2, faceZ(s * P.headR * 0.44, -P.headR * 0.2, 0.99));
    head.add(cheek);
  });

  // ── Arms ────────────────────────────────────────────────────────────
  const isShortSleeve = archetype === "summer_active" || (archetype === "streetwear_hoodie" && rnd() > 0.6);

  function buildArm(side) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * P.shoulderW, 0.185, 0);
    chest.add(shoulder);

    shoulder.add(mesh(new THREE.SphereGeometry(0.08, 12, 10), mats.top));
    const sleeve = limb(0.072, 0.064, P.upperArm * 0.95, isShortSleeve ? mats.top : mats.top);
    shoulder.add(sleeve);

    const elbow = new THREE.Group();
    elbow.position.y = -P.upperArm;
    shoulder.add(elbow);
    elbow.add(mesh(new THREE.SphereGeometry(0.058, 10, 8), isShortSleeve ? mats.skin : mats.top));

    const fore = limb(0.056, 0.048, P.foreArm, isShortSleeve ? mats.skin : mats.top);
    elbow.add(fore);

    const wrist = new THREE.Group();
    wrist.position.y = -P.foreArm;
    elbow.add(wrist);

    // Hand with thumb
    const hand = mesh(new THREE.SphereGeometry(0.074, 12, 10), mats.skin);
    hand.scale.set(0.85, 1.0, 0.72);
    hand.position.y = -0.045;
    wrist.add(hand);

    const thumb = mesh(new THREE.SphereGeometry(0.028, 8, 6), mats.skin);
    thumb.scale.set(0.8, 1.3, 0.8);
    thumb.position.set(side * -0.048, -0.03, 0.03);
    thumb.rotation.z = side * 0.6;
    wrist.add(thumb);

    return { shoulder, elbow, wrist };
  }

  const armL = buildArm(-1);
  const armR = buildArm(1);

  // ── Legs & Footwear ─────────────────────────────────────────────────
  const isShorts = (archetype === "summer_active") && !isSkirt && rnd() > 0.35;

  function buildLeg(side) {
    const hipJoint = new THREE.Group();
    hipJoint.position.set(side * P.hipW, -0.05, 0);
    hip.add(hipJoint);

    hipJoint.add(mesh(new THREE.SphereGeometry(0.096, 12, 10), mats.bottom));
    const thigh = limb(0.094, 0.08, P.thigh, isShorts ? mats.bottom : mats.bottom);
    hipJoint.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -P.thigh;
    hipJoint.add(knee);
    knee.add(mesh(new THREE.SphereGeometry(0.078, 10, 8), isShorts ? mats.skin : mats.bottom));
    const shin = limb(0.076, 0.064, P.shin, isShorts ? mats.skin : mats.bottom);
    knee.add(shin);

    const ankle = new THREE.Group();
    ankle.position.y = -P.shin;
    knee.add(ankle);

    // Rounded Shoe: Heel + Toe + Sole
    const heel = mesh(new THREE.SphereGeometry(0.076, 12, 10), mats.shoes);
    heel.scale.set(0.95, 0.7, 1.0);
    heel.position.set(0, -0.028, -0.01);
    ankle.add(heel);

    const toe = mesh(new THREE.SphereGeometry(0.074, 12, 10), mats.shoes);
    toe.scale.set(0.98, 0.62, 1.25);
    toe.position.set(0, -0.035, P.foot * 0.42);
    ankle.add(toe);

    const sole = mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.022, 12), mats.white);
    sole.scale.set(1, 1, 1.7);
    sole.position.set(0, -0.065, P.foot * 0.2);
    ankle.add(sole);

    return { hipJoint, knee, ankle };
  }

  const legL = buildLeg(-1);
  const legR = buildLeg(1);

  const rig = { root, hip, spine, chest, neck, head, armL, armR, legL, legR, baseHipY: P.hipY };

  function dispose() {
    root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    Object.values(mats).forEach((m) => m.dispose());
  }

  return {
    group: root,
    rig,
    archetype,
    hairStyle,
    PROPORTIONS: P,
    dispose,
  };
}

