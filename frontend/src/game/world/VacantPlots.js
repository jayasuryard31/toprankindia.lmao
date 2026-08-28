import * as THREE from "three";
import { forEachLot, districtForBlock } from "../../components/map/three/cityGrid";

/**
 * "Available land" dressing for undeveloped lots - chain-link posts + a
 * hoarding sign - so the TopRankIndia marketplace is visible in-world.
 * Everything merges into a handful of meshes; capped for performance.
 */
export function buildVacantPlots(engine, { max = 90 } = {}) {
  const group = new THREE.Group();
  group.name = "vacant-plots";

  const postGeos = [];
  const railGeos = [];
  const signPosts = [];
  const signPanels = [];
  const marks = [];

  const colliders = [];
  let n = 0;
  const solids = engine.getSolids();
  const isSolid = (lot) =>
    solids.some((s) => Math.abs(s.cx - lot.cx) < 2 && Math.abs(s.cz - lot.cz) < 2);

  forEachLot((lot, meta) => {
    if (n >= max) return;
    if (isSolid(lot)) return;
    // bias toward central / downtown lots so the player meets them early
    const dc = Math.hypot(lot.cx, lot.cz);
    if (dc > 900 && Math.random() > 0.25) return;

    const hw = lot.w / 2 - 1;
    const hd = lot.d / 2 - 1;

    // corner + mid posts
    for (let sx = -1; sx <= 1; sx++) {
      for (let sz = -1; sz <= 1; sz++) {
        if (sx === 0 && sz === 0) continue;
        const g = new THREE.BoxGeometry(0.16, 1.5, 0.16);
        g.translate(lot.cx + sx * hw, 0.75, lot.cz + sz * hd);
        postGeos.push(g);
      }
    }
    // rails (top + mid) around the 4 edges
    [
      [0, -hd, hw * 2, 0.06],
      [0, hd, hw * 2, 0.06],
      [-hw, 0, 0.06, hd * 2],
      [hw, 0, 0.06, hd * 2],
    ].forEach(([ox, oz, w, d]) => {
      [1.35, 0.75].forEach((y) => {
        const g = new THREE.BoxGeometry(Math.max(w, 0.06), 0.06, Math.max(d, 0.06));
        g.translate(lot.cx + ox, y, lot.cz + oz);
        railGeos.push(g);
      });
      // One solid collider per fence run. Height matches the TOP RAIL (1.35),
      // not the posts - so a well-timed jump (apex ≈ 1.56m) clears it.
      colliders.push({
        cx: lot.cx + ox,
        cz: lot.cz + oz,
        hw: Math.max(w, 0.3) / 2,
        hd: Math.max(d, 0.3) / 2,
        h: 1.35,
        fence: true,
      });
    });

    // hoarding sign facing the street
    const sp = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 2.4, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x6b6157, roughness: 0.9 })
    );
    sp.position.set(lot.cx - hw + 0.6, 1.2, lot.cz + hd - 0.4);
    signPosts.push(sp);
    colliders.push({ cx: sp.position.x, cz: sp.position.z, hw: 0.25, hd: 0.25, h: 2.4, prop: true });

    const dist = districtForBlock(meta.bx, meta.bz);
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 1.4),
      new THREE.MeshStandardMaterial({ map: signTexture(dist.color, dist.name), roughness: 0.7 })
    );
    panel.position.set(lot.cx - hw + 0.6, 2.4, lot.cz + hd - 0.28);
    signPanels.push(panel);

    // faint ground marker so it reads as a plot from above too
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(lot.w - 2, lot.d - 2),
      new THREE.MeshBasicMaterial({ color: dist.color, transparent: true, opacity: 0.12, depthWrite: false })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(lot.cx, 0.12, lot.cz);
    marks.push(m);

    n++;
  });

  const chainMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.6, metalness: 0.4 });
  if (postGeos.length) group.add(new THREE.Mesh(merge(postGeos), chainMat));
  if (railGeos.length) group.add(new THREE.Mesh(merge(railGeos), chainMat));
  signPosts.forEach((s) => group.add(s));
  signPanels.forEach((s) => group.add(s));
  marks.forEach((s) => group.add(s));

  group.userData.colliders = colliders;
  group.userData.dispose = () => {
    group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((mm) => {
          mm.map?.dispose();
          mm.dispose();
        });
      }
    });
  };
  return group;
}

function merge(geos) {
  // tiny local merge to avoid an import cycle
  let vc = 0;
  const nn = geos.map((g) => (g.index ? g.toNonIndexed() : g));
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
  geos.forEach((g) => g.dispose());
  return out;
}

function signTexture(color, name) {
  const cv = document.createElement("canvas");
  cv.width = 512;
  cv.height = 300;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#f4f1ea";
  ctx.fillRect(0, 0, 512, 300);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 512, 74);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 40px Inter, Arial, sans-serif";
  ctx.fillText("AVAILABLE PLOT", 24, 52);
  ctx.fillStyle = "#2a2a2a";
  ctx.font = "bold 30px Inter, Arial, sans-serif";
  ctx.fillText(name, 24, 130);
  ctx.font = "22px Inter, Arial, sans-serif";
  ctx.fillStyle = "#555";
  ctx.fillText("TopRankPlots · claim to build", 24, 176);
  ctx.fillText("Bigger bid → taller landmark", 24, 212);
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 506, 294);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
