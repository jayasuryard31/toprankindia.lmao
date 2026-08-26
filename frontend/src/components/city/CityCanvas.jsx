import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  getCoastlineX,
  getCityInfrastructure,
  toIso,
} from "./cityEngine";
import { generateCityBuildings } from "./buildingGenerator";
import { createTrafficSimulator } from "./trafficSimulator";

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

// 1. Draw Endless Terrain & Organic Zigzag Coastline + Ocean
function drawEndlessTerrain(ctx, cam, width, height) {
  ctx.save();

  const minX = -width / (2 * cam.zoom) - cam.x - 400;
  const maxX = width / (2 * cam.zoom) - cam.x + 400;
  const minY = -height / (2 * cam.zoom) - cam.y - 400;
  const maxY = height / (2 * cam.zoom) - cam.y + 400;

  // A. Base Metropolis Land (West)
  ctx.fillStyle = "#F6F3EE";
  ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

  // B. Organic Zigzag Coastline & Ocean (East)
  ctx.beginPath();
  const startY = Math.floor(minY / 40) * 40;
  const endY = Math.ceil(maxY / 40) * 40;

  ctx.moveTo(getCoastlineX(startY), startY);
  for (let y = startY; y <= endY; y += 30) {
    const cx = getCoastlineX(y);
    ctx.lineTo(cx, y);
  }
  ctx.lineTo(maxX + 200, maxY + 200);
  ctx.lineTo(maxX + 200, minY - 200);
  ctx.closePath();

  // Ocean Water Gradient
  const oceanGrad = ctx.createLinearGradient(900, minY, maxX + 200, maxY);
  oceanGrad.addColorStop(0, "#C7E6F7");
  oceanGrad.addColorStop(0.3, "#A5D8F3");
  oceanGrad.addColorStop(1, "#72C2EC");
  ctx.fillStyle = oceanGrad;
  ctx.fill();

  // C. Sandy Beach Shoreline Buffer
  ctx.strokeStyle = "#FDE68A";
  ctx.lineWidth = 8;
  ctx.beginPath();
  for (let y = startY; y <= endY; y += 30) {
    const cx = getCoastlineX(y);
    if (y === startY) ctx.moveTo(cx, y);
    else ctx.lineTo(cx, y);
  }
  ctx.stroke();

  // D. Ocean Foam White Water Edge
  ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let y = startY; y <= endY; y += 30) {
    const cx = getCoastlineX(y) + 4;
    if (y === startY) ctx.moveTo(cx, y);
    else ctx.lineTo(cx, y);
  }
  ctx.stroke();

  // E. Ocean Water Ripples
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  for (let y = startY + 60; y < endY; y += 120) {
    const cx = getCoastlineX(y) + 70;
    ctx.fillRect(cx, y, 40, 2.5);
    ctx.fillRect(cx + 90, y + 40, 30, 2.5);
    ctx.fillRect(cx + 180, y - 20, 50, 2.5);
  }

  // F. Harbor Label & Nautical Icon
  ctx.fillStyle = "#6BA4C4";
  ctx.font = "bold 13px sans-serif";
  ctx.letterSpacing = "6px";
  ctx.textAlign = "center";
  ctx.fillText("H A R B O R", 1120, 840);
  ctx.font = "20px sans-serif";
  ctx.fillText("⚓", 1080, 790);

  ctx.restore();
}

// 2. Draw 2D Procedural Roads & Boulevards
function drawRoads2D(ctx, horizontalAvenues, verticalBoulevards, crosswalks) {
  ctx.save();

  // Sidewalk Curbs
  ctx.fillStyle = "#E2E8F0";
  horizontalAvenues.forEach((h) => {
    ctx.fillRect(-600, h.y - 7, 1800, h.height + 14);
  });
  verticalBoulevards.forEach((v) => {
    ctx.fillRect(v.x - 7, -600, v.width + 14, 2600);
  });

  // Dark Asphalt Road Surfaces
  ctx.fillStyle = "#64748B";
  horizontalAvenues.forEach((h) => {
    ctx.fillRect(-600, h.y, 1800, h.height);
  });
  verticalBoulevards.forEach((v) => {
    ctx.fillRect(v.x, -600, v.width, 2600);
  });

  // Dashed White Dividers
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 10]);

  horizontalAvenues.forEach((h) => {
    ctx.beginPath();
    ctx.moveTo(-600, h.y + h.height / 2);
    ctx.lineTo(1200, h.y + h.height / 2);
    ctx.stroke();
  });

  verticalBoulevards.forEach((v) => {
    ctx.beginPath();
    ctx.moveTo(v.x + v.width / 2, -600);
    ctx.lineTo(v.x + v.width / 2, 2600);
    ctx.stroke();
  });

  ctx.setLineDash([]);

  // Pedestrian Zebra Crosswalks
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  crosswalks.forEach((c) => {
    for (let i = 0; i < c.w; i += 8) {
      ctx.fillRect(c.x + i, c.y, 4, c.h);
    }
  });

  ctx.restore();
}

