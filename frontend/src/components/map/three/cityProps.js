/**
 * cityProps.js — reusable detailed procedural meshes & textures.
 * Everything here is self-contained (canvas textures, box/lathe geometry).
 */
import * as THREE from "three";

const aniso = { v: 4 };
export function setPropAnisotropy(v) {
  aniso.v = Math.max(1, v || 1);
}

// ── Shared low-poly materials ──────────────────────────────────────────
export const MAT = {
  trunk: new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1 }),
  hedge: new THREE.MeshStandardMaterial({ color: 0x3c6b34, roughness: 1 }),
  pole: new THREE.MeshStandardMaterial({ color: 0x2c313a, roughness: 0.6, metalness: 0.5 }),
  lamp: new THREE.MeshStandardMaterial({ color: 0xffe9b0, emissive: 0xffdd92, emissiveIntensity: 1.4 }),
  lampGlobe: new THREE.MeshStandardMaterial({ color: 0xfff0c4, emissive: 0xffea9f, emissiveIntensity: 1.6 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x9fd4e8, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.5 }),
  carGlass: new THREE.MeshStandardMaterial({
    color: 0x121a24,
    roughness: 0.03,
    metalness: 0.55,
    transparent: true,
    opacity: 0.78,
    envMapIntensity: 2.0,
  }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xced6dd, roughness: 0.3, metalness: 0.7 }),
};

/**
 * Street / park lamps share one material each, so the city clock can dim every
 * light in the world with two assignments. `0` reads as "off" in daylight.
 */
export function setLampIntensity(v) {
  const k = Math.max(0, v);
  MAT.lamp.emissiveIntensity = k * 1.4;
  MAT.lampGlobe.emissiveIntensity = k * 1.6;
}

const canopyGreens = [0x4b8b3b, 0x3f7d33, 0x5a9a45, 0x36702f, 0x6aa84f];

// ── Trees ─────────────────────────────────────────────────────────────
// Returns a Group: trunk + 2-3 overlapping canopy blobs. Origin at base.
export function makeTree(seed = 1, kind = "round") {
  const r = mulberry(seed);
  const g = new THREE.Group();
  const h = 3.4 + r() * 3.6;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.42, h * 0.55, 6),
    MAT.trunk
  );
  trunk.position.y = h * 0.275;
  trunk.castShadow = true;
  g.add(trunk);

  const green = canopyGreens[(seed | 0) % canopyGreens.length];
  const canopyMat = new THREE.MeshStandardMaterial({ color: green, roughness: 1, flatShading: true });

  if (kind === "pine") {
    for (let i = 0; i < 3; i++) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(1.9 - i * 0.5, 2.4, 7),
        canopyMat
      );
      cone.position.y = h * 0.5 + i * 1.5;
      cone.castShadow = true;
      g.add(cone);
    }
  } else {
    const blobs = 2 + Math.floor(r() * 2);
    for (let i = 0; i < blobs; i++) {
      const rad = (1.5 + r() * 1.1) * (i === 0 ? 1.15 : 0.85);
      const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(rad, 1), canopyMat);
      blob.position.set(
        (r() - 0.5) * 1.6,
        h * 0.62 + i * 1.1 + r() * 0.6,
        (r() - 0.5) * 1.6
      );
      blob.castShadow = true;
      g.add(blob);
    }
  }
  return g;
}

/** Build a couple of InstancedMeshes covering many tree positions cheaply. */
export function makeTreeField(positions, { pineRatio = 0.15 } = {}) {
  const group = new THREE.Group();
  const trunkGeo = new THREE.CylinderGeometry(0.32, 0.46, 1, 6);
  trunkGeo.translate(0, 0.5, 0);
  const canopyGeo = new THREE.IcosahedronGeometry(1, 1);
  const n = positions.length;

  const trunk = new THREE.InstancedMesh(trunkGeo, MAT.trunk, n);
  const canopy = new THREE.InstancedMesh(
    canopyGeo,
    new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }),
    n * 2
  );
  canopy.castShadow = true;
  canopy.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 2 * 3), 3);

  const d = new THREE.Object3D();
  const col = new THREE.Color();
  let ci = 0;
  positions.forEach(([x, z], i) => {
    const s = 2.6 + hashf(x, z) * 3.4;
    const trunkH = s * 1.7;
    d.position.set(x, 0, z);
    d.scale.set(1, trunkH, 1);
    d.updateMatrix();
    trunk.setMatrixAt(i, d.matrix);

    col.set(canopyGreens[(i + ((x | 0) % 5)) % canopyGreens.length]);
    for (let b = 0; b < 2; b++) {
      const rad = s * (b === 0 ? 1 : 0.72);
      d.position.set(x + (b ? (hashf(x + b, z) - 0.5) * s : 0), trunkH + rad * 0.55 + b * s * 0.7, z + (b ? (hashf(x, z + b) - 0.5) * s : 0));
      d.scale.setScalar(rad);
      d.updateMatrix();
      canopy.setMatrixAt(ci, d.matrix);
      canopy.setColorAt(ci, col);
      ci++;
    }
  });
  canopy.count = ci;
  trunk.instanceMatrix.needsUpdate = true;
  canopy.instanceMatrix.needsUpdate = true;
  if (canopy.instanceColor) canopy.instanceColor.needsUpdate = true;
  group.add(trunk, canopy);
  return group;
}

// ── Cars & buses ──────────────────────────────────────────────────────
export const carColors = [0xe23b2e, 0x2f6fdb, 0xf4c542, 0xf2f2f2, 0x12a150, 0x8b3fd6, 0x2a2f38, 0xd98032];

/**
 * Instanced traffic fleet — visually identical to a pile of makeCar() groups
 * but ~3 draw calls instead of ~6 per vehicle. `specs` = [{ len, wid, bus,
 * colorHex }]. Returns { group, setCar(i,x,z,rotY), dispose }.
 */
