import { useEffect, useRef } from "react";
import {
  worldBounds,
  DISTRICTS,
  districtRect,
  ocean,
  greenbelt,
  parkRect,
  plazaRect,
  timesSquareRect,
  avenues,
  streets,
  getBlock,
  BLOCK_COLS,
  BLOCK_ROWS,
} from "./three/cityGrid";

/**
 * Canvas minimap rendered straight from the SAME cityGrid the 3D world is
 * built from, plus live engine state. It is not a separate map - every road,
 * block, park, plot and tower you see here exists at those exact coordinates
 * in the city, so the overview and the world can never drift apart.
 *
 * Used by both the map-view overview panel and the in-game HUD radar.
 */
export default function CityMiniMap({
  engine,
  size = 200,
  playerRef = null,
  camYawRef = null,
  showPlots = true,
  showViewport = false,
  className = "",
}) {
  const canvasRef = useRef(null);
  const staticRef = useRef(null); // pre-rendered grid layer

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return undefined;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = size * dpr;
    cv.height = size * dpr;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const b = worldBounds();
    const o = ocean();
    const gb = greenbelt();
    // fit the whole island + a margin of water/greenbelt
    const spanX = (o.shoreX - gb.edgeX) * 1.06;
    const spanZ = (b.cityD + 260) * 1.06;
    const span = Math.max(spanX, spanZ);
    const scale = size / span;
    const cxOff = (o.shoreX + gb.edgeX) / 2;
    const toX = (wx) => size / 2 + (wx - cxOff) * scale;
    const toY = (wz) => size / 2 + wz * scale;

    // ── static layer: water / land / districts / roads / blocks / plots ──
    const buildStatic = () => {
      const s = document.createElement("canvas");
      s.width = size * dpr;
      s.height = size * dpr;
      const g = s.getContext("2d");
      g.setTransform(dpr, 0, 0, dpr, 0, 0);

      g.fillStyle = "#0d2f45";                       // sea
      g.fillRect(0, 0, size, size);
      g.fillStyle = "#2f5c33";                       // greenbelt
      g.fillRect(0, 0, toX(-b.halfW - 40), size);
      g.fillStyle = "#4d5c47";                       // island ground
      g.fillRect(toX(-b.halfW - 60), toY(-b.halfD - 70), (b.cityW + 130) * scale, (b.cityD + 150) * scale);

      // district tints
      DISTRICTS.forEach((d) => {
        const r = districtRect(d);
        g.fillStyle = hexA(d.color, 0.42);
        g.fillRect(toX(r.x0), toY(r.z0), (r.x1 - r.x0) * scale, (r.z1 - r.z0) * scale);
      });

      // park + plaza + times square
      const pk = parkRect();
      g.fillStyle = "#2e7a35";
      g.fillRect(toX(pk.x0), toY(pk.z0), (pk.x1 - pk.x0) * scale, (pk.z1 - pk.z0) * scale);
      const pz = plazaRect();
      g.fillStyle = "#7a7256";
      g.fillRect(toX(pz.x0), toY(pz.z0), (pz.x1 - pz.x0) * scale, (pz.z1 - pz.z0) * scale);
      const ts = timesSquareRect();
      g.fillStyle = "#8d4a4a";
      g.fillRect(toX(ts.x0), toY(ts.z0), (ts.x1 - ts.x0) * scale, (ts.z1 - ts.z0) * scale);

      // roads
      g.strokeStyle = "rgba(232,236,242,0.55)";
      avenues().forEach((a) => {
        g.lineWidth = Math.max(1, a.w * scale * 0.85);
        g.beginPath();
        g.moveTo(toX(a.x), toY(a.z0));
        g.lineTo(toX(a.x), toY(a.z1));
        g.stroke();
      });
      streets().forEach((st) => {
        g.lineWidth = Math.max(0.6, st.w * scale * 0.85);
        g.beginPath();
        g.moveTo(toX(st.x0), toY(st.z));
        g.lineTo(toX(st.x1), toY(st.z));
        g.stroke();
      });

      // block outlines
      g.strokeStyle = "rgba(0,0,0,0.28)";
      g.lineWidth = 0.5;
      for (let bx = 0; bx < BLOCK_COLS; bx++) {
        for (let bz = 0; bz < BLOCK_ROWS; bz++) {
          const blk = getBlock(bx, bz);
          if (!blk.buildable) continue;
          g.strokeRect(toX(blk.x0), toY(blk.z0), blk.w * scale, blk.d * scale);
        }
      }

      // individual plots - the battleground-style parcel grid
      if (showPlots && engine?.fillerSlots) {
        engine.fillerSlots.forEach((sl) => {
          if (!sl) return;
          const w = Math.max(0.9, sl.lot.w * scale);
          const h = Math.max(0.9, sl.lot.d * scale);
          const x = toX(sl.lot.cx) - w / 2;
          const y = toY(sl.lot.cz) - h / 2;
          if (sl.plan?.fill) {
            g.fillStyle = "rgba(226,232,240,0.62)";  // built
            g.fillRect(x, y, w, h);
          } else {
            g.strokeStyle = "rgba(125,255,176,0.5)"; // free to claim
            g.lineWidth = 0.5;
            g.strokeRect(x, y, w, h);
          }
        });
      }
      return s;
    };

    staticRef.current = buildStatic();
    let rebuiltAt = engine?.brandTowersGroup?.children.length ?? -1;

    let raf;
    const draw = () => {
      // rebuild the static layer if the city itself changed
      const n = engine?.brandTowersGroup?.children.length ?? -1;
      if (n !== rebuiltAt) {
        rebuiltAt = n;
        staticRef.current = buildStatic();
      }

      ctx.clearRect(0, 0, size, size);
      if (staticRef.current) ctx.drawImage(staticRef.current, 0, 0, size, size);

      // owned landmarks
      engine?.brandTowersGroup?.children.forEach((t) => {
        const u = t.userData;
        if (!u?.product) return;
        const x = toX(t.position.x);
        const y = toY(t.position.z);
        const r = u.rank === 1 ? 4 : u.rank <= 3 ? 3 : 2.2;
        ctx.beginPath();
        ctx.arc(x, y, r + 1.4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = u.rank === 1 ? "#ffd54a" : u.color || "#fff";
        ctx.fill();
      });

      // billboards (city-wide & Times Square advertising screens)
      engine?.brandBillboardsGroup?.children.forEach((bb) => {
        const bx = toX(bb.position.x);
        const by = toY(bb.position.z);
        const isOccupied = bb.userData?.isOccupied;
        ctx.fillStyle = isOccupied ? "#10b981" : "#38bdf8";
        ctx.beginPath();
        ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.6)";
        ctx.lineWidth = 0.6;
        ctx.stroke();
      });

      // traffic - makes the overview feel alive
      if (engine?.trafficCars) {
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        engine.trafficCars.forEach((c) => ctx.fillRect(toX(c.x) - 0.8, toY(c.z) - 0.8, 1.6, 1.6));
      }

      // player + facing cone
      const pp = playerRef?.current;
      if (pp) {
        const yaw = camYawRef?.current || 0;
        const px = toX(pp.x);
        const py = toY(pp.z);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(-yaw + Math.PI);
        ctx.fillStyle = "rgba(240,90,56,0.28)";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 22, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#F05A38";
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(4.5, 5);
        ctx.lineTo(-4.5, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // map-camera viewport footprint
      if (showViewport && engine?.target) {
        const t = engine.target;
        const r = (engine.spherical?.radius || 2000) * 0.34 * scale;
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 1.2;
        ctx.strokeRect(toX(t.x) - r, toY(t.z) - r, r * 2, r * 2);
      }

      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [engine, size, playerRef, camYawRef, showPlots, showViewport]);

  return (
    <div className={`rounded-2xl overflow-hidden border border-white/15 shadow-lg bg-[#0d2f45] ${className}`}>
      <canvas ref={canvasRef} style={{ width: size, height: size }} className="block" />
    </div>
  );
}

function hexA(hex, a) {
  const n = parseInt(String(hex).replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
