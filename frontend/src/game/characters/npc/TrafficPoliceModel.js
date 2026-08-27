import * as THREE from "three";

/**
 * Traffic Police Officer 3D Character Model.
 *
 * Distinct humanoid NPC equipped with:
 * - Professional police uniform (khaki/navy)
 * - High-visibility fluorescent reflective cross-sash & belt
 * - Peaked police cap with gold badge and polished black visor
 * - Illuminated traffic command baton / stick in right hand
 * - Standard humanoid rig compatible with PlayerAnimator
 */
export function createTrafficPoliceModel({
  skinColor = 0xdfab82,
  uniformColor = 0x2b384e, // Dark navy police uniform (or khaki 0xc2a67e)
  isKhaki = false,
} = {}) {
  const root = new THREE.Group();
  root.name = "npc-traffic-police";

  const heightScale = 1.0;
  const widthScale = 1.0;

  const P = {
    hipY: 0.68 * heightScale,
    spine: 0.16 * heightScale,
    chest: 0.20 * heightScale,
    neck: 0.05 * heightScale,
    headR: 0.28 * heightScale,
    shoulderW: 0.20 * widthScale,
    upperArm: 0.22 * heightScale,
    foreArm: 0.20 * heightScale,
    hipW: 0.11 * widthScale,
    thigh: 0.28 * heightScale,
    shin: 0.26 * heightScale,
    foot: 0.20 * heightScale,
  };

  const mats = {
    skin: new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.65 }),
    uniform: new THREE.MeshStandardMaterial({ color: isKhaki ? 0xbda075 : uniformColor, roughness: 0.72 }),
    uniformDark: new THREE.MeshStandardMaterial({
      color: new THREE.Color(isKhaki ? 0x94784e : uniformColor).multiplyScalar(0.75),
      roughness: 0.75,
    }),
    pants: new THREE.MeshStandardMaterial({ color: isKhaki ? 0x3d3023 : 0x1a2332, roughness: 0.8 }),
    shoes: new THREE.MeshStandardMaterial({ color: 0x111113, roughness: 0.35, metalness: 0.2 }),
    belt: new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.4 }),
    highvis: new THREE.MeshStandardMaterial({
      color: 0xccff00,
      emissive: 0x88bb00,
      emissiveIntensity: 0.45,
      roughness: 0.3,
    }),
    highvisSilver: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xcccccc,
      emissiveIntensity: 0.3,
      roughness: 0.2,
    }),
    gold: new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.85,
      roughness: 0.25,
    }),
    capVisor: new THREE.MeshStandardMaterial({
      color: 0x0a0a0c,
      roughness: 0.1,
      metalness: 0.9,
    }),
    dark: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 }),
    white: new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.4 }),
    mouth: new THREE.MeshStandardMaterial({ color: 0x8a3830, roughness: 0.6 }),
    batonHandle: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4 }),
    batonLuminous: new THREE.MeshStandardMaterial({
      color: 0xff2222,
      emissive: 0xff1111,
      emissiveIntensity: 1.8,
      roughness: 0.2,
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

  const pelvis = mesh(new THREE.SphereGeometry(0.155 * widthScale, 16, 12), mats.pants);
  pelvis.scale.set(1.1, 0.84, 0.88);
  hip.add(pelvis);

  // Duty Utility Belt
  const beltMesh = mesh(new THREE.CylinderGeometry(0.17 * widthScale, 0.165 * widthScale, 0.05, 16), mats.belt);
  beltMesh.position.y = 0.04;
  hip.add(beltMesh);

  // Gold Belt Buckle
  const buckle = mesh(new THREE.BoxGeometry(0.06, 0.045, 0.03), mats.gold);
  buckle.position.set(0, 0.04, 0.16);
  hip.add(buckle);

  const spine = new THREE.Group();
  spine.position.y = P.spine * 0.4;
  hip.add(spine);

  const chest = new THREE.Group();
  chest.position.y = P.spine * 0.6;
  spine.add(chest);

  // Police Uniform Torso
  const torso = mesh(new THREE.SphereGeometry(0.205 * widthScale, 18, 14), mats.uniform);
  torso.scale.set(1.08, 1.12, 0.88);
  torso.position.y = 0.1;
  chest.add(torso);

  // Reflective Fluorescent High-Vis Cross-Sash (Diagonals)
  const sash1 = mesh(new THREE.BoxGeometry(0.07, 0.42, 0.02), mats.highvis);
  sash1.position.set(0, 0.1, 0.185);
  sash1.rotation.z = 0.65;
  chest.add(sash1);

  const sash2 = mesh(new THREE.BoxGeometry(0.07, 0.42, 0.02), mats.highvis);
  sash2.position.set(0, 0.1, 0.185);
  sash2.rotation.z = -0.65;
  chest.add(sash2);

  // High-Vis Silver Reflective Strips on chest
  const stripH = mesh(new THREE.BoxGeometry(0.32, 0.04, 0.02), mats.highvisSilver);
  stripH.position.set(0, 0.04, 0.19);
  chest.add(stripH);

  // Gold Police Shield Badge on Left Chest
  const badge = mesh(new THREE.CylinderGeometry(0.035, 0.02, 0.015, 6), mats.gold);
  badge.rotation.x = Math.PI / 2;
  badge.position.set(-0.11, 0.18, 0.18);
  chest.add(badge);

  // Shoulder Epaulets with Gold Buttons
  [-1, 1].forEach((s) => {
    const epaulet = mesh(new THREE.BoxGeometry(0.08, 0.02, 0.12), mats.uniformDark);
    epaulet.position.set(s * 0.18, 0.22, 0);
    chest.add(epaulet);

    const button = mesh(new THREE.SphereGeometry(0.012, 6, 6), mats.gold);
    button.position.set(s * 0.14, 0.235, 0.03);
    chest.add(button);
  });

  // ── Neck + Head ─────────────────────────────────────────────────────
  const neck = new THREE.Group();
  neck.position.y = 0.245;
  chest.add(neck);

  const neckMesh = mesh(new THREE.CylinderGeometry(0.07, 0.085, P.neck + 0.05, 10), mats.skin);
  neckMesh.position.y = 0.01;
  neck.add(neckMesh);

  // Collar
  const collar = mesh(new THREE.TorusGeometry(0.09, 0.025, 6, 16), mats.uniformDark);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.01;
  neck.add(collar);

  const head = new THREE.Group();
  head.position.y = P.headR * 0.78;
  neck.add(head);

  // Skull & Face
  const skull = mesh(new THREE.SphereGeometry(P.headR, 22, 18), mats.skin);
  skull.scale.set(0.9, 1.0, 0.92);
  head.add(skull);

  const jaw = mesh(new THREE.SphereGeometry(P.headR * 0.82, 18, 14), mats.skin);
  jaw.scale.set(0.92, 0.78, 0.94);
  jaw.position.set(0, -P.headR * 0.34, P.headR * 0.05);
  head.add(jaw);

  // ── Peaked Police Officer Cap ───────────────────────────────────────
  const capGroup = new THREE.Group();
  capGroup.position.y = P.headR * 0.42;
  head.add(capGroup);

  // Cap Crown (flared top octagonal peaked cap)
  const capCrown = mesh(new THREE.CylinderGeometry(P.headR * 1.15, P.headR * 0.98, 0.18, 18), mats.uniform);
  capCrown.position.y = 0.12;
  capGroup.add(capCrown);

  // Cap Band with Gold Chin Strap
  const capBand = mesh(new THREE.CylinderGeometry(P.headR * 1.02, P.headR * 1.02, 0.07, 18), mats.dark);
  capBand.position.y = 0.02;
  capGroup.add(capBand);

  const chinStrap = mesh(new THREE.CylinderGeometry(P.headR * 1.03, P.headR * 1.03, 0.025, 18, 1, false, -Math.PI * 0.4, Math.PI * 0.8), mats.gold);
  chinStrap.position.y = 0.02;
  capGroup.add(chinStrap);

  // Large Gold Star Officer Badge on Cap
  const capBadge = mesh(new THREE.CylinderGeometry(0.045, 0.03, 0.02, 8), mats.gold);
  capBadge.rotation.x = Math.PI / 2;
  capBadge.position.set(0, 0.12, P.headR * 1.08);
  capGroup.add(capBadge);

  // Polished Black Visor Peak
  const visor = mesh(new THREE.BoxGeometry(P.headR * 1.25, 0.03, P.headR * 0.75), mats.capVisor);
  visor.position.set(0, -0.01, P.headR * 0.95);
  visor.rotation.x = -0.22;
  capGroup.add(visor);

  // Face Features (Eyes, Aviator Sunglasses, Whistle)
  [-1, 1].forEach((s) => {
    const ex = s * P.headR * 0.33;
    const ey = P.headR * 0.08;
    // Dark Aviator Lenses
    const lens = mesh(new THREE.BoxGeometry(P.headR * 0.38, P.headR * 0.30, 0.03), mats.dark, false);
    lens.position.set(ex, ey, P.headR * 0.92);
    head.add(lens);
  });
  const aviatorBridge = mesh(new THREE.BoxGeometry(P.headR * 0.22, 0.025, 0.025), mats.gold, false);
  aviatorBridge.position.set(0, P.headR * 0.15, P.headR * 0.93);
  head.add(aviatorBridge);

  // Nose & Determined Mouth
  const nose = mesh(new THREE.SphereGeometry(P.headR * 0.12, 10, 8), mats.skin, false);
  nose.scale.set(0.88, 0.8, 1.05);
  nose.position.set(0, -P.headR * 0.06, P.headR * 0.9);
  head.add(nose);

  const lips = mesh(new THREE.TorusGeometry(P.headR * 0.16, P.headR * 0.025, 6, 16, Math.PI), mats.mouth, false);
  lips.rotation.z = Math.PI;
  lips.scale.set(1, 0.5, 0.7);
  lips.position.set(0, -P.headR * 0.32, P.headR * 0.86);
  head.add(lips);

  // ── Arms with Traffic Baton ─────────────────────────────────────────
  function buildArm(side) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * P.shoulderW, 0.185, 0);
    chest.add(shoulder);

    shoulder.add(mesh(new THREE.SphereGeometry(0.082, 12, 10), mats.uniform));
    const sleeve = limb(0.076, 0.066, P.upperArm * 0.95, mats.uniform);
    shoulder.add(sleeve);

    // High-Vis Armband
    const armband = mesh(new THREE.CylinderGeometry(0.078, 0.075, 0.06, 12), mats.highvis);
    armband.position.y = -P.upperArm * 0.45;
    shoulder.add(armband);

    const elbow = new THREE.Group();
    elbow.position.y = -P.upperArm;
    shoulder.add(elbow);
    elbow.add(mesh(new THREE.SphereGeometry(0.06, 10, 8), mats.uniform));

    const fore = limb(0.058, 0.050, P.foreArm, mats.uniform);
    elbow.add(fore);

    const wrist = new THREE.Group();
    wrist.position.y = -P.foreArm;
    elbow.add(wrist);

    // White Police Gloves
    const hand = mesh(new THREE.SphereGeometry(0.076, 12, 10), mats.white);
    hand.scale.set(0.85, 1.0, 0.72);
    hand.position.y = -0.045;
    wrist.add(hand);

    const thumb = mesh(new THREE.SphereGeometry(0.028, 8, 6), mats.white);
    thumb.scale.set(0.8, 1.3, 0.8);
    thumb.position.set(side * -0.048, -0.03, 0.03);
    thumb.rotation.z = side * 0.6;
    wrist.add(thumb);

    // If Right Arm: Attach Illuminated Traffic Control Stick / Baton
    if (side === 1) {
      const batonGroup = new THREE.Group();
      batonGroup.position.set(0, -0.05, 0.06);
      batonGroup.rotation.x = Math.PI / 2; // Point forward/upward with fist
      wrist.add(batonGroup);

      // Handle
      const handle = mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.14, 10), mats.batonHandle);
      handle.position.y = -0.04;
      batonGroup.add(handle);

      // Luminous Red/White Traffic Wand (Glows!)
      const wand = mesh(new THREE.CylinderGeometry(0.030, 0.030, 0.48, 12), mats.batonLuminous);
      wand.position.y = 0.26;
      wand.userData.bloom = true;
      batonGroup.add(wand);

      // White Tip Cap
      const tip = mesh(new THREE.SphereGeometry(0.032, 8, 8), mats.white);
      tip.position.y = 0.50;
      batonGroup.add(tip);
    }

    return { shoulder, elbow, wrist };
  }

  const armL = buildArm(-1);
  const armR = buildArm(1);

  // ── Legs ────────────────────────────────────────────────────────────
  function buildLeg(side) {
    const hipJoint = new THREE.Group();
    hipJoint.position.set(side * P.hipW, -0.05, 0);
    hip.add(hipJoint);

    hipJoint.add(mesh(new THREE.SphereGeometry(0.098, 12, 10), mats.pants));
    const thigh = limb(0.096, 0.082, P.thigh, mats.pants);
    hipJoint.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -P.thigh;
    hipJoint.add(knee);
    knee.add(mesh(new THREE.SphereGeometry(0.08, 10, 8), mats.pants));
    const shin = limb(0.078, 0.066, P.shin, mats.pants);
    knee.add(shin);

    const ankle = new THREE.Group();
    ankle.position.y = -P.shin;
    knee.add(ankle);

    // Polished Black Police Boots
    const heel = mesh(new THREE.SphereGeometry(0.08, 12, 10), mats.shoes);
    heel.scale.set(0.95, 0.75, 1.0);
    heel.position.set(0, -0.028, -0.01);
    ankle.add(heel);

    const toe = mesh(new THREE.SphereGeometry(0.078, 12, 10), mats.shoes);
    toe.scale.set(0.98, 0.65, 1.25);
    toe.position.set(0, -0.035, P.foot * 0.42);
    ankle.add(toe);

    const sole = mesh(new THREE.CylinderGeometry(0.074, 0.074, 0.024, 12), mats.shoes);
    sole.scale.set(1, 1, 1.7);
    sole.position.set(0, -0.068, P.foot * 0.2);
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
    PROPORTIONS: P,
    dispose,
  };
}