export function createTrafficFleet(specs) {
  const n = specs.length;
  const group = new THREE.Group();
  group.name = "traffic-fleet";

  // Unit car body: a proper automotive silhouette (tapered nose, cabin
  // greenhouse, boot) baked into a 1×1×1 box so every instance just scales it.
  const carBody = unitCarBody();
  const busBody = unitBusBody();

  const bodyMat = new THREE.MeshStandardMaterial({
    roughness: 0.16,
    metalness: 0.72,
    envMapIntensity: 1.5,
  });
  const carMesh = new THREE.InstancedMesh(carBody, bodyMat, n);
  const busMesh = new THREE.InstancedMesh(busBody, bodyMat.clone(), n);
  carMesh.castShadow = busMesh.castShadow = true;
  carMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
  busMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);

  const glassMesh = new THREE.InstancedMesh(unitGreenhouse(), MAT.carGlass, n);

  // wheel = tyre + a lighter hub face, still one instanced draw each
  const tyreGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.22, 14);
  tyreGeo.rotateZ(Math.PI / 2);
  const wheelMesh = new THREE.InstancedMesh(
    tyreGeo,
    new THREE.MeshStandardMaterial({ color: 0x0e1013, roughness: 0.95, metalness: 0.0 }),
    n * 4
  );
  const hubGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.24, 12);
  hubGeo.rotateZ(Math.PI / 2);
  const hubMesh = new THREE.InstancedMesh(
    hubGeo,
    new THREE.MeshStandardMaterial({ color: 0xd6dde4, roughness: 0.14, metalness: 0.95, envMapIntensity: 1.6 }),
    n * 4
  );

  // lights
  const lampGeo = new THREE.BoxGeometry(1, 1, 1);
  const headMesh = new THREE.InstancedMesh(
    lampGeo,
    new THREE.MeshStandardMaterial({ color: 0xfff6de, emissive: 0xfff0c8, emissiveIntensity: 1.4 }),
    n * 2
  );
  const tailMesh = new THREE.InstancedMesh(
    lampGeo.clone(),
    new THREE.MeshStandardMaterial({ color: 0xd12b20, emissive: 0xff2a1a, emissiveIntensity: 1.6 }),
    n * 2
  );
  headMesh.userData.bloom = true;
  tailMesh.userData.bloom = true;

  group.add(carMesh, busMesh, glassMesh, wheelMesh, hubMesh, headMesh, tailMesh);

  const d = new THREE.Object3D();
  const col = new THREE.Color();
  const q = new THREE.Quaternion();
  const yAxis = new THREE.Vector3(0, 1, 0);
  const off = new THREE.Vector3();
  const HIDE = new THREE.Matrix4().makeScale(0.0001, 0.0001, 0.0001).setPosition(0, -9999, 0);

  specs.forEach((s, i) => {
    col.setHex(s.colorHex);
    (s.bus ? busMesh : carMesh).setColorAt(i, col);
    (s.bus ? carMesh : busMesh).setMatrixAt(i, HIDE);
  });

  function place(mesh, idx, x, y, z, sx, sy, sz, localX, localZ) {
    off.set(localX || 0, 0, localZ || 0).applyQuaternion(q);
    d.position.set(x + off.x, y, z + off.z);
    d.quaternion.copy(q);
    d.scale.set(sx, sy, sz);
    d.updateMatrix();
    mesh.setMatrixAt(idx, d.matrix);
  }

  function setCar(i, x, z, rotY) {
    const s = specs[i];
    q.setFromAxisAngle(yAxis, rotY);

    const bodyH = s.bus ? 2.9 : 1.32;
    const bodyY = s.bus ? 0.42 : 0.3; // baked geometry sits on its own base
    place(s.bus ? busMesh : carMesh, i, x, bodyY, z, s.wid, bodyH, s.len);

    // greenhouse / window band — inset into the body's upper volume, never
    // floating on top of it
    if (s.bus) {
      place(glassMesh, i, x, bodyY + bodyH * 0.56, z, s.wid * 1.008, bodyH * 0.3, s.len * 0.9);
    } else {
      place(glassMesh, i, x, bodyY + bodyH * 0.6, z, s.wid * 0.9, bodyH * 0.27, s.len * 0.55, 0, -s.len * 0.03);
    }

    // wheels tucked into the arches
    const wx = s.wid / 2 - 0.05;
    const wz = s.len * (s.bus ? 0.33 : 0.31);
    const wy = s.bus ? 0.42 : 0.34;
    const corners = [[wx, wz], [-wx, wz], [wx, -wz], [-wx, -wz]];
    for (let k = 0; k < 4; k++) {
      const sc = s.bus ? 1.25 : 1;
      place(wheelMesh, i * 4 + k, x, wy, z, sc, sc, sc, corners[k][0], corners[k][1]);
      place(hubMesh, i * 4 + k, x, wy, z, sc * 1.02, sc, sc, corners[k][0] * 1.02, corners[k][1]);
    }

    // head / tail lamps
    const lx = s.wid * 0.3;
    const front = s.len * 0.48;
    for (let k = 0; k < 2; k++) {
      const sx = k === 0 ? lx : -lx;
      place(headMesh, i * 2 + k, x, bodyY + bodyH * 0.34, z, 0.34, 0.16, 0.1, sx, front);
      place(tailMesh, i * 2 + k, x, bodyY + bodyH * 0.4, z, 0.3, 0.14, 0.1, sx, -front);
    }
  }

  function flush() {
    [carMesh, busMesh, glassMesh, wheelMesh, hubMesh, headMesh, tailMesh].forEach((m) => {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    });
  }

  function dispose() {
    [carMesh, busMesh, glassMesh, wheelMesh, hubMesh, headMesh, tailMesh].forEach((m) => {
      m.geometry.dispose();
      if (m.material !== MAT.carGlass) m.material.dispose();
    });
  }

  return { group, setCar, flush, dispose, specs };
}

