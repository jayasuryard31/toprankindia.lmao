import * as THREE from "three";

/**
 * Stylised cartoon character - chibi proportions (big rounded head, soft
 * limbs, chunky mitt hands), built on a real joint hierarchy so PlayerAnimator
 * can drive believable motion.
 *
 * Rig contract (do not rename - PlayerAnimator drives these):
 *   root, hip, spine, chest, neck, head,
 *   armL/armR { shoulder, elbow, wrist }, legL/legR { hipJoint, knee, ankle }
 */

const P = {
  hipY: 0.68, // pelvis height - animator reads this as its baseline
  spine: 0.16,
  chest: 0.2,
  neck: 0.05,
  headR: 0.3, // deliberately oversized (cartoon)
  shoulderW: 0.225,
  upperArm: 0.21,
  foreArm: 0.19,
  hipW: 0.1,
  thigh: 0.28,
  shin: 0.26,
  foot: 0.2,
  height: 1.65,
};

export function createPlayerModel({
  skin = 0xf6d3b8,
  shirt = 0x4a9fe0,
  pants = 0x2f3f9e,
  shoes = 0x2b2b30,
  hair = 0x4b2f21,
} = {}) {
  const root = new THREE.Group();
  root.name = "player-model";

  const mats = {
    skin: new THREE.MeshStandardMaterial({ color: skin, roughness: 0.62, metalness: 0 }),
    shirt: new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.72 }),
    shirtDark: new THREE.MeshStandardMaterial({
      color: new THREE.Color(shirt).multiplyScalar(0.82),
      roughness: 0.75,
    }),
    pants: new THREE.MeshStandardMaterial({ color: pants, roughness: 0.8 }),
    shoes: new THREE.MeshStandardMaterial({ color: shoes, roughness: 0.45, metalness: 0.1 }),
    hair: new THREE.MeshStandardMaterial({ color: hair, roughness: 0.85 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1d1b1a, roughness: 0.3 }),
    white: new THREE.MeshStandardMaterial({ color: 0xfdfdfd, roughness: 0.4 }),
    mouth: new THREE.MeshStandardMaterial({ color: 0x8c4038, roughness: 0.6 }),
    blush: new THREE.MeshStandardMaterial({
      color: 0xe8907c,
      roughness: 0.9,
      transparent: true,
      opacity: 0.45,
    }),
  };

  const mesh = (geo, mat, cast = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = cast;
    m.receiveShadow = true;
    return m;
  };
  // A soft limb segment hanging DOWN from a joint at the origin.
  const limb = (rTop, rBot, len, mat) => {
    const rad = (rTop + rBot) / 2;
    const g = new THREE.CapsuleGeometry(rad, Math.max(0.01, len - rad * 2), 5, 12);
    g.translate(0, -len / 2, 0);
    return mesh(g, mat);
  };

  // ── Pelvis / spine / chest ────────────────────────────────────────
  const hip = new THREE.Group();
  hip.position.y = P.hipY;
  root.add(hip);

  const pelvis = mesh(new THREE.SphereGeometry(0.155, 18, 14), mats.pants);
  pelvis.scale.set(1.1, 0.82, 0.86);
  hip.add(pelvis);

  const spine = new THREE.Group();
  spine.position.y = P.spine * 0.4;
  hip.add(spine);

  const chest = new THREE.Group();
  chest.position.y = P.spine * 0.6;
  spine.add(chest);

  // rounded egg torso - wider at the shoulders, tucked at the waist
  const torso = mesh(new THREE.SphereGeometry(0.205, 20, 16), mats.shirt);
  torso.scale.set(1.05, 1.1, 0.86);
  torso.position.y = 0.1;
  chest.add(torso);

  // hem where the sweater meets the trousers
  const hem = mesh(new THREE.CylinderGeometry(0.175, 0.163, 0.07, 18), mats.shirtDark);
  hem.position.y = -0.06;
  hem.scale.z = 0.88;
  chest.add(hem);

  // ── Neck + head ───────────────────────────────────────────────────
  const neck = new THREE.Group();
  neck.position.y = 0.245;
  chest.add(neck);
  const neckMesh = mesh(new THREE.CylinderGeometry(0.075, 0.09, P.neck + 0.05, 12), mats.skin);
  neckMesh.position.y = 0.01;
  neck.add(neckMesh);

  const head = new THREE.Group();
  head.position.y = P.headR * 0.78;
  neck.add(head);

  // skull: tall egg, slightly narrower at the jaw
  const skull = mesh(new THREE.SphereGeometry(P.headR, 28, 24), mats.skin);
  skull.scale.set(0.9, 1.0, 0.92);
  head.add(skull);
  const jaw = mesh(new THREE.SphereGeometry(P.headR * 0.82, 20, 16), mats.skin);
  jaw.scale.set(0.92, 0.78, 0.94);
  jaw.position.set(0, -P.headR * 0.34, P.headR * 0.05);
  head.add(jaw);

  // ── Hair: crown cap + a longer back mass + swept fringe ───────────
  // SphereGeometry(r, wSeg, hSeg, phiStart, phiLength, thetaStart, thetaLength)
  // phi = azimuth (π…2π is the BACK half), theta = polar from the top pole.
  // The crown stops above the brow so it can never cover the face.
  const cap = mesh(
    new THREE.SphereGeometry(P.headR * 1.04, 26, 18, 0, Math.PI * 2, 0, Math.PI * 0.4),
    mats.hair
  );
  cap.scale.set(0.94, 1.08, 0.98);
  cap.position.y = P.headR * 0.03;
  head.add(cap);

  // back of the head, down to the nape
  const backHair = mesh(
    new THREE.SphereGeometry(P.headR * 1.04, 22, 18, Math.PI, Math.PI, 0, Math.PI * 0.74),
    mats.hair
  );
  backHair.scale.set(0.94, 1.08, 0.98);
  backHair.position.y = P.headR * 0.03;
  head.add(backHair);

  // side-swept fringe made of overlapping blobs across the brow
  const fringeSpec = [
    [-0.6, 0.5, 1.0, 0.95],
    [-0.24, 0.58, 1.02, 1.05],
    [0.14, 0.6, 1.0, 1.0],
    [0.48, 0.54, 0.96, 0.9],
    [0.72, 0.42, 0.86, 0.78],
  ];
  // flattened + overlapping so they merge into one swoop rather than reading
  // as separate balls
  fringeSpec.forEach(([sx, sy, sz, sc]) => {
    const lock = mesh(new THREE.SphereGeometry(P.headR * 0.3 * sc, 16, 12), mats.hair);
    lock.scale.set(1.5, 0.62, 0.95);
    lock.position.set(sx * P.headR * 0.66, sy * P.headR, sz * P.headR * 0.62);
    lock.rotation.z = -sx * 0.3;
    head.add(lock);
  });
  // sideburns
  [-1, 1].forEach((s) => {
    const sb = mesh(new THREE.SphereGeometry(P.headR * 0.2, 12, 10), mats.hair);
    sb.scale.set(0.7, 1.5, 0.9);
    sb.position.set(s * P.headR * 0.86, P.headR * 0.06, P.headR * 0.06);
    head.add(sb);
  });

  // ── Ears ──────────────────────────────────────────────────────────
  [-1, 1].forEach((s) => {
    const ear = mesh(new THREE.SphereGeometry(P.headR * 0.2, 14, 12), mats.skin);
    ear.scale.set(0.42, 1.05, 0.95);
    ear.position.set(s * P.headR * 0.9, -P.headR * 0.03, 0);
    head.add(ear);
  });

  // ── Face ──────────────────────────────────────────────────────────
  // The skull is a NON-UNIFORMLY scaled sphere, so a fixed "face plane" buries
  // features inside it. Solve for the real surface Z at each (x, y) instead.
  const SK = { x: 0.9, y: 1.0, z: 0.92 }; // must match skull.scale
  const faceZ = (x, y, sink = 0.94) => {
    const nx = x / (P.headR * SK.x);
    const ny = y / (P.headR * SK.y);
    const k = Math.max(0.05, 1 - nx * nx - ny * ny);
    return Math.sqrt(k) * P.headR * SK.z * sink;
  };

  // big oval eyes
  [-1, 1].forEach((s) => {
    const ex = s * P.headR * 0.33;
    const ey = P.headR * 0.1;
    const eye = mesh(new THREE.SphereGeometry(P.headR * 0.135, 18, 16), mats.dark, false);
    eye.scale.set(0.82, 1.18, 0.55);
    eye.position.set(ex, ey, faceZ(ex, ey, 0.95));
    head.add(eye);

    // catchlight, sitting just proud of the eye
    const gx = ex - s * P.headR * 0.045;
    const gy = ey + P.headR * 0.055;
    const glint = mesh(new THREE.SphereGeometry(P.headR * 0.04, 10, 8), mats.white, false);
    glint.position.set(gx, gy, faceZ(gx, gy, 1.02));
    head.add(glint);

    // thick brow, sitting just above the eye and below the fringe
    const bx = s * P.headR * 0.33;
    const by = P.headR * 0.245;
    const brow = mesh(new THREE.CapsuleGeometry(P.headR * 0.045, P.headR * 0.2, 4, 8), mats.hair, false);
    brow.rotation.z = Math.PI / 2 - s * 0.2;
    brow.position.set(bx, by, faceZ(bx, by, 1.0));
    head.add(brow);
  });

  // rounded button nose
  const ny = -P.headR * 0.05;
  const nose = mesh(new THREE.SphereGeometry(P.headR * 0.13, 16, 14), mats.skin, false);
  nose.scale.set(0.88, 0.8, 1.05);
  nose.position.set(0, ny, faceZ(0, ny, 1.0));
  head.add(nose);

  // smile: an arc of the bottom of a torus, flattened, with teeth behind
  const my = -P.headR * 0.36;
  const smile = new THREE.Group();
  smile.position.set(0, my, faceZ(0, my, 0.99));
  head.add(smile);

  const ARC = 2.15;
  const lips = mesh(
    new THREE.TorusGeometry(P.headR * 0.2, P.headR * 0.033, 8, 26, ARC),
    mats.mouth,
    false
  );
  lips.rotation.z = -Math.PI / 2 - ARC / 2; // centre the arc at the bottom
  lips.scale.set(1, 0.62, 0.7);
  lips.position.y = P.headR * 0.1;
  smile.add(lips);

  const teeth = mesh(new THREE.SphereGeometry(P.headR * 0.135, 16, 10), mats.white, false);
  teeth.scale.set(1.0, 0.32, 0.4);
  teeth.position.set(0, P.headR * 0.055, -P.headR * 0.008);
  smile.add(teeth);

  // rosy cheeks
  [-1, 1].forEach((s) => {
    const cx2 = s * P.headR * 0.44;
    const cy2 = -P.headR * 0.2;
    const cheek = mesh(new THREE.SphereGeometry(P.headR * 0.13, 12, 10), mats.blush, false);
    cheek.scale.set(1.1, 0.75, 0.3);
    cheek.position.set(cx2, cy2, faceZ(cx2, cy2, 0.99));
    head.add(cheek);
  });

  // ── Arms ──────────────────────────────────────────────────────────
  function buildArm(side) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * P.shoulderW, 0.185, 0);
    chest.add(shoulder);

    shoulder.add(mesh(new THREE.SphereGeometry(0.082, 14, 12), mats.shirt));
    const sleeve = limb(0.072, 0.064, P.upperArm * 0.95, mats.shirt);
    shoulder.add(sleeve);

    const elbow = new THREE.Group();
    elbow.position.y = -P.upperArm;
    shoulder.add(elbow);
    elbow.add(mesh(new THREE.SphereGeometry(0.06, 12, 10), mats.shirt));
    const fore = limb(0.058, 0.05, P.foreArm * 0.6, mats.shirt); // cuff
    elbow.add(fore);
    const wristSkin = limb(0.05, 0.046, P.foreArm, mats.skin);
    elbow.add(wristSkin);

    const wrist = new THREE.Group();
    wrist.position.y = -P.foreArm;
    elbow.add(wrist);
    // chunky mitt hand
    const hand = mesh(new THREE.SphereGeometry(0.078, 14, 12), mats.skin);
    hand.scale.set(0.85, 1.0, 0.72);
    hand.position.y = -0.045;
    wrist.add(hand);
    const thumb = mesh(new THREE.SphereGeometry(0.03, 10, 8), mats.skin);
    thumb.scale.set(0.8, 1.3, 0.8);
    thumb.position.set(side * -0.05, -0.03, 0.03);
    thumb.rotation.z = side * 0.6;
    wrist.add(thumb);

    return { shoulder, elbow, wrist };
  }
  const armL = buildArm(-1);
  const armR = buildArm(1);

  // ── Legs ──────────────────────────────────────────────────────────
  function buildLeg(side) {
    const hipJoint = new THREE.Group();
    hipJoint.position.set(side * P.hipW, -0.05, 0);
    hip.add(hipJoint);

    hipJoint.add(mesh(new THREE.SphereGeometry(0.098, 14, 12), mats.pants));
    const thigh = limb(0.095, 0.082, P.thigh, mats.pants);
    hipJoint.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -P.thigh;
    hipJoint.add(knee);
    knee.add(mesh(new THREE.SphereGeometry(0.08, 12, 10), mats.pants));
    const shin = limb(0.078, 0.066, P.shin, mats.pants);
    knee.add(shin);

    const ankle = new THREE.Group();
    ankle.position.y = -P.shin;
    knee.add(ankle);

    // rounded shoe: heel ball + toe ball, no hard box
    const heel = mesh(new THREE.SphereGeometry(0.078, 14, 12), mats.shoes);
    heel.scale.set(0.95, 0.7, 1.0);
    heel.position.set(0, -0.028, -0.01);
    ankle.add(heel);
    const toe = mesh(new THREE.SphereGeometry(0.075, 14, 12), mats.shoes);
    toe.scale.set(0.98, 0.62, 1.25);
    toe.position.set(0, -0.035, P.foot * 0.42);
    ankle.add(toe);
    // pale sole
    const sole = mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.022, 14), mats.white);
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

  function setColor(hex) {
    mats.shirt.color.set(hex);
    mats.shirtDark.color.set(new THREE.Color(hex).multiplyScalar(0.82));
  }

  return { group: root, rig, dispose, setColor, PROPORTIONS: P };
}

export { P as PLAYER_PROPORTIONS };
