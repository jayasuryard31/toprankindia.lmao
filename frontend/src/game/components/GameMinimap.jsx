import { useEffect, useRef } from "react";
import {
  worldBounds,
  DISTRICTS,
  districtRect,
  ocean,
  parkRect,
} from "../../components/map/three/cityGrid";

const SIZE = 172;

/**
 * Bottom-right radar. Top-down, north-up. Draws districts, park, coastline,
 * ranked landmarks and the player arrow. Reads live transforms from refs on
 * every frame without re-rendering React.
 */
export default function GameMinimap({ engine, playerRef, camYawRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !engine) return;
    const ctx = cv.getContext("2d");
    const b = worldBounds();
    const pad = 10;
    const span = Math.max(b.cityW, b.cityD) * 1.35;
    const scale = (SIZE - pad * 2) / span;
    const toX = (wx) => SIZE / 2 + wx * scale;
    const toY = (wz) => SIZE / 2 + wz * scale;

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, SIZE, SIZE);

      // water backdrop
      ctx.fillStyle = "#0c2f45";
      ctx.fillRect(0, 0, SIZE, SIZE);

      // land
      ctx.fillStyle = "#3a4a3a";
      ctx.fillRect(toX(-b.halfW - 70), toY(-b.halfD - 60), (b.cityW + 140) * scale, (b.cityD + 120) * scale);

      // ocean (east)
      const o = ocean();
      ctx.fillStyle = "#0e3a52";
      ctx.fillRect(toX(o.shoreX), 0, SIZE - toX(o.shoreX), SIZE);

      // districts
      DISTRICTS.forEach((d) => {
        const r = districtRect(d);
        ctx.fillStyle = hexA(d.color, 0.5);
        ctx.fillRect(toX(r.x0), toY(r.z0), (r.x1 - r.x0) * scale, (r.z1 - r.z0) * scale);
      });

      // park
      const p = parkRect();
      ctx.fillStyle = "#2f6b34";
      ctx.fillRect(toX(p.x0), toY(p.z0), (p.x1 - p.x0) * scale, (p.z1 - p.z0) * scale);

      // ranked landmarks
      engine.brandTowersGroup.children.forEach((t) => {
        if (!t.userData?.product) return;
        ctx.fillStyle = t.userData.rank === 1 ? "#ffd54a" : t.userData.color || "#fff";
        ctx.beginPath();
        ctx.arc(toX(t.position.x), toY(t.position.z), t.userData.rank <= 3 ? 3 : 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // player
      const pp = playerRef.current;
      if (pp) {
        const yaw = camYawRef.current || 0;
        const px = toX(pp.x);
        const py = toY(pp.z);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(-yaw + Math.PI);
        ctx.fillStyle = "#F05A38";
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(4.5, 5);
        ctx.lineTo(-4.5, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        // view cone
        ctx.strokeStyle = "rgba(240,90,56,0.4)";
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.arc(px, py, 26, -(-yaw + Math.PI) - 0.5 - Math.PI / 2, -(-yaw + Math.PI) + 0.5 - Math.PI / 2);
        ctx.closePath();
        ctx.stroke();
      }

      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [engine, playerRef, camYawRef]);

  return (
    <div className="rounded-2xl overflow-hidden border border-white/15 shadow-lg bg-black/40 backdrop-blur-md">
      <canvas ref={canvasRef} width={SIZE} height={SIZE} className="block" />
    </div>
  );
}

function hexA(hex, a) {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