// ── Unit vehicle shells (all fit a 1×1×1 box, base at y=0) ────────────
// Built by merging a few tapered boxes so the profile reads as a real car
// from any angle instead of a brick.
function taperedBox(w0, w1, h, d, yc, zc, squashTopZ = 0) {
  const g = new THREE.BoxGeometry(1, h, d, 1, 1, 1);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const t = (y + h / 2) / h; // 0 at bottom, 1 at top
    pos.setX(i, pos.getX(i) * THREE.MathUtils.lerp(w0, w1, t));
    if (squashTopZ) pos.setZ(i, z * (1 - t * squashTopZ));
  }
  g.translate(0, yc, zc);
  g.computeVertexNormals();
  return g;
}

function unitCarBody() {
  // lower body (widest), sill, and a tapered bonnet/boot deck
  const lower = taperedBox(0.98, 1.0, 0.46, 1.0, 0.23, 0);
  const upper = taperedBox(0.96, 0.8, 0.3, 0.62, 0.6, -0.03, 0.18);
  const nose = taperedBox(0.9, 0.72, 0.2, 0.2, 0.36, 0.42);
  const g = mergeGeos([lower, upper, nose]);
  g.computeVertexNormals();
  return g;
}

function unitBusBody() {
  const main = taperedBox(1.0, 0.97, 0.86, 1.0, 0.43, 0);
  const roof = taperedBox(0.94, 0.84, 0.12, 0.96, 0.92, 0, 0.1);
  const g = mergeGeos([main, roof]);
  g.computeVertexNormals();
  return g;
}

function unitGreenhouse() {
  return taperedBox(1.0, 0.86, 1.0, 1.0, 0, 0, 0.16);
}

function mergeGeos(list) {
  let vc = 0;
  const nn = list.map((g) => (g.index ? g.toNonIndexed() : g));
  nn.forEach((g) => (vc += g.attributes.position.count));
  const pos = new Float32Array(vc * 3);
  const nor = new Float32Array(vc * 3);
  let o = 0;
  nn.forEach((g) => {
    pos.set(g.attributes.position.array, o);
    if (g.attributes.normal) nor.set(g.attributes.normal.array, o);
    o += g.attributes.position.array.length;
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  out.computeBoundingSphere();
  list.forEach((g) => g.dispose());
  return out;
}

export function makeCar(seed = 1, bus = false) {
  const r = mulberry(seed);
  const g = new THREE.Group();
  const len = bus ? 13 : 5.4 + r() * 1.4;
  const wid = bus ? 3 : 2.5;
  const col = bus ? 0xf2b134 : carColors[Math.floor(r() * carColors.length)];
  const bodyMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, metalness: 0.45 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(wid, bus ? 3 : 1.5, len), bodyMat);
  body.position.y = bus ? 2 : 1.1;
  body.castShadow = true;
  g.add(body);

  if (!bus) {
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(wid * 0.9, 1.15, len * 0.5),
      MAT.glass
    );
    cabin.position.set(0, 2.0, -len * 0.05);
    g.add(cabin);
  } else {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(wid + 0.02, 1, len * 0.92), MAT.glass);
    strip.position.set(0, 2.4, 0);
    g.add(strip);
  }

  const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.8 });
  const wx = wid / 2;
  const wz = len / 2 - 1;
  [[wx, wz], [-wx, wz], [wx, -wz], [-wx, -wz]].forEach(([x, z]) => {
    const wl = new THREE.Mesh(wheelGeo, wheelMat);
    wl.position.set(x, 0.55, z);
    g.add(wl);
  });
  return g;
}

