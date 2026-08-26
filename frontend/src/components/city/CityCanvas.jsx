import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  CITY_NAME,
  CITY_SUBTITLE,
  WORLD_BOUNDS,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  getCoastlineX,
  getCityInfrastructure,
  projectPoint,
} from "./cityEngine";
import { generateCityBuildings } from "./buildingGenerator";
import { createTrafficSimulator } from "./trafficSimulator";
import InMapBuildingPopup from "./InMapBuildingPopup";

// Helper: Rounded Rectangle
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// 1. Draw Expansive Velora Harbor Terrain, Mountains, River & Ocean System
function drawEndlessTerrain(ctx, cam, width, height, t, infra) {
  ctx.save();

  const minX = -width / (2 * cam.zoom) - cam.x - 600;
  const maxX = width / (2 * cam.zoom) - cam.x + 600;
  const minY = -height / (2 * cam.zoom) - cam.y - 600;
  const maxY = height / (2 * cam.zoom) - cam.y + 600;

  // A. Base Land Landscape (Warm Natural Earth)
  ctx.fillStyle = "#E8E4DC";
  ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

  // Subtle Topographical Elevation Grid Lines
  ctx.strokeStyle = "rgba(203, 213, 225, 0.4)";
  ctx.lineWidth = 1;
  const gridStep = 180;
  const startGX = Math.floor(minX / gridStep) * gridStep;
  const endGX = Math.ceil(maxX / gridStep) * gridStep;
  const startGY = Math.floor(minY / gridStep) * gridStep;
  const endGY = Math.ceil(maxY / gridStep) * gridStep;

  ctx.beginPath();
  for (let gx = startGX; gx <= endGX; gx += gridStep) {
    if (gx < 1050) {
      const p1 = projectPoint(gx, minY, 0, t);
      const p2 = projectPoint(gx, maxY, 0, t);
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    }
  }
  for (let gy = startGY; gy <= endGY; gy += gridStep) {
    const cX = getCoastlineX(gy);
    const p1 = projectPoint(minX, gy, 0, t);
    const p2 = projectPoint(cX, gy, 0, t);
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
  }
  ctx.stroke();

  // B. Elevated Mountain Ridges & Highland Hills (West Sector)
  if (infra.mountainRidges) {
    infra.mountainRidges.forEach((m) => {
      const base = projectPoint(m.x, m.y, 0, t);

      // Layer 1: Base Highland Foothill Plateau (Lush Greenery)
      ctx.fillStyle = "rgba(209, 250, 229, 0.6)";
      ctx.beginPath();
      ctx.ellipse(base.x, base.y, m.radiusX, m.radiusY, 0, 0, Math.PI * 2);
      ctx.fill();

      // Layer 2: Elevated Mountain Ridge
      const topElevation = (m.elevation * 30) * t;
      const topP = projectPoint(m.x, m.y, topElevation, t);

      if (t > 0.05) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
        ctx.beginPath();
        ctx.ellipse(base.x + 12 * t, base.y + 10 * t, m.radiusX * 0.75, m.radiusY * 0.75, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "#D1D5DB";
      ctx.beginPath();
      ctx.ellipse(topP.x, topP.y, m.radiusX * 0.72, m.radiusY * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();

      // Layer 3: High Peak Crest
      ctx.fillStyle = "#E5E7EB";
      ctx.beginPath();
      ctx.ellipse(topP.x - 20 * t, topP.y - 20 * t, m.radiusX * 0.45, m.radiusY * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      // Highland Topographic Label
      ctx.fillStyle = "rgba(100, 116, 139, 0.65)";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(m.label, topP.x, topP.y);
    });
  }

  // C. Natural Velora Meandering River & Riverbanks
  if (infra.naturalRiver && infra.naturalRiver.length > 1) {
    const pts = infra.naturalRiver.map((p) => projectPoint(p.x, p.y, 0, t));

    // River Sandy Banks
    ctx.strokeStyle = "#FDE68A";
    ctx.lineWidth = 42;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();

    // River Shallow Turquoise Bed
    ctx.strokeStyle = "#7DD3FC";
    ctx.lineWidth = 30;
    ctx.stroke();

    // River Flowing Water
    ctx.strokeStyle = "#0284C7";
    ctx.lineWidth = 22;
    ctx.stroke();
  }

  // D. Organic Coastline & Multi-Tone Vast Ocean (East)
  ctx.beginPath();
  const startY = Math.floor(minY / 40) * 40;
  const endY = Math.ceil(maxY / 40) * 40;

  const startPt = projectPoint(getCoastlineX(startY), startY, 0, t);
  ctx.moveTo(startPt.x, startPt.y);

  for (let y = startY; y <= endY; y += 25) {
    const cx = getCoastlineX(y);
    const pt = projectPoint(cx, y, 0, t);
    ctx.lineTo(pt.x, pt.y);
  }

  const pFarBottom = projectPoint(maxX + 800, maxY + 800, 0, t);
  const pFarTop = projectPoint(maxX + 800, minY - 800, 0, t);
  ctx.lineTo(pFarBottom.x, pFarBottom.y);
  ctx.lineTo(pFarTop.x, pFarTop.y);
  ctx.closePath();

  // Multi-Tier Ocean Depth Gradient
  const oceanGrad = ctx.createLinearGradient(1000, minY, maxX + 600, maxY);
  oceanGrad.addColorStop(0, "#38BDF8");    // Turquoise Coast Lagoon
  oceanGrad.addColorStop(0.35, "#0284C7"); // Mid-depth Azure Bay
  oceanGrad.addColorStop(0.75, "#0369A1"); // Deep Cobalt Sea
  oceanGrad.addColorStop(1, "#082F49");    // Abyssal Navy Ocean
  ctx.fillStyle = oceanGrad;
  ctx.fill();

  // E. Sandy Beach Shoreline Buffer
  ctx.strokeStyle = "#FDE68A";
  ctx.lineWidth = 30;
  ctx.beginPath();
  for (let y = startY; y <= endY; y += 25) {
    const cx = getCoastlineX(y);
    const pt = projectPoint(cx, y, 0, t);
    if (y === startY) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  }
  ctx.stroke();

  // F. Ocean Foam White Surf Edge
  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  for (let y = startY; y <= endY; y += 25) {
    const cx = getCoastlineX(y) + 12;
    const pt = projectPoint(cx, y, 0, t);
    if (y === startY) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  }
  ctx.stroke();

  // G. Ocean Water Ripples & Wake
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  for (let y = startY + 40; y < endY; y += 80) {
    const cx = getCoastlineX(y) + 90;
    const pt = projectPoint(cx, y, 0, t);
    ctx.fillRect(pt.x, pt.y, 50, 2.5);
    ctx.fillRect(pt.x + 100, pt.y + 35, 40, 2.5);
  }

  // H. Fictional City Ocean Bay Watermark & Identity
  const hPt = projectPoint(1380, 680, 0, t);
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(CITY_NAME, hPt.x, hPt.y);
  ctx.font = "bold 9px sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
  ctx.fillText(CITY_SUBTITLE, hPt.x, hPt.y + 18);
  ctx.font = "26px sans-serif";
  ctx.fillText("⚓", hPt.x, hPt.y - 32);

  ctx.restore();
}

// 2. Draw Road Infrastructure, Bridges & Coastal Scenic Expressway
function drawRoads(ctx, infra, t) {
  ctx.save();

  const { coastalHighway, avenues, boulevards, roundabouts, riverBridges, harborPiers } = infra;

  // A. Harbor Marina Piers
  if (harborPiers) {
    harborPiers.forEach((pier) => {
      const pt = projectPoint(pier.x, pier.y, 0, t);
      ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
      roundRect(ctx, pt.x, pt.y + 4, pier.w, pier.h, 4);
      ctx.fill();
      ctx.fillStyle = "#94A3B8";
      roundRect(ctx, pt.x, pt.y, pier.w, pier.h, 4);
      ctx.fill();
      ctx.fillStyle = "#CBD5E1";
      roundRect(ctx, pt.x + 2, pt.y + 2, pier.w - 4, pier.h - 4, 3);
      ctx.fill();
    });
  }

  // B. Coastal Scenic Expressway
  if (coastalHighway && coastalHighway.length > 1) {
    const pts = coastalHighway.map((p) => projectPoint(p.x, p.y, 0, t));

    ctx.strokeStyle = "#CBD5E1";
    ctx.lineWidth = 54;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();

    ctx.strokeStyle = "#FDE68A";
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 44;
    ctx.stroke();

    ctx.strokeStyle = "#FCD34D";
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 10]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // C. East-West Primary Avenues
  if (avenues) {
    avenues.forEach((ave) => {
      const coastX = getCoastlineX(ave.y) - 80;
      const p1 = projectPoint(-1700, ave.y, 0, t);
      const p2 = projectPoint(coastX, ave.y, 0, t);

      ctx.strokeStyle = "#CBD5E1";
      ctx.lineWidth = ave.width + 12;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      ctx.strokeStyle = "#334155";
      ctx.lineWidth = ave.width;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      ctx.strokeStyle = ave.isGrand ? "#FCD34D" : "#FFFFFF";
      ctx.lineWidth = ave.isGrand ? 2.5 : 2;
      ctx.setLineDash(ave.isGrand ? [] : [12, 10]);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }

  // D. North-South Primary Boulevards
  if (boulevards) {
    boulevards.forEach((blvd) => {
      const p1 = projectPoint(blvd.x, -1300, 0, t);
      const p2 = projectPoint(blvd.x, 2300, 0, t);

      ctx.strokeStyle = "#CBD5E1";
      ctx.lineWidth = blvd.width + 12;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      ctx.strokeStyle = "#334155";
      ctx.lineWidth = blvd.width;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      ctx.strokeStyle = blvd.isGrand ? "#FCD34D" : "#FFFFFF";
      ctx.lineWidth = blvd.isGrand ? 2.5 : 2;
      ctx.setLineDash(blvd.isGrand ? [] : [12, 10]);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }

  // E. Circular Roundabouts
  if (roundabouts) {
    roundabouts.forEach((rb) => {
      const pt = projectPoint(rb.x, rb.y, 0, t);
      ctx.fillStyle = "#334155";
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, rb.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#10B981";
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, rb.radius - 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#CBD5E1";
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, rb.innerRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#0284C7";
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, rb.innerRadius - 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // F. River Bridges
  if (riverBridges) {
    riverBridges.forEach((br) => {
      const pt = projectPoint(br.x, br.y, 0, t);
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fillRect(pt.x - br.w / 2 + 4, pt.y - br.h / 2 + 4, br.w, br.h);

      ctx.fillStyle = "#475569";
      roundRect(ctx, pt.x - br.w / 2, pt.y - br.h / 2, br.w, br.h, 4);
      ctx.fill();

      ctx.fillStyle = "#94A3B8";
      ctx.fillRect(pt.x - br.w / 2, pt.y - br.h / 2, 4, br.h);
      ctx.fillRect(pt.x + br.w / 2 - 4, pt.y - br.h / 2, 4, br.h);

      if (br.type === "suspension") {
        ctx.strokeStyle = "#E2E8F0";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pt.x - br.w / 2, pt.y - br.h / 2);
        ctx.lineTo(pt.x, pt.y - br.h / 2 - 12 * t);
        ctx.lineTo(pt.x + br.w / 2, pt.y - br.h / 2);
        ctx.stroke();
      }
    });
  }

  ctx.restore();
}

// 3. Draw Central Crown Fountain Plaza
function drawPlaza(ctx, plaza, t) {
  if (!plaza) return;
  ctx.save();
  const pt = projectPoint(plaza.x, plaza.y, 0, t);

  ctx.fillStyle = "#CBD5E1";
  ctx.beginPath();
  ctx.arc(pt.x, pt.y, plaza.radius, 0, Math.PI * 2);
  ctx.fill();

  const waterGrad = ctx.createRadialGradient(pt.x, pt.y, 2, pt.x, pt.y, plaza.innerRadius);
  waterGrad.addColorStop(0, "#E0F2FE");
  waterGrad.addColorStop(0.7, "#38BDF8");
  waterGrad.addColorStop(1, "#0284C7");
  ctx.fillStyle = waterGrad;
  ctx.beginPath();
  ctx.arc(pt.x, pt.y, plaza.innerRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// 4. Draw Trees, Jungle Canopy, Boats & Vehicles
function drawTrees(ctx, trees, t) {
  if (!trees) return;
  ctx.save();
  trees.forEach((tr) => {
    const pt = projectPoint(tr.x, tr.y, 0, t);
    if (tr.type === "palm") {
      ctx.fillStyle = "#10B981";
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, tr.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#047857";
      ctx.beginPath();
      ctx.arc(pt.x - 1, pt.y - 1, tr.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (tr.type === "jungle") {
      ctx.fillStyle = "rgba(4, 120, 87, 0.85)";
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, tr.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(16, 185, 129, 0.9)";
      ctx.beginPath();
      ctx.arc(pt.x - 3, pt.y - 3, tr.r * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#34D399";
      ctx.beginPath();
      ctx.arc(pt.x - 5, pt.y - 5, tr.r * 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#22C55E";
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, tr.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#15803D";
      ctx.beginPath();
      ctx.arc(pt.x - 1, pt.y - 1, tr.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.restore();
}

function drawBoats(ctx, boats, t) {
  if (!boats) return;
  ctx.save();
  boats.forEach((b) => {
    const pt = projectPoint(b.x, b.y, 0, t);
    ctx.save();
    ctx.translate(pt.x, pt.y);
    ctx.rotate(b.angle);
    ctx.fillStyle = "#FFFFFF";
    roundRect(ctx, -b.size / 2, -b.size / 4, b.size, b.size / 2, 4);
    ctx.fill();
    ctx.fillStyle = "#0284C7";
    roundRect(ctx, -b.size / 4, -b.size / 6, b.size / 2, b.size / 3, 2);
    ctx.fill();
    ctx.restore();
  });
  ctx.restore();
}

function drawVehicles(ctx, vehicles, t) {
  if (!vehicles) return;
  ctx.save();
  vehicles.forEach((v) => {
    const pt = projectPoint(v.x, v.y, 0, t);
    ctx.save();
    ctx.translate(pt.x, pt.y);
    ctx.rotate(v.angle);
    ctx.fillStyle = v.color;
    roundRect(ctx, -v.width / 2, -v.height / 2, v.width, v.height, 3);
    ctx.fill();
    ctx.restore();
  });
  ctx.restore();
}

// 5. Draw Designated Land Plots for Actual Products
function drawPlotParcels(ctx, buildings, selected, hovered, t) {
  buildings.forEach((b) => {
    if (b.isFilteredOut) return;

    const isHovered = hovered?.id === b.id;
    const isSelected = selected?.id === b.id;

    ctx.save();

    const base = projectPoint(b.x, b.y, 0, t);
    const lotW = b.lotW;
    const lotH = b.lotH;

    // Foundation Curb
    ctx.fillStyle = "#CBD5E1";
    roundRect(ctx, base.x - lotW / 2, base.y - lotH / 2, lotW, lotH, 12);
    ctx.fill();

    // Turf Lawn
    ctx.fillStyle = b.rank === 1 ? "#FEF3C7" : b.isTop20 ? "#DCFCE7" : "#E2F6E9";
    roundRect(ctx, base.x - lotW / 2 + 3, base.y - lotH / 2 + 3, lotW - 6, lotH - 6, 9);
    ctx.fill();

    // Outline
    ctx.strokeStyle = isSelected ? "#F05A38" : isHovered ? b.theme.primary : "#94A3B8";
    ctx.lineWidth = isSelected ? 2.5 : isHovered ? 2 : 1;
    roundRect(ctx, base.x - lotW / 2, base.y - lotH / 2, lotW, lotH, 12);
    ctx.stroke();

    ctx.restore();
  });
}

// 6. Draw Database Product Buildings in Top-Angle View
function drawBuildings(ctx, buildings, selected, hovered, t) {
  // Sort back-to-front by Y depth
  const sorted = [...buildings].sort((a, b) => a.y - b.y);

  sorted.forEach((b) => {
    if (b.isFilteredOut) return;

    const isHovered = hovered?.id === b.id;
    const isSelected = selected?.id === b.id;

    const effHeight = (b.height3D || 42) * t;
    const base = projectPoint(b.x, b.y, 0, t);
    const top = projectPoint(b.x, b.y, effHeight, t);

    const w = b.w;
    const d = b.h;

    ctx.save();

    // A. 3D Top-Angle Extruded Skyscraper Facades
    if (t > 0.02 && effHeight > 2) {
      // Ground Shadow
      ctx.fillStyle = isSelected ? "rgba(240, 90, 56, 0.45)" : "rgba(0, 0, 0, 0.28)";
      ctx.beginPath();
      ctx.ellipse(base.x + 8 * t, base.y + 8 * t, w * 0.65, d * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      // South Front Facade
      ctx.fillStyle = isSelected ? "#FDBA74" : isHovered ? "#E2E8F0" : b.rank === 1 ? "#7DD3FC" : b.isTop20 ? "#CBD5E1" : "#94A3B8";
      ctx.fillRect(top.x - w / 2, top.y + d / 2, w, base.y - top.y);

      // Left Side Facade Shadow
      ctx.fillStyle = isSelected ? "#FB923C" : isHovered ? "#94A3B8" : b.rank === 1 ? "#0284C7" : b.isTop20 ? "#64748B" : "#475569";
      ctx.fillRect(top.x - w / 2, top.y - d / 2, 4, base.y - top.y + d);

      // Lit Window Panels
      if (effHeight > 24) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        for (let f = 10; f < effHeight - 6; f += 14) {
          const rowY = top.y + d / 2 + f;
          if (rowY < base.y) {
            ctx.fillRect(top.x - w / 2 + 8, rowY, w - 16, 5);
          }
        }
      }
    }

    // B. Rooftop Deck
    ctx.fillStyle = "#334155";
    roundRect(ctx, top.x - w / 2, top.y - d / 2, w, d, 10);
    ctx.fill();

    ctx.fillStyle = b.theme.primary;
    roundRect(ctx, top.x - w / 2 + 2.5, top.y - d / 2 + 2.5, w - 5, d - 5, 8);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    roundRect(ctx, top.x - w / 2 + 6, top.y - d / 2 + 6, w - 12, d - 12, 6);
    ctx.fill();

    // Product Title
    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const displayName = b.websiteName.length > 9 ? b.websiteName.slice(0, 9) + "…" : b.websiteName;
    ctx.fillText(displayName, top.x, top.y - 6);

    // Spend Amount
    ctx.fillStyle = b.theme.accent;
    ctx.font = "bold 11px monospace";
    ctx.fillText(`₹${b.currentAmount.toLocaleString("en-IN")}`, top.x, top.y + 10);

    // Rank Number Pin Badge
    const pinX = top.x - w / 2 + 3;
    const pinY = top.y - d / 2 + 3;
    ctx.fillStyle = b.theme.pin;
    ctx.beginPath();
    ctx.arc(pinX, pinY, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 10px sans-serif";
    ctx.fillText(String(b.rank), pinX, pinY);

    // Golden Crown atop #1
    if (b.theme.crown) {
      ctx.font = "26px sans-serif";
      ctx.fillText("👑", top.x, top.y - d / 2 - 14);
    }

    // Spire on #1 in 3D
    if (b.rank === 1 && t > 0.05) {
      const spireTop = projectPoint(b.x, b.y, effHeight + 45 * t, t);
      ctx.strokeStyle = "#F59E0B";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(top.x, top.y - d / 2);
      ctx.lineTo(spireTop.x, spireTop.y);
      ctx.stroke();

      ctx.fillStyle = "#EF4444";
      ctx.beginPath();
      ctx.arc(spireTop.x, spireTop.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // C. Floating 3D Pill Badge in Top-Angle View
    if (t > 0.1) {
      const badgeY = top.y - (b.rank === 1 ? 54 : b.isTop20 ? 28 : 22);
      const badgeText = `#${b.rank} ${b.websiteName} · ₹${b.currentAmount.toLocaleString("en-IN")}`;
      ctx.font = "bold 10px sans-serif";
      const textWidth = ctx.measureText(badgeText).width;
      const badgeW = textWidth + 24;
      const badgeH = 22;

      ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;

      ctx.fillStyle = b.theme.pin || "#64748B";
      roundRect(ctx, top.x - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 11);
      ctx.fill();

      ctx.shadowColor = "transparent";

      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, top.x - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 11);
      ctx.stroke();

      ctx.fillStyle = b.theme.pin || "#64748B";
      ctx.beginPath();
      ctx.moveTo(top.x - 5, badgeY + badgeH / 2);
      ctx.lineTo(top.x, badgeY + badgeH / 2 + 5);
      ctx.lineTo(top.x + 5, badgeY + badgeH / 2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 10px sans-serif";
      ctx.fillText(badgeText, top.x, badgeY);
    }

    ctx.restore();
  });
}

export default function CityCanvas({
  products = [],
  activeCategoryId = null,
  selectedProduct = null,
  onSelectBuilding,
  focusedBuildingId = null,
  onClearFocus,
  viewMode = "2D",
  onToggleViewMode,
  onOutbidSuccess,
}) {
  const canvasRef = useRef(null);
  const minimapCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const initializedRef = useRef(false);

  // Animated 2D <-> 3D Top-Angle Transition
  const transitionRef = useRef({
    current: viewMode === "3D" ? 1.0 : 0.0,
    target: viewMode === "3D" ? 1.0 : 0.0,
  });

  useEffect(() => {
    transitionRef.current.target = viewMode === "3D" ? 1.0 : 0.0;
  }, [viewMode]);

  // Camera State
  const cameraRef = useRef({
    x: -380,
    y: -530,
    zoom: 0.95,
    targetX: -380,
    targetY: -530,
    targetZoom: 0.95,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    hasMoved: false,
  });

  const [hoveredBuilding, setHoveredBuilding] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [popupScreenPos, setPopupScreenPos] = useState(null);
  const [showMinimap, setShowMinimap] = useState(true);

  const infraRef = useRef(getCityInfrastructure());
  const trafficRef = useRef(createTrafficSimulator());

  const buildings = useMemo(() => {
    return generateCityBuildings(products, activeCategoryId);
  }, [products, activeCategoryId]);

  const buildingsRef = useRef(buildings);

  const selectedBuilding = useMemo(() => {
    if (!selectedProduct) return null;
    return buildings.find((b) => b.id === selectedProduct.id || b.product?.id === selectedProduct.id) || null;
  }, [buildings, selectedProduct]);

  const selectedBuildingRef = useRef(selectedBuilding);

  useEffect(() => {
    buildingsRef.current = buildings;
    selectedBuildingRef.current = selectedBuilding;

    if (buildings.length > 0 && !initializedRef.current) {
      const top1 = buildings.find((b) => b.rank === 1) || buildings[0];
      if (top1) {
        cameraRef.current.x = -top1.x;
        cameraRef.current.y = -top1.y;
        cameraRef.current.targetX = -top1.x;
        cameraRef.current.targetY = -top1.y;
        cameraRef.current.zoom = 0.95;
        cameraRef.current.targetZoom = 0.95;
        initializedRef.current = true;
      }
    }
  }, [buildings, selectedBuilding]);

  useEffect(() => {
    if (!focusedBuildingId) return;
    const targetBuilding = buildingsRef.current.find((b) => b.id === focusedBuildingId);
    if (targetBuilding) {
      const t = transitionRef.current.current;
      const proj = projectPoint(targetBuilding.x, targetBuilding.y, 0, t);
      cameraRef.current.targetX = -proj.x;
      cameraRef.current.targetY = -proj.y;
      cameraRef.current.targetZoom = 1.15;
      if (onClearFocus) onClearFocus();
    }
  }, [focusedBuildingId, onClearFocus]);

  const flyToBuilding = useCallback((building) => {
    if (!building) return;
    const t = transitionRef.current.current;
    const proj = projectPoint(building.x, building.y, 0, t);
    cameraRef.current.targetX = -proj.x;
    cameraRef.current.targetY = -proj.y;
    cameraRef.current.targetZoom = 1.15;
  }, []);

  // Main 60 FPS Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      const cam = cameraRef.current;
      cam.x += (cam.targetX - cam.x) * 0.09;
      cam.y += (cam.targetY - cam.y) * 0.09;
      cam.zoom += (cam.targetZoom - cam.zoom) * 0.09;

      const trans = transitionRef.current;
      trans.current += (trans.target - trans.current) * 0.08;
      const t = Math.max(0, Math.min(1, trans.current));

      trafficRef.current.update();

      // Compute live projected screen coordinates of the selected building for the In-Map 3D Popup
      if (selectedBuildingRef.current) {
        const b = selectedBuildingRef.current;
        const effH = (b.height3D || 42) * t;
        const top = projectPoint(b.x, b.y, effH, t);
        const sx = width / 2 + (cam.x + top.x) * cam.zoom;
        const sy = height / 2 + (cam.y + top.y) * cam.zoom;
        setPopupScreenPos((prev) => {
          if (!prev || Math.abs(prev.x - sx) > 0.5 || Math.abs(prev.y - sy) > 0.5) {
            return { x: sx, y: sy };
          }
          return prev;
        });
      } else {
        setPopupScreenPos((prev) => (prev ? null : prev));
      }

      ctx.save();
      ctx.clearRect(0, 0, width, height);

      // Transform into Unified World Space
      ctx.translate(width / 2 + cam.x * cam.zoom, height / 2 + cam.y * cam.zoom);
      ctx.scale(cam.zoom, cam.zoom);

      // 1. Draw Expansive Velora Harbor Terrain, Mountains, River & Ocean System
      drawEndlessTerrain(ctx, cam, width, height, t, infraRef.current);

      // 2. Draw Road Infrastructure, Bridges & Coastal Expressway
      drawRoads(ctx, infraRef.current, t);

      // 3. Central Fountain Plaza
      drawPlaza(ctx, infraRef.current.centralPlaza, t);

      // 4. Natural Jungle Canopy, Trees, Boats, Vehicles
      drawTrees(ctx, infraRef.current.trees, t);
      drawBoats(ctx, infraRef.current.oceanBoats, t);
      drawVehicles(ctx, trafficRef.current.getVehicles(), t);

      // 5. Draw Designated Land Plots for Actual Products
      drawPlotParcels(ctx, buildingsRef.current, selectedProduct, hoveredBuilding, t);

      // 6. Draw Database Product Buildings in Top-Angle Perspective
      drawBuildings(ctx, buildingsRef.current, selectedProduct, hoveredBuilding, t);

      ctx.restore();

      // Render Synchronized Minimap
      const miniCanvas = minimapCanvasRef.current;
      if (miniCanvas) {
        const miniCtx = miniCanvas.getContext("2d");
        const mw = miniCanvas.width;
        const mh = miniCanvas.height;

        miniCtx.clearRect(0, 0, mw, mh);

        // Minimap Land
        miniCtx.fillStyle = "#E8E4DC";
        miniCtx.fillRect(0, 0, mw, mh);

        // Minimap Ocean
        miniCtx.beginPath();
        const startMiniY = WORLD_BOUNDS.minY;
        const endMiniY = WORLD_BOUNDS.maxY;
        const startCoastX = getCoastlineX(startMiniY);
        miniCtx.moveTo(((startCoastX - WORLD_BOUNDS.minX) / WORLD_WIDTH) * mw, 0);

        for (let y = startMiniY; y <= endMiniY; y += 80) {
          const cx = getCoastlineX(y);
          const px = ((cx - WORLD_BOUNDS.minX) / WORLD_WIDTH) * mw;
          const py = ((y - WORLD_BOUNDS.minY) / WORLD_HEIGHT) * mh;
          miniCtx.lineTo(px, py);
        }
        miniCtx.lineTo(mw, mh);
        miniCtx.lineTo(mw, 0);
        miniCtx.closePath();
        miniCtx.fillStyle = "#0284C7";
        miniCtx.fill();

        // Minimap Roads
        miniCtx.strokeStyle = "#94A3B8";
        miniCtx.lineWidth = 1.2;
        [-850, -520, -120, 300, 720, 1140, 1680, 2050].forEach((aveY) => {
          const py = ((aveY - WORLD_BOUNDS.minY) / WORLD_HEIGHT) * mh;
          miniCtx.beginPath();
          miniCtx.moveTo(0, py);
          miniCtx.lineTo(((getCoastlineX(aveY) - 80 - WORLD_BOUNDS.minX) / WORLD_WIDTH) * mw, py);
          miniCtx.stroke();
        });
        [-1150, -680, -280, 180, 580, 920].forEach((blvdX) => {
          const px = ((blvdX - WORLD_BOUNDS.minX) / WORLD_WIDTH) * mw;
          miniCtx.beginPath();
          miniCtx.moveTo(px, 0);
          miniCtx.lineTo(px, mh);
          miniCtx.stroke();
        });

        // Minimap Database Product Building Dots
        buildingsRef.current.forEach((b) => {
          if (b.isFilteredOut) return;
          const px = ((b.x - WORLD_BOUNDS.minX) / WORLD_WIDTH) * mw;
          const py = ((b.y - WORLD_BOUNDS.minY) / WORLD_HEIGHT) * mh;
          miniCtx.fillStyle = b.rank === 1 ? "#F59E0B" : b.theme.pin;
          miniCtx.beginPath();
          miniCtx.arc(px, py, b.rank === 1 ? 3.5 : 2.2, 0, Math.PI * 2);
          miniCtx.fill();
        });

        // Minimap Dynamic Viewport Frustum Box
        const viewLeft = -cam.x - (width / 2) / cam.zoom;
        const viewRight = -cam.x + (width / 2) / cam.zoom;
        const viewTop = -cam.y - (height / 2) / cam.zoom;
        const viewBottom = -cam.y + (height / 2) / cam.zoom;

        const boxX = ((viewLeft - WORLD_BOUNDS.minX) / WORLD_WIDTH) * mw;
        const boxY = ((viewTop - WORLD_BOUNDS.minY) / WORLD_HEIGHT) * mh;
        const boxW = ((viewRight - viewLeft) / WORLD_WIDTH) * mw;
        const boxH = ((viewBottom - viewTop) / WORLD_HEIGHT) * mh;

        miniCtx.fillStyle = "rgba(240, 90, 56, 0.15)";
        miniCtx.fillRect(boxX, boxY, boxW, boxH);

        miniCtx.strokeStyle = "#F05A38";
        miniCtx.lineWidth = 1.5;
        miniCtx.strokeRect(boxX, boxY, boxW, boxH);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [selectedProduct, hoveredBuilding]);

  // Mouse & Touch Controls
  const handleMouseDown = (e) => {
    cameraRef.current.isDragging = true;
    cameraRef.current.lastMouseX = e.clientX;
    cameraRef.current.lastMouseY = e.clientY;
    cameraRef.current.hasMoved = false;
  };

  const handleMouseMove = (e) => {
    const cam = cameraRef.current;
    if (cam.isDragging) {
      const dx = (e.clientX - cam.lastMouseX) / cam.zoom;
      const dy = (e.clientY - cam.lastMouseY) / cam.zoom;
      cam.targetX += dx;
      cam.targetY += dy;
      cam.lastMouseX = e.clientX;
      cam.lastMouseY = e.clientY;
      cam.hasMoved = true;
    } else {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - rect.width / 2;
      const mouseY = e.clientY - rect.top - rect.height / 2;

      const worldX = mouseX / cam.zoom - cam.x;
      const worldY = mouseY / cam.zoom - cam.y;

      const t = transitionRef.current.current;

      let found = null;
      for (const b of buildingsRef.current) {
        if (b.isFilteredOut) continue;
        const effHeight = (b.height3D || 42) * t;
        const top = projectPoint(b.x, b.y, effHeight, t);

        const w = b.w;
        const d = b.h;

        if (
          worldX >= top.x - w / 2 &&
          worldX <= top.x + w / 2 &&
          worldY >= top.y - d / 2 &&
          worldY <= (t > 0.05 ? b.y + d / 2 : top.y + d / 2)
        ) {
          found = b;
          break;
        }
      }

      if (found !== hoveredBuilding) {
        setHoveredBuilding(found);
      }
      setTooltipPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    const cam = cameraRef.current;
    if (!cam.hasMoved && hoveredBuilding) {
      if (onSelectBuilding) {
        onSelectBuilding(hoveredBuilding.product);
      }
      flyToBuilding(hoveredBuilding);
    }
    cam.isDragging = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.25, Math.min(2.8, cameraRef.current.targetZoom * zoomFactor));
    cameraRef.current.targetZoom = newZoom;
  };

  // Interactive Minimap Click & Drag
  const handleMinimapInteraction = (e) => {
    const miniCanvas = minimapCanvasRef.current;
    if (!miniCanvas) return;
    const rect = miniCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const worldX = WORLD_BOUNDS.minX + (mx / rect.width) * WORLD_WIDTH;
    const worldY = WORLD_BOUNDS.minY + (my / rect.height) * WORLD_HEIGHT;

    const t = transitionRef.current.current;
    const proj = projectPoint(worldX, worldY, 0, t);

    cameraRef.current.targetX = -proj.x;
    cameraRef.current.targetY = -proj.y;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[600px] overflow-hidden select-none cursor-grab active:cursor-grabbing bg-[#FAF8F5] dark:bg-[#110F0D]"
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full block"
      />

      {/* Floating In-Map 3D Pop-Up Card (Directly Attached above Selected Building) */}
      {selectedBuilding && popupScreenPos && (
        <InMapBuildingPopup
          building={selectedBuilding}
          screenPos={popupScreenPos}
          onClose={() => {
            if (onSelectBuilding) onSelectBuilding(null);
          }}
          onOutbidSuccess={onOutbidSuccess}
        />
      )}

      {/* Floating MAP VIEWER Mini-Map Widget */}
      {showMinimap && (
        <div className="absolute top-20 left-4 md:left-[315px] lg:left-[325px] z-20 w-56 p-2.5 rounded-2xl glass-panel shadow-feather-lg border border-border/80 hidden sm:block animate-in fade-in duration-200 pointer-events-auto">
          <div className="flex items-center justify-between px-1 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse" />
              {CITY_NAME} MAP
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={onToggleViewMode}
                className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-coral/10 text-coral hover:bg-coral/20 cursor-pointer transition-colors"
              >
                {viewMode === "2D" ? "3D TOP" : "2D"}
              </button>
              <button
                onClick={() => setShowMinimap(false)}
                className="text-muted hover:text-coral cursor-pointer text-xs"
                title="Hide minimap"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Synchronized Minimap Canvas */}
          <div
            onClick={handleMinimapInteraction}
            onMouseMove={(e) => {
              if (e.buttons === 1) handleMinimapInteraction(e);
            }}
            className="relative w-full h-28 rounded-xl bg-slate-200/80 dark:bg-slate-800/80 overflow-hidden border border-border/60 cursor-crosshair shadow-inner"
          >
            <canvas
              ref={minimapCanvasRef}
              width={220}
              height={112}
              className="w-full h-full block"
            />
          </div>

          <div className="flex items-center justify-between gap-1 mt-1.5">
            <button
              onClick={() => {
                cameraRef.current.targetZoom = Math.min(2.8, cameraRef.current.targetZoom * 1.15);
              }}
              className="flex-1 py-1 bg-surface dark:bg-surface border border-border rounded-lg text-xs font-bold hover:text-coral transition-colors cursor-pointer"
              title="Zoom In"
            >
              +
            </button>
            <button
              onClick={() => {
                const top1 = buildingsRef.current.find((b) => b.rank === 1);
                if (top1) flyToBuilding(top1);
              }}
              className="px-2 py-1 bg-surface dark:bg-surface border border-border rounded-lg text-[10px] font-bold text-coral hover:bg-coral/10 transition-colors cursor-pointer"
              title="Center on Crown Pinnacle (#1)"
            >
              #1
            </button>
            <button
              onClick={() => {
                cameraRef.current.targetZoom = Math.max(0.25, cameraRef.current.targetZoom * 0.85);
              }}
              className="flex-1 py-1 bg-surface dark:bg-surface border border-border rounded-lg text-xs font-bold hover:text-coral transition-colors cursor-pointer"
              title="Zoom Out"
            >
              −
            </button>
          </div>
        </div>
      )}

      {/* Floating Hover Tooltip (Shown when hovering over buildings, hidden if popup is open for that building) */}
      {hoveredBuilding && (!selectedBuilding || selectedBuilding.id !== hoveredBuilding.id) && (
        <div
          style={{
            left: `${tooltipPos.x + 14}px`,
            top: `${tooltipPos.y + 14}px`,
          }}
          className="fixed pointer-events-none z-50 px-3.5 py-2.5 rounded-2xl glass-panel shadow-feather-lg border border-border text-xs animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center gap-2">
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] text-white"
              style={{ backgroundColor: hoveredBuilding.theme.pin }}
            >
              #{hoveredBuilding.rank}
            </span>
            <span className="font-bold text-charcoal dark:text-white">
              {hoveredBuilding.websiteName}
            </span>
            <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-surface-soft dark:bg-elevated text-muted">
              {hoveredBuilding.plotNumber}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 mt-1.5 text-[10px] text-muted">
            <span>{hoveredBuilding.categoryName}</span>
            <span className="font-mono font-bold text-coral">
              ₹{hoveredBuilding.currentAmount.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