// 3. Draw Central Fountain Plaza
function drawFountain(ctx, fountain) {
  ctx.save();
  ctx.fillStyle = "#CBD5E1";
  ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(fountain.x, fountain.y, fountain.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#38BDF8";
  ctx.beginPath();
  ctx.arc(fountain.x, fountain.y, fountain.radius - 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(fountain.x, fountain.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// 4. Draw Trees
function drawTrees(ctx, trees) {
  ctx.save();
  trees.forEach((t) => {
    ctx.fillStyle = "#86EFAC";
    ctx.shadowColor = "rgba(34, 197, 94, 0.3)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#4ADE80";
    ctx.beginPath();
    ctx.arc(t.x - 1, t.y - 1, t.r * 0.65, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

// 5. Draw Ocean Boats
function drawBoats(ctx, boats) {
  ctx.save();
  boats.forEach((b) => {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);

    ctx.fillStyle = "#FFFFFF";
    ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
    ctx.shadowBlur = 6;
    roundRect(ctx, -b.size / 2, -b.size / 4, b.size, b.size / 2, 4);
    ctx.fill();

    // Cabin
    ctx.fillStyle = "#38BDF8";
    roundRect(ctx, -b.size / 4, -b.size / 6, b.size / 2, b.size / 3, 2);
    ctx.fill();
    ctx.restore();
  });
  ctx.restore();
}

// 6. Draw Ambient Vehicles
function drawVehicles(ctx, vehicles) {
  ctx.save();
  vehicles.forEach((v) => {
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(v.angle);

    ctx.fillStyle = v.color;
    ctx.shadowColor = v.color;
    ctx.shadowBlur = 6;
    roundRect(ctx, -v.width / 2, -v.height / 2, v.width, v.height, 3);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.fillRect(-1, -v.height / 2 + 1, 3, v.height - 2);

    ctx.restore();
  });
  ctx.restore();
}

// 7. Draw 2D Architectural Billboard Buildings
function drawBuildings2D(ctx, buildings, selected, hovered) {
  const sorted = [...buildings].sort((a, b) => b.rank - a.rank);

  sorted.forEach((b) => {
    if (b.isFilteredOut) return;

    const isHovered = hovered?.id === b.id;
    const isSelected = selected?.id === b.id;

    ctx.save();

    // A. 3D Drop Shadow
    ctx.shadowColor = isSelected ? "rgba(240, 90, 56, 0.45)" : b.theme.shadow;
    ctx.shadowBlur = isSelected ? 22 : isHovered ? 18 : 12;
    ctx.shadowOffsetY = isSelected ? 12 : isHovered ? 8 : 5;

    // B. Base Foundation Block
    ctx.fillStyle = "#E2E8F0";
    roundRect(ctx, b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, 14);
    ctx.fill();

    ctx.shadowColor = "transparent";

    // C. Elevated Rooftop Deck
    ctx.fillStyle = b.theme.primary;
    roundRect(ctx, b.x - b.w / 2 + 3, b.y - b.h / 2 + 3, b.w - 6, b.h - 6, 12);
    ctx.fill();

    // D. White Inner Billboard Card
    ctx.fillStyle = "#FFFFFF";
    roundRect(ctx, b.x - b.w / 2 + 8, b.y - b.h / 2 + 8, b.w - 16, b.h - 16, 9);
    ctx.fill();

    // E. Selection / Hover Outline
    if (isSelected || isHovered) {
      ctx.strokeStyle = isSelected ? "#F05A38" : b.theme.primary;
      ctx.lineWidth = isSelected ? 3 : 2;
      roundRect(ctx, b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, 14);
      ctx.stroke();
    }

    // F. Logo Square & Monogram
    const iconSize = 22;
    const iconX = b.x - b.w / 2 + 14;
    const iconY = b.y - b.h / 2 + 16;

    ctx.fillStyle = b.theme.primary;
    roundRect(ctx, iconX, iconY, iconSize, iconSize, 6);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      (b.websiteName || "P").slice(0, 1).toUpperCase(),
      iconX + iconSize / 2,
      iconY + iconSize / 2
    );

    // Product Title
    ctx.fillStyle = "#1E293B";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const displayName = b.websiteName.length > 9 ? b.websiteName.slice(0, 9) + "…" : b.websiteName;
    ctx.fillText(displayName, iconX + iconSize + 6, iconY + iconSize / 2);

    // Spend Amount
    ctx.fillStyle = b.rank === 1 ? "#D97706" : b.theme.accent;
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`₹${b.currentAmount.toLocaleString("en-IN")}`, b.x, b.y + b.h / 2 - 20);

    // G. Circular Rank Pin Badge
    const pinX = b.x - b.w / 2 + 2;
    const pinY = b.y - b.h / 2 + 2;
    ctx.fillStyle = b.theme.pin;
    ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(pinX, pinY, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = "transparent";
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(b.rank), pinX, pinY);

    // H. Golden Crown atop #1 ZeroRank Hero spot
    if (b.theme.crown) {
      ctx.font = "24px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("👑", b.x, b.y - b.h / 2 - 8);
    }

    ctx.restore();
  });
}

// 8. Draw 3D Isometric Extruded Skyscraper Buildings
function drawBuildings3D(ctx, buildings, selected, hovered) {
  // Sort back-to-front by isometric Y depth (x + y)
  const sorted = [...buildings].sort((a, b) => a.x + a.y - (b.x + b.y));

  sorted.forEach((b) => {
    if (b.isFilteredOut) return;

    const isHovered = hovered?.id === b.id;
    const isSelected = selected?.id === b.id;

    const base = toIso(b.x, b.y, 0);
    const height = b.height3D;
    const top = toIso(b.x, b.y, height);
    const w = (b.w * 0.5);
    const d = (b.h * 0.5);

    ctx.save();

    // 3D Shadow on ground
    ctx.fillStyle = isSelected ? "rgba(240, 90, 56, 0.35)" : "rgba(0, 0, 0, 0.15)";
    ctx.beginPath();
    ctx.ellipse(base.x + 10, base.y + 10, w * 1.1, d * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Left Facade (Light)
    ctx.fillStyle = isSelected ? "#FDBA74" : isHovered ? "#E2E8F0" : "#CBD5E1";
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(top.x - w, top.y + d * 0.5);
    ctx.lineTo(base.x - w, base.y + d * 0.5);
    ctx.lineTo(base.x, base.y);
    ctx.closePath();
    ctx.fill();

    // Window Matrix Left Facade
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    for (let f = 10; f < height; f += 16) {
      const rowTop = toIso(b.x, b.y, height - f);
      ctx.fillRect(rowTop.x - w * 0.8, rowTop.y + d * 0.3, w * 0.6, 6);
    }

    // Right Facade (Shaded)
    ctx.fillStyle = isSelected ? "#FB923C" : isHovered ? "#CBD5E1" : "#94A3B8";
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(top.x + w, top.y + d * 0.5);
    ctx.lineTo(base.x + w, base.y + d * 0.5);
    ctx.lineTo(base.x, base.y);
    ctx.closePath();
    ctx.fill();

    // Rooftop Deck (Theme Color)
    ctx.fillStyle = b.theme.primary;
    ctx.beginPath();
    ctx.moveTo(top.x, top.y - d * 0.5);
    ctx.lineTo(top.x + w, top.y);
    ctx.lineTo(top.x, top.y + d * 0.5);
    ctx.lineTo(top.x - w, top.y);
    ctx.closePath();
    ctx.fill();

    // Hover / Selection outline on 3D Rooftop
    if (isSelected || isHovered) {
      ctx.strokeStyle = isSelected ? "#F05A38" : "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Rooftop White Billboard Card
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.moveTo(top.x, top.y - d * 0.35);
    ctx.lineTo(top.x + w * 0.7, top.y);
    ctx.lineTo(top.x, top.y + d * 0.35);
    ctx.lineTo(top.x - w * 0.7, top.y);
    ctx.closePath();
    ctx.fill();

    // Title & Spend
    ctx.fillStyle = "#1E293B";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const displayName = b.websiteName.length > 8 ? b.websiteName.slice(0, 8) + "…" : b.websiteName;
    ctx.fillText(displayName, top.x, top.y - 4);

    ctx.fillStyle = b.rank === 1 ? "#D97706" : b.theme.accent;
    ctx.font = "bold 10px monospace";
    ctx.fillText(`₹${b.currentAmount.toLocaleString("en-IN")}`, top.x, top.y + 7);

    // Floating Golden Crown on #1
    if (b.theme.crown) {
      ctx.font = "22px sans-serif";
      ctx.fillText("👑", top.x, top.y - d * 0.5 - 14);
    }

    // Rank Badge
    ctx.fillStyle = b.theme.pin;
    ctx.beginPath();
    ctx.arc(top.x - w * 0.7, top.y - d * 0.3, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 9px sans-serif";
    ctx.fillText(String(b.rank), top.x - w * 0.7, top.y - d * 0.3);

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
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const initializedRef = useRef(false);

  // Camera State
  const cameraRef = useRef({
    x: -580,
    y: -500,
    zoom: 1.0,
    targetX: -580,
    targetY: -500,
    targetZoom: 1.0,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    hasMoved: false,
  });

  const [hoveredBuilding, setHoveredBuilding] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [showMinimap, setShowMinimap] = useState(true);

  const infraRef = useRef(getCityInfrastructure());
  const trafficRef = useRef(createTrafficSimulator());

  const buildings = useMemo(() => {
    return generateCityBuildings(products, activeCategoryId);
  }, [products, activeCategoryId]);

  const buildingsRef = useRef(buildings);

  useEffect(() => {
    buildingsRef.current = buildings;

    if (buildings.length > 0 && !initializedRef.current) {
      const top1 = buildings.find((b) => b.rank === 1) || buildings[0];
      if (top1) {
        cameraRef.current.x = -top1.x;
        cameraRef.current.y = -top1.y;
        cameraRef.current.targetX = -top1.x;
        cameraRef.current.targetY = -top1.y;
        cameraRef.current.zoom = 1.05;
        cameraRef.current.targetZoom = 1.05;
        initializedRef.current = true;
      }
    }
  }, [buildings]);

  useEffect(() => {
    if (!focusedBuildingId) return;
    const targetBuilding = buildingsRef.current.find((b) => b.id === focusedBuildingId);
    if (targetBuilding) {
      cameraRef.current.targetX = -targetBuilding.x;
      cameraRef.current.targetY = -targetBuilding.y;
      cameraRef.current.targetZoom = 1.35;
      if (onClearFocus) onClearFocus();
    }
  }, [focusedBuildingId, onClearFocus]);

  const flyToBuilding = useCallback((building) => {
    if (!building) return;
    cameraRef.current.targetX = -building.x;
    cameraRef.current.targetY = -building.y;
    cameraRef.current.targetZoom = 1.3;
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

      // Camera lerp
      const cam = cameraRef.current;
      cam.x += (cam.targetX - cam.x) * 0.09;
      cam.y += (cam.targetY - cam.y) * 0.09;
      cam.zoom += (cam.targetZoom - cam.zoom) * 0.09;

      trafficRef.current.update();

      ctx.save();
      // 1. Draw Endless Background (Metropolis land + Ocean)
      drawEndlessTerrain(ctx, cam, width, height);

      // Transform into World Space
      ctx.translate(width / 2 + cam.x * cam.zoom, height / 2 + cam.y * cam.zoom);
      ctx.scale(cam.zoom, cam.zoom);

      if (viewMode === "2D") {
        // 2D Mode: Flat architectural layout
        drawRoads2D(
          ctx,
          infraRef.current.horizontalAvenues,
          infraRef.current.verticalBoulevards,
          infraRef.current.crosswalks
        );
        drawFountain(ctx, infraRef.current.centralFountain);
        drawTrees(ctx, infraRef.current.trees);
        drawBoats(ctx, infraRef.current.oceanBoats);
        drawVehicles(ctx, trafficRef.current.getVehicles());
        drawBuildings2D(ctx, buildingsRef.current, selectedProduct, hoveredBuilding);
      } else {
        // 3D Mode: Isometric extrusion
        drawFountain(ctx, infraRef.current.centralFountain);
        drawTrees(ctx, infraRef.current.trees);
        drawBoats(ctx, infraRef.current.oceanBoats);
        drawBuildings3D(ctx, buildingsRef.current, selectedProduct, hoveredBuilding);
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [selectedProduct, hoveredBuilding, viewMode]);

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

      let found = null;
      for (const b of buildingsRef.current) {
        if (b.isFilteredOut) continue;
        if (viewMode === "2D") {
          if (
            worldX >= b.x - b.w / 2 &&
            worldX <= b.x + b.w / 2 &&
            worldY >= b.y - b.h / 2 &&
            worldY <= b.y + b.h / 2
          ) {
            found = b;
            break;
          }
        } else {
          const top = toIso(b.x, b.y, b.height3D);
          const dist = Math.hypot(worldX - top.x, worldY - top.y);
          if (dist < b.w * 0.6) {
            found = b;
            break;
          }
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

      {/* Floating MAP VIEWER Mini-Map Widget (Positioned cleanly beside Metropolis Sidebar) */}
      {showMinimap && (
        <div className="absolute top-20 left-4 md:left-[315px] lg:left-[325px] z-20 w-48 p-2.5 rounded-2xl glass-panel shadow-feather-lg border border-border/80 hidden sm:block animate-in fade-in duration-200 pointer-events-auto">
          <div className="flex items-center justify-between px-1 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
            <span>MAP VIEWER</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={onToggleViewMode}
                className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-coral/10 text-coral hover:bg-coral/20 cursor-pointer"
              >
                {viewMode === "2D" ? "3D" : "2D"}
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

          <div className="relative w-full h-24 rounded-xl bg-slate-200/80 dark:bg-slate-800/80 overflow-hidden border border-border/60">
            {/* Miniature Map Grid preview */}
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-300 via-amber-100 to-sky-200 opacity-60" />
            <div className="absolute right-0 top-0 bottom-0 w-10 bg-sky-300/80" />

            {/* Top 10 Plot Dots */}
            {buildings.slice(0, 10).map((b) => (
              <div
                key={b.id}
                style={{
                  left: `${(b.x / WORLD_WIDTH) * 100}%`,
                  top: `${(b.y / WORLD_HEIGHT) * 100}%`,
                  backgroundColor: b.theme.pin,
                }}
                className="absolute w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-xs"
              />
            ))}

            {/* Viewport Box */}
            <div className="absolute inset-3 border-2 border-white rounded-lg pointer-events-none shadow-sm" />
          </div>

          <div className="flex items-center justify-between gap-1 mt-1.5">
            <button
              onClick={() => {
                cameraRef.current.targetZoom = Math.min(2.8, cameraRef.current.targetZoom * 1.15);
              }}
              className="flex-1 py-1 bg-surface dark:bg-surface border border-border rounded-lg text-xs font-bold hover:text-coral transition-colors cursor-pointer"
            >
              +
            </button>
            <button
              onClick={() => {
                cameraRef.current.targetZoom = Math.max(0.25, cameraRef.current.targetZoom * 0.85);
              }}
              className="flex-1 py-1 bg-surface dark:bg-surface border border-border rounded-lg text-xs font-bold hover:text-coral transition-colors cursor-pointer"
            >
              −
            </button>
          </div>
        </div>
      )}

      {/* Floating Hover Tooltip */}
      {hoveredBuilding && (
        <div
          style={{
            left: `${tooltipPos.x + 12}px`,
            top: `${tooltipPos.y + 12}px`,
          }}
          className="fixed pointer-events-none z-50 px-3.5 py-2 rounded-2xl glass-panel shadow-feather-lg border border-border text-xs animate-in fade-in zoom-in-95 duration-150"
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
          </div>
          <div className="flex items-center justify-between gap-4 mt-1 text-[10px] text-muted">
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