// ── Vessels: ship / yacht / sailboat / boat / jetski ──────────────────
// Origin at the waterline centre; +X points towards the bow.
function hullMesh(L, W, depth, colHex, pointy = true) {
  const s = new THREE.Shape();
  s.moveTo(-L / 2, -W / 2);
  s.lineTo(L / 2 - (pointy ? W : W * 0.3), -W / 2);
  s.quadraticCurveTo(L / 2 + W * (pointy ? 0.5 : 0.15), 0, L / 2 - (pointy ? W : W * 0.3), W / 2);
  s.lineTo(-L / 2, W / 2);
  s.closePath();
  const m = new THREE.Mesh(
    new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }),
    new THREE.MeshStandardMaterial({ color: colHex, roughness: 0.55, metalness: 0.15 })
  );
  m.rotation.x = -Math.PI / 2;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function makeVessel(seed = 1, kind = "boat") {
  const r = mulberry(seed);
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xf3f4f5, roughness: 0.35 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2b3038, roughness: 0.5, metalness: 0.4 });

  if (kind === "ship") {
    const L = 78 + r() * 34;
    const W = 15 + r() * 5;
    const hull = hullMesh(L, W, 8, 0x8a2f2f, false);
    hull.position.y = 4.2;
    g.add(hull);
    // waterline stripe
    const stripe = hullMesh(L * 0.99, W * 1.02, 1.4, 0x101318, false);
    stripe.position.y = 6.4;
    g.add(stripe);
    // container stacks
    const cols = [0xd94f4f, 0x4f7fd9, 0x4fae6a, 0xe8b23a, 0x9a9a9a, 0x6b4fae];
    for (let x = -L * 0.34; x < L * 0.22; x += 6.2) {
      for (let z = -W * 0.3; z <= W * 0.3; z += W * 0.3) {
        const stack = 1 + Math.floor(r() * 3);
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(5.6, 2.4 * stack, W * 0.26),
          new THREE.MeshStandardMaterial({ color: cols[Math.floor(r() * cols.length)], roughness: 0.7 })
        );
        box.position.set(x, 8.4 + 1.2 * stack, z);
        box.castShadow = true;
        g.add(box);
      }
    }
    // bridge tower aft
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(W * 0.7, 12, W * 0.8), white);
    bridge.position.set(-L * 0.36, 13, 0);
    bridge.castShadow = true;
    g.add(bridge);
    const funnel = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2, 6, 12), dark);
    funnel.position.set(-L * 0.42, 21, 0);
    g.add(funnel);
    return g;
  }

  if (kind === "yacht") {
    const L = 26 + r() * 12;
    const W = 7 + r() * 2;
    const hull = hullMesh(L, W, 3.4, 0xf2f3f4);
    hull.position.y = 1.6;
    g.add(hull);
    const deck1 = new THREE.Mesh(new THREE.BoxGeometry(L * 0.55, 2.6, W * 0.78), white);
    deck1.position.set(-L * 0.02, 3.6, 0);
    deck1.castShadow = true;
    g.add(deck1);
    const deck2 = new THREE.Mesh(new THREE.BoxGeometry(L * 0.34, 2.2, W * 0.6), white);
    deck2.position.set(-L * 0.08, 6, 0);
    deck2.castShadow = true;
    g.add(deck2);
    const windows = new THREE.Mesh(new THREE.BoxGeometry(L * 0.56, 1, W * 0.8), MAT.glass);
    windows.position.set(-L * 0.02, 3.6, 0);
    g.add(windows);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(W * 0.32, 0.18, 6, 12, Math.PI), MAT.chrome);
    arch.rotation.z = Math.PI / 2;
    arch.position.set(-L * 0.2, 7.4, 0);
    g.add(arch);
    return g;
  }

  if (kind === "sailboat") {
    const L = 13 + r() * 5;
    const W = 3.6 + r() * 1.2;
    const hull = hullMesh(L, W, 1.8, 0x2e5f8f);
    hull.position.y = 1;
    g.add(hull);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(L * 0.4, 0.8, W * 0.6), white);
    deck.position.set(0, 2, 0);
    g.add(deck);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 16, 6), MAT.chrome);
    mast.position.set(L * 0.05, 10, 0);
    g.add(mast);
    // main sail
    const sailShape = new THREE.Shape();
    sailShape.moveTo(0, 0);
    sailShape.lineTo(0, 13);
    sailShape.lineTo(-6.5, 0);
    sailShape.closePath();
    const sail = new THREE.Mesh(
      new THREE.ShapeGeometry(sailShape),
      new THREE.MeshStandardMaterial({ color: 0xf6f6f2, roughness: 0.9, side: THREE.DoubleSide })
    );
    sail.position.set(L * 0.05, 2.6, 0);
    sail.rotation.y = Math.PI / 2;
    sail.castShadow = true;
    g.add(sail);
    // jib
    const jib = new THREE.Mesh(
      new THREE.ShapeGeometry(sailShape),
      new THREE.MeshStandardMaterial({ color: 0xdfe6ea, roughness: 0.9, side: THREE.DoubleSide })
    );
    jib.scale.set(0.55, 0.7, 1);
    jib.position.set(L * 0.32, 2.6, 0);
    jib.rotation.y = Math.PI / 2;
    g.add(jib);
    return g;
  }

  if (kind === "jetski") {
    const L = 4.2 + r() * 1;
    const W = 1.5;
    const hull = hullMesh(L, W, 0.9, [0x27c2d6, 0xf25c54, 0xf7b32b, 0x8be04e][Math.floor(r() * 4)]);
    hull.position.y = 0.7;
    g.add(hull);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(L * 0.5, 0.5, W * 0.8), dark);
    seat.position.set(-L * 0.05, 1.4, 0);
    g.add(seat);
    const hb = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, W * 1.1), dark);
    hb.position.set(L * 0.25, 1.7, 0);
    g.add(hb);
    return g;
  }

  // small open boat / dinghy
  const L = 8 + r() * 4;
  const W = 3 + r() * 1;
  const hull = hullMesh(L, W, 1.4, [0xe4e7ea, 0xdca85a, 0x6fae8f][Math.floor(r() * 3)]);
  hull.position.y = 0.9;
  g.add(hull);
  const bench = new THREE.Mesh(new THREE.BoxGeometry(W * 0.9, 0.3, 0.7), dark);
  bench.position.set(0, 1.4, 0);
  g.add(bench);
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, W * 0.7), MAT.glass);
  shield.position.set(L * 0.22, 1.7, 0);
  g.add(shield);
  const outboard = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.4, 0.7), dark);
  outboard.position.set(-L * 0.5, 1, 0);
  g.add(outboard);
  return g;
}

// back-compat alias
export function makeBoat(seed = 1, big = false) {
  return makeVessel(seed, big ? "yacht" : "boat");
}

// ── Street furniture ──────────────────────────────────────────────────
export function makeStreetlight() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 8, 6), MAT.pole);
  pole.position.y = 4;
  pole.castShadow = true;
  g.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 0.2), MAT.pole);
  arm.position.set(1, 7.8, 0);
  g.add(arm);
  const head = new THREE.Mesh(new THREE.BoxGeometry(1, 0.4, 0.7), MAT.lamp);
  head.position.set(2, 7.7, 0);
  head.userData.bloom = true;
  g.add(head);
  return g;
}

// ── NPC crowds (instanced) ────────────────────────────────────────────
const SKIN_TONES = ["#f3cda9", "#e0aa7e", "#c68a5b", "#9a6440", "#6f4529"];
const SHIRT_TONES = [
  "#d94f4f", "#4f7fd9", "#4fae6a", "#e6e6e6", "#e8b23a",
  "#6b4fae", "#37414f", "#e07a3f", "#3fb5b5", "#c4517f",
];
const LEG_TONES = ["#2f3f6e", "#33373d", "#4a4034", "#5a5f68", "#243044"];
const HAIR_TONES = ["#241a13", "#4b2f21", "#12100f", "#7a5230", "#8f8b86"];

/**
 * NPC crowd — proper little people (head, hair, torso, two arms, two legs)
 * instead of bare capsules. Six InstancedMeshes total, so a few hundred
 * pedestrians still cost ~6 draw calls.
 *
 * `positions` = [[x, z, yaw], …]
 */
export function makePeople(positions) {
  const n = positions.length;
  const group = new THREE.Group();
  group.name = "npc-crowd";
  group.userData.npc = true;

  const softMat = () => new THREE.MeshStandardMaterial({ roughness: 0.85 });

  // Body parts, each authored so its ORIGIN is the character's foot level.
  const torsoGeo = new THREE.CapsuleGeometry(0.19, 0.3, 4, 10);
  torsoGeo.scale(1.0, 1.0, 0.7);
  torsoGeo.translate(0, 1.08, 0);

  const headGeo = new THREE.SphereGeometry(0.155, 14, 12);
  headGeo.scale(0.92, 1.02, 0.94);
  headGeo.translate(0, 1.47, 0);

  const hairGeo = new THREE.SphereGeometry(0.163, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62);
  hairGeo.scale(0.94, 1.1, 0.98);
  hairGeo.translate(0, 1.49, 0);

  const legGeo = new THREE.CapsuleGeometry(0.075, 0.42, 3, 8);
  legGeo.translate(0, 0.35, 0);

  const armGeo = new THREE.CapsuleGeometry(0.062, 0.33, 3, 8);
  armGeo.translate(0, 1.06, 0);

  const shoeGeo = new THREE.SphereGeometry(0.082, 10, 8);
  shoeGeo.scale(0.85, 0.55, 1.35);
  shoeGeo.translate(0, 0.05, 0.03);

  const torso = new THREE.InstancedMesh(torsoGeo, softMat(), n);
  const head = new THREE.InstancedMesh(headGeo, softMat(), n);
  const hair = new THREE.InstancedMesh(hairGeo, softMat(), n);
  const legs = new THREE.InstancedMesh(legGeo, softMat(), n * 2);
  const arms = new THREE.InstancedMesh(armGeo, softMat(), n * 2);
  const shoes = new THREE.InstancedMesh(
    shoeGeo,
    new THREE.MeshStandardMaterial({ color: 0x2b2b30, roughness: 0.6 }),
    n * 2
  );

  [torso, head, hair, legs, arms].forEach((m) => {
    m.castShadow = true;
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(m.count * 3), 3);
  });
  shoes.castShadow = true;

  const d = new THREE.Object3D();
  const c = new THREE.Color();
  const q = new THREE.Quaternion();
  const yAxis = new THREE.Vector3(0, 1, 0);
  const off = new THREE.Vector3();

  const place = (m, idx, x, z, yaw, scale, lx = 0, lz = 0, tilt = 0) => {
    q.setFromAxisAngle(yAxis, yaw);
    off.set(lx * scale, 0, lz * scale).applyQuaternion(q);
    d.position.set(x + off.x, 0, z + off.z);
    d.quaternion.copy(q);
    if (tilt) d.rotateX(tilt);
    d.scale.setScalar(scale);
    d.updateMatrix();
    m.setMatrixAt(idx, d.matrix);
  };

  positions.forEach(([x, z, yaw = 0], i) => {
    const r1 = hashf(x, z);
    const r2 = hashf(x + 7.3, z - 3.1);
    const s = 0.9 + r1 * 0.26; // height variation

    const skinC = SKIN_TONES[Math.floor(r1 * SKIN_TONES.length) % SKIN_TONES.length];
    const shirtC = SHIRT_TONES[(i + Math.floor(r2 * 10)) % SHIRT_TONES.length];
    const legC = LEG_TONES[Math.floor(r2 * LEG_TONES.length) % LEG_TONES.length];
    const hairC = HAIR_TONES[Math.floor(r1 * 100) % HAIR_TONES.length];

    place(torso, i, x, z, yaw, s);
    torso.setColorAt(i, c.set(shirtC));
    place(head, i, x, z, yaw, s);
    head.setColorAt(i, c.set(skinC));
    place(hair, i, x, z, yaw, s);
    hair.setColorAt(i, c.set(hairC));

    // frozen mid-stride so a standing crowd still reads as people, not posts
    const stride = (r2 - 0.5) * 0.5;
    for (let k = 0; k < 2; k++) {
      const sgn = k === 0 ? 1 : -1;
      place(legs, i * 2 + k, x, z, yaw, s, sgn * 0.085, 0, stride * sgn);
      legs.setColorAt(i * 2 + k, c.set(legC));
      place(shoes, i * 2 + k, x, z, yaw, s, sgn * 0.085, stride * sgn * 0.35);
      place(arms, i * 2 + k, x, z, yaw, s, sgn * 0.235, 0, -stride * sgn * 0.8);
      arms.setColorAt(i * 2 + k, c.set(r2 > 0.55 ? skinC : shirtC));
    }
  });

  [torso, head, hair, legs, arms, shoes].forEach((m) => {
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    group.add(m);
  });

  return group;
}

// ── Fountain ──────────────────────────────────────────────────────────
/**
 * Tiered stone fountain with live water: a rippling pool, sheets of water
 * spilling off each bowl, a central jet, arcing side jets and airborne spray.
 *
 * Returns { group, update(dt), dispose }.
 */
export function createFountain({ radius = 16, dark = false } = {}) {
  const group = new THREE.Group();
  group.name = "fountain";

  const stone = new THREE.MeshStandardMaterial({
    color: dark ? 0x5c5a54 : 0xb3a894,
    roughness: 0.88,
    metalness: 0.05,
  });
  const stoneDark = new THREE.MeshStandardMaterial({
    color: dark ? 0x413f3b : 0x8b8071,
    roughness: 0.92,
  });
  const waterMat = new THREE.MeshStandardMaterial({
    color: dark ? 0x11445e : 0x2f9fc4,
    roughness: 0.08,
    metalness: 0.55,
    transparent: true,
    opacity: 0.88,
  });
  // falling / jetting water — bright, additive, unlit
  const jetMat = new THREE.MeshBasicMaterial({
    color: 0xdff3ff,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });

  const add = (geo, mat, y = 0, cast = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y;
    m.castShadow = cast;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };

  // ── basin ───────────────────────────────────────────────────────
  add(new THREE.CylinderGeometry(radius, radius * 1.04, 1.1, 40), stone, 0.55);
  // coping ring the water sits behind
  const rim = add(new THREE.TorusGeometry(radius - 0.35, 0.42, 10, 44), stone, 1.35);
  rim.rotation.x = Math.PI / 2;
  add(new THREE.CylinderGeometry(radius - 0.75, radius - 0.75, 0.5, 40), stoneDark, 0.95);

  // pool surface (animated ripples)
  const pool = add(new THREE.CircleGeometry(radius - 0.8, 44), waterMat, 1.16, false);
  pool.rotation.x = -Math.PI / 2;

  const ripples = [];
  for (let i = 0; i < 3; i++) {
    const rg = new THREE.Mesh(
      new THREE.RingGeometry(1, 1.35, 40),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    rg.rotation.x = -Math.PI / 2;
    rg.position.y = 1.19;
    rg.userData.phase = i / 3;
    group.add(rg);
    ripples.push(rg);
  }

  // ── pedestal + two bowls ────────────────────────────────────────
  add(new THREE.CylinderGeometry(2.6, 3.4, 3.2, 20), stone, 2.7);
  // lower bowl
  add(new THREE.CylinderGeometry(7.2, 3.0, 1.5, 28), stone, 5.0);
  add(new THREE.TorusGeometry(7.1, 0.3, 8, 34), stone, 5.7).rotation.x = Math.PI / 2;
  const lowerWater = add(new THREE.CircleGeometry(6.9, 32), waterMat, 5.62, false);
  lowerWater.rotation.x = -Math.PI / 2;

  add(new THREE.CylinderGeometry(1.5, 2.0, 3.0, 16), stone, 7.2);
  // upper bowl
  add(new THREE.CylinderGeometry(4.0, 1.7, 1.2, 24), stone, 9.2);
  add(new THREE.TorusGeometry(3.95, 0.24, 8, 28), stone, 9.75).rotation.x = Math.PI / 2;
  const upperWater = add(new THREE.CircleGeometry(3.8, 28), waterMat, 9.68, false);
  upperWater.rotation.x = -Math.PI / 2;

  // finial the top jet erupts from
  add(new THREE.CylinderGeometry(0.5, 0.9, 1.6, 14), stone, 10.5);

  // ── falling water curtains off each bowl rim ────────────────────
  const curtains = [];
  const makeCurtain = (r, top, drop) => {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r * 0.94, drop, 34, 1, true),
      jetMat.clone()
    );
    m.material.opacity = 0.16;
    m.position.y = top - drop / 2;
    m.userData.bloom = true;
    group.add(m);
    curtains.push(m);
    return m;
  };
  makeCurtain(3.95, 9.7, 3.9); // upper bowl -> lower bowl
  makeCurtain(7.1, 5.65, 4.3); // lower bowl -> pool

  // ── central jet ─────────────────────────────────────────────────
  const jet = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 1.0, 7.5, 16, 1, true),
    jetMat.clone()
  );
  jet.position.y = 11.3 + 3.75;
  jet.userData.bloom = true;
  group.add(jet);

  const jetCap = new THREE.Mesh(new THREE.SphereGeometry(0.75, 14, 10), jetMat.clone());
  jetCap.position.y = 18.8;
  jetCap.userData.bloom = true;
  group.add(jetCap);

  // ── arcing side jets (parabolic tubes into the pool) ────────────
  const arcs = [];
  const ARC_N = 8;
  for (let i = 0; i < ARC_N; i++) {
    const a = (i / ARC_N) * Math.PI * 2;
    const start = new THREE.Vector3(Math.cos(a) * 1.6, 10.9, Math.sin(a) * 1.6);
    const end = new THREE.Vector3(Math.cos(a) * (radius - 4), 1.3, Math.sin(a) * (radius - 4));
    const mid = new THREE.Vector3(
      Math.cos(a) * (radius - 4) * 0.45,
      14.2,
      Math.sin(a) * (radius - 4) * 0.45
    );
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 22, 0.17, 7, false), jetMat.clone());
    tube.material.opacity = 0.42;
    tube.userData.bloom = true;
    tube.userData.phase = i / ARC_N;
    group.add(tube);
    arcs.push(tube);
  }

  // ── airborne spray ──────────────────────────────────────────────
  const SPRAY = 220;
  const sprayPos = new Float32Array(SPRAY * 3);
  const sprayVel = new Float32Array(SPRAY * 3);
  const sprayLife = new Float32Array(SPRAY);
  const resetDrop = (i, stagger = false) => {
    const a = Math.random() * Math.PI * 2;
    const sp = 1.6 + Math.random() * 2.6;
    sprayPos[i * 3] = Math.cos(a) * 0.35;
    sprayPos[i * 3 + 1] = 18.6;
    sprayPos[i * 3 + 2] = Math.sin(a) * 0.35;
    sprayVel[i * 3] = Math.cos(a) * sp;
    sprayVel[i * 3 + 1] = 1.2 + Math.random() * 2.4;
    sprayVel[i * 3 + 2] = Math.sin(a) * sp;
    sprayLife[i] = stagger ? Math.random() * 2.4 : 0;
  };
  for (let i = 0; i < SPRAY; i++) resetDrop(i, true);
  const sprayGeo = new THREE.BufferGeometry();
  sprayGeo.setAttribute("position", new THREE.BufferAttribute(sprayPos, 3));
  const spray = new THREE.Points(
    sprayGeo,
    new THREE.PointsMaterial({
      color: 0xeaf7ff,
      size: 0.42,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    })
  );
  spray.userData.bloom = true;
  group.add(spray);

  let t = 0;
  function update(dt) {
    t += dt;

    // pool + bowl shimmer
    const sh = 0.86 + Math.sin(t * 1.7) * 0.05;
    waterMat.opacity = sh;

    // expanding ripple rings on the pool
    ripples.forEach((rg) => {
      const k = (t * 0.34 + rg.userData.phase) % 1;
      const s = 0.6 + k * (radius - 1.6);
      rg.scale.setScalar(s);
      rg.material.opacity = 0.24 * (1 - k);
    });

    // curtains + jets breathe so the water never looks frozen
    curtains.forEach((c, i) => {
      c.material.opacity = 0.15 + Math.sin(t * 2.4 + i) * 0.05;
      c.rotation.y += dt * (i % 2 ? -0.25 : 0.25);
    });
    jet.material.opacity = 0.34 + Math.sin(t * 3.1) * 0.08;
    jet.scale.set(1 + Math.sin(t * 2.2) * 0.05, 1 + Math.sin(t * 3.4) * 0.05, 1 + Math.sin(t * 2.2) * 0.05);
    jetCap.scale.setScalar(1 + Math.sin(t * 3.4) * 0.16);
    arcs.forEach((aMesh) => {
      aMesh.material.opacity = 0.34 + Math.sin(t * 2.8 + aMesh.userData.phase * 6.28) * 0.12;
    });

    // ballistic spray
    for (let i = 0; i < SPRAY; i++) {
      sprayLife[i] -= dt;
      if (sprayLife[i] > 0) continue;
      sprayVel[i * 3 + 1] -= 9.5 * dt;
      sprayPos[i * 3] += sprayVel[i * 3] * dt;
      sprayPos[i * 3 + 1] += sprayVel[i * 3 + 1] * dt;
      sprayPos[i * 3 + 2] += sprayVel[i * 3 + 2] * dt;
      if (sprayPos[i * 3 + 1] < 1.3) resetDrop(i);
    }
    sprayGeo.attributes.position.needsUpdate = true;
  }

  function dispose() {
    group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }

  return { group, update, dispose, radius };
}


// ── Texture quality helpers ───────────────────────────────────────────
/** Max-quality sampling: full aniso, mipmaps, linear filtering. */
export function finishTex(canvas, { srgb = true, repeat = null } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso.v;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  t.needsUpdate = true;
  return t;
}

/**
 * Derive a tangent-space normal map from an albedo canvas via a Sobel filter
 * on its luminance. Gives ground/asphalt/facades real surface relief without
 * shipping any image files.
 */
export function normalFromCanvas(srcCanvas, strength = 2.4) {
  const w = srcCanvas.width;
  const h = srcCanvas.height;
  const src = srcCanvas.getContext("2d").getImageData(0, 0, w, h).data;
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    lum[i] = (src[i * 4] * 0.299 + src[i * 4 + 1] * 0.587 + src[i * 4 + 2] * 0.114) / 255;
  }
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const dst = out.getContext("2d").createImageData(w, h);
  const at = (x, y) => lum[((y + h) % h) * w + ((x + w) % w)];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const gx =
        at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1) -
        (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1));
      const gy =
        at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1) -
        (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1));
      const nx = gx * strength;
      const ny = gy * strength;
      const len = Math.hypot(nx, ny, 1);
      const i = (y * w + x) * 4;
      dst.data[i] = ((nx / len) * 0.5 + 0.5) * 255;
      dst.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      dst.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      dst.data[i + 3] = 255;
    }
  }
  out.getContext("2d").putImageData(dst, 0, 0);
  const t = new THREE.CanvasTexture(out);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso.v;
  t.needsUpdate = true;
  return t;
}

// ── Ground textures ───────────────────────────────────────────────────
export function grassTexture(dark = false, stripes = true) {
  const S = 1024;
  const cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = dark ? "#1d3d26" : "#4a8536";
  ctx.fillRect(0, 0, S, S);

  // mow stripes first, with HARD edges (a real mown lawn, not a soft wash)
  if (stripes) {
    const band = S / 16;
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = i % 2
        ? (dark ? "#224a2b" : "#4e8b41")
        : (dark ? "#1e4126" : "#487f38");
      ctx.fillRect(0, i * band, S, band);
    }
  }

  // clumps: short directional strokes, not blurry radial blobs
  const clumpTints = dark
    ? ["#16301f", "#28553a", "#1f4529", "#2d5f3a"]
    : ["#3d7230", "#5da245", "#356a2b", "#69ad4d"];
  ctx.lineCap = "round";
  for (let i = 0; i < 26000; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    const len = 3 + Math.random() * 7;
    const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
    ctx.strokeStyle = clumpTints[(Math.random() * clumpTints.length) | 0];
    ctx.globalAlpha = 0.35 + Math.random() * 0.5;
    ctx.lineWidth = 0.8 + Math.random() * 1.3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // a few dry patches + tiny wildflowers for break-up
  for (let i = 0; i < 140; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    ctx.fillStyle = dark ? "rgba(70,80,45,0.25)" : "rgba(150,140,70,0.22)";
    ctx.beginPath();
    ctx.ellipse(x, y, 6 + Math.random() * 18, 4 + Math.random() * 12, Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (!dark) {
    for (let i = 0; i < 220; i++) {
      ctx.fillStyle = ["#e8e2b0", "#f0d9e4", "#fdf6d8"][(Math.random() * 3) | 0];
      ctx.fillRect(Math.random() * S, Math.random() * S, 1.6, 1.6);
    }
  }

  const t = finishTex(cv);
  t.userData = { canvas: cv };
  return t;
}

/** Matching relief for grassTexture(). */
export function grassNormal(tex) {
  return normalFromCanvas(tex.userData.canvas, 1.1);
}

/** Soft round cloud puff on transparent canvas — for drifting sky planes. */
export function cloudTexture(seed = 1) {
  const r = mulberry(seed);
  const cv = document.createElement("canvas");
  cv.width = cv.height = 256;
  const ctx = cv.getContext("2d");
  for (let i = 0; i < 22; i++) {
    const x = 128 + (r() - 0.5) * 150;
    const y = 128 + (r() - 0.5) * 70;
    const rad = 30 + r() * 60;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0, "rgba(255,255,255,0.9)");
    grad.addColorStop(0.6, "rgba(255,255,255,0.35)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function fieldTexture(kind = "soccer") {
  const cv = document.createElement("canvas");
  cv.width = 512;
  cv.height = 320;
  const ctx = cv.getContext("2d");
  if (kind === "soccer") {
    ctx.fillStyle = "#3f8a3a";
    ctx.fillRect(0, 0, 512, 320);
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = i % 2 ? "#41903c" : "#3a8035";
      ctx.fillRect(i * 51, 0, 51, 320);
    }
    ctx.strokeStyle = "#f4f7f4";
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, 480, 288);
    ctx.beginPath();
    ctx.moveTo(256, 16);
    ctx.lineTo(256, 304);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(256, 160, 46, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeRect(16, 90, 70, 140);
    ctx.strokeRect(426, 90, 70, 140);
  } else {
    ctx.fillStyle = "#2e6f4e";
    ctx.fillRect(0, 0, 512, 320);
    ctx.fillStyle = "#c56a3a";
    ctx.fillRect(60, 40, 392, 240);
    ctx.strokeStyle = "#f4f7f4";
    ctx.lineWidth = 4;
    ctx.strokeRect(76, 56, 360, 208);
    ctx.beginPath();
    ctx.moveTo(256, 56);
    ctx.lineTo(256, 264);
    ctx.moveTo(76, 160);
    ctx.lineTo(436, 160);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso.v;
  return t;
}

/**
 * Park walkway surface: a herringbone brick field bounded by cast-concrete
 * kerbs. Drawn at 1024² with hard mortar lines so it stays crisp underfoot.
 */
export function brickPathTexture(dark = false) {
  const S = 1024;
  const cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const ctx = cv.getContext("2d");

  // mortar bed
  ctx.fillStyle = dark ? "#38322c" : "#8c8279";
  ctx.fillRect(0, 0, S, S);

  const brickTones = dark
    ? ["#6b4436", "#5d3a2e", "#77503f", "#523228"]
    : ["#b06a4a", "#a55f42", "#c07a55", "#96543b", "#bb7250"];

  // herringbone: alternating horizontal / vertical pairs
  const BL = 96; // brick length
  const BW = 46; // brick width
  const gap = 5;
  const drawBrick = (x, y, w, h) => {
    ctx.fillStyle = brickTones[(Math.random() * brickTones.length) | 0];
    ctx.fillRect(x, y, w, h);
    // per-brick shading + speckle so no two read identically
    ctx.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.1})`;
    ctx.fillRect(x, y + h - 4, w, 4);
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fillRect(x, y, w, 3);
    for (let k = 0; k < 26; k++) {
      ctx.fillStyle = `rgba(${dark ? 20 : 90},${dark ? 15 : 60},${dark ? 12 : 45},0.12)`;
      ctx.fillRect(x + Math.random() * w, y + Math.random() * h, 2, 2);
    }
  };

  const step = BL + BW + gap * 2;
  for (let y = -step; y < S + step; y += step) {
    for (let x = -step; x < S + step; x += step) {
      drawBrick(x, y, BL, BW);
      drawBrick(x + BL + gap, y, BW, BL);
      drawBrick(x + BL + gap, y + BL + gap, BL, BW);
      drawBrick(x, y + BW + gap, BW, BL);
    }
  }

  // cast-concrete kerb bands down both edges
  const kerb = 74;
  [0, S - kerb].forEach((kx) => {
    ctx.fillStyle = dark ? "#4a4640" : "#c8c2b6";
    ctx.fillRect(kx, 0, kerb, S);
    // expansion joints every 128px
    ctx.fillStyle = dark ? "rgba(0,0,0,0.5)" : "rgba(120,114,104,0.65)";
    for (let y = 0; y < S; y += 128) ctx.fillRect(kx, y, kerb, 3);
    // aggregate speckle
    for (let i = 0; i < 2600; i++) {
      const g = Math.random();
      ctx.fillStyle = `rgba(${dark ? 30 + g * 40 : 150 + g * 70},${dark ? 28 + g * 38 : 146 + g * 66},${dark ? 26 + g * 34 : 138 + g * 60},0.5)`;
      ctx.fillRect(kx + Math.random() * kerb, Math.random() * S, 1.6, 1.6);
    }
    ctx.fillStyle = dark ? "rgba(0,0,0,0.45)" : "rgba(105,99,90,0.55)";
    ctx.fillRect(kx === 0 ? kerb - 3 : kx, 0, 3, S);
  });

  const t = finishTex(cv);
  t.userData = { canvas: cv };
  return t;
}

export function sandTexture() {
  const S = 1024;
  const cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#e3cb9b";
  ctx.fillRect(0, 0, S, S);

  // wind ripples — crisp parallel bands with a slow wave
  for (let y = 0; y < S; y += 5) {
    ctx.strokeStyle = `rgba(196,168,120,${0.16 + Math.random() * 0.14})`;
    ctx.lineWidth = 1 + Math.random();
    ctx.beginPath();
    for (let x = 0; x <= S; x += 16) {
      const yy = y + Math.sin((x / S) * Math.PI * 4 + y * 0.05) * 3;
      x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  // grain
  for (let i = 0; i < 30000; i++) {
    const g = Math.random();
    ctx.fillStyle = g > 0.5
      ? `rgba(255,244,214,${0.1 + Math.random() * 0.3})`
      : `rgba(150,124,82,${0.08 + Math.random() * 0.22})`;
    ctx.fillRect(Math.random() * S, Math.random() * S, 1.4, 1.4);
  }
  // shells / pebbles
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = ["#fffaf0", "#d8c4a0", "#c9b48c"][(Math.random() * 3) | 0];
    ctx.beginPath();
    ctx.ellipse(Math.random() * S, Math.random() * S, 2 + Math.random() * 3, 1.5 + Math.random() * 2, Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  const t = finishTex(cv);
  t.userData = { canvas: cv };
  return t;
}

// ── helpers ───────────────────────────────────────────────────────────
export function mulberry(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashf(a, b) {
  let h = 2166136261 ^ Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const SHARED_MATS = new Set(Object.values(MAT));

export function disposeDeep(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const m = Array.isArray(o.material) ? o.material : [o.material];
      m.forEach((x) => {
        if (SHARED_MATS.has(x)) return; // module-shared, keep alive across rebuilds
        Object.values(x).forEach((v) => {
          if (v && v.isTexture) v.dispose();
        });
        x.dispose();
      });
    }
  });
}
