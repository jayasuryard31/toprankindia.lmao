import * as maplibreNS from "maplibre-gl";
import { markerSizePx } from "./buildingsSource";

const maplibregl = maplibreNS.default ?? maplibreNS;

const initialOf = (name) => (name || "?").trim().charAt(0).toUpperCase() || "?";

/**
 * Ordered fallback image sources for each brand/website:
 * 1. Explicit uploaded or scraped logoUrl
 * 2. High-definition real website screenshot preview
 * 3. High-res Google S2 Favicon (128px)
 * 4. Clearbit Logo API
 * 5. DuckDuckGo Icons
 */
function resolveImageSources(item) {
  const url = item.websiteUrl || item.product?.websiteUrl || "";
  let host;
  try {
    const raw = url.startsWith("http") ? url : `https://${url}`;
    host = new URL(raw).hostname.replace(/^www\./, "");
  } catch {
    host = url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || "";
  }
  const cleanUrl = url.startsWith("http") ? url : (url ? `https://${url}` : "");

  const sources = [];

  if (item.logoUrl && typeof item.logoUrl === "string" && item.logoUrl.trim().length > 4) {
    sources.push(item.logoUrl.trim());
  }

  if (cleanUrl && cleanUrl.length > 8) {
    sources.push(`https://image.thum.io/get/width/600/crop/600/noanimate/${cleanUrl}`);
    sources.push(`https://api.microlink.io?url=${encodeURIComponent(cleanUrl)}&screenshot=true&meta=false&embed=screenshot.url`);
  }

  if (host && host.includes(".")) {
    sources.push(`https://logo.clearbit.com/${host}`);
    sources.push(`https://www.google.com/s2/favicons?domain=${host}&sz=128`);
    sources.push(`https://icons.duckduckgo.com/ip3/${host}.ico`);
  }

  return sources;
}

function generateBrandSvg(name, color) {
  const initial = initialOf(name);
  const cleanName = (name || "Brand").slice(0, 14);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color || "#F05A38"}"/>
        <stop offset="100%" stop-color="#0F172A"/>
      </linearGradient>
    </defs>
    <rect width="200" height="200" rx="30" fill="url(#g)"/>
    <circle cx="100" cy="85" r="48" fill="rgba(255,255,255,0.15)"/>
    <text x="100" y="105" font-family="system-ui, sans-serif" font-size="62" font-weight="900" fill="#ffffff" text-anchor="middle">${initial}</text>
    <text x="100" y="165" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="rgba(255,255,255,0.9)" text-anchor="middle">${cleanName}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Creates and manages "Bigger Payment, Bigger Plot" markers.
 */
export function createBuildingLayer(map) {
  const recs = new Map();
  let theme = "light";
  let filterCat = null;
  let hidden = false;
  let selectedId = null;
  let onClick = () => {};

  function buildEl(d) {
    const el = document.createElement("div");
    el.className = "tri-bubble";
    el.style.cssText =
      "position:relative;cursor:pointer;will-change:transform;" +
      "transition:width .35s cubic-bezier(0.16,1,0.3,1),height .35s cubic-bezier(0.16,1,0.3,1),transform .18s ease;";

    // 1. Acquired Land Radar / Territory Ring
    const landAura = document.createElement("div");
    landAura.className = "tri-land-aura";
    landAura.style.cssText =
      "position:absolute;inset:-10px;border-radius:50%;pointer-events:none;" +
      "border:2px dashed " + d.color + "99;opacity:0.6;animation:pulseAura 3s infinite ease-in-out;";

    // 2. Inner Plot Territory with Website Screenshot / Brand Logo Image
    const inner = document.createElement("div");
    inner.className = "tri-bubble-inner";
    inner.style.cssText =
      "position:relative;width:100%;height:100%;border-radius:50%;overflow:hidden;" +
      "background:#0e1013;display:flex;align-items:center;justify-content:center;" +
      "border:3px solid " + d.color + ";box-shadow:0 8px 24px rgba(0,0,0,0.35);";

    const img = document.createElement("img");
    img.alt = d.name;
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";

    let sources = resolveImageSources(d);
    let srcIdx = 0;

    img.onload = () => {
      img.style.display = "block";
    };

    img.onerror = () => {
      srcIdx++;
      if (srcIdx < sources.length) {
        img.src = sources[srcIdx];
      } else {
        img.src = generateBrandSvg(d.name, d.color);
      }
    };

    if (sources.length > 0) {
      img.src = sources[0];
    } else {
      img.src = generateBrandSvg(d.name, d.color);
    }

    inner.appendChild(img);

    // 3. Rank Indicator Badge (#1, #2, ...)
    const badge = document.createElement("span");
    badge.className = "tri-bubble-badge";
    badge.textContent = "#" + d.rank;
    badge.style.cssText =
      "position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;padding:0 6px;" +
      "border-radius:10px;background:#0f172a;color:#fff;font-size:11px;font-weight:900;" +
      "display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;" +
      "border:1.5px solid " + d.color + ";box-shadow:0 2px 8px rgba(0,0,0,.45);z-index:10;";

    // 4. Golden Crown for #1 Top Land Plot
    const crown = document.createElement("span");
    crown.textContent = "👑";
    crown.style.cssText =
      "position:absolute;top:-24px;left:50%;transform:translateX(-50%);font-size:24px;" +
      "filter:drop-shadow(0 2px 6px rgba(0,0,0,.4));z-index:20;display:" + (d.rank === 1 ? "block" : "none") + ";";

    // 5. Brand Title & Payment Value Tag (e.g. VegaEdu ERP · ₹10,000)
    const namePill = document.createElement("div");
    namePill.className = "tri-bubble-name";
    namePill.style.cssText =
      "position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:6px;" +
      "padding:2px 8px;border-radius:12px;background:rgba(15,23,42,0.88);backdrop-filter:blur(6px);" +
      "color:#ffffff;font-size:10px;font-weight:700;font-family:'Plus Jakarta Sans',system-ui,sans-serif;" +
      "border:1px solid rgba(255,255,255,0.18);box-shadow:0 4px 12px rgba(0,0,0,0.35);" +
      "white-space:nowrap;max-width:190px;overflow:hidden;text-overflow:ellipsis;pointer-events:none;z-index:10;";
    namePill.textContent = `${d.name} · ₹${(d.amount || 0).toLocaleString("en-IN")}`;

    el.appendChild(landAura);
    el.appendChild(crown);
    el.appendChild(inner);
    el.appendChild(badge);
    el.appendChild(namePill);

    el.addEventListener("mouseenter", () => {
      el.style.transform = "scale(1.08)";
      el.style.zIndex = "5000";
    });
    el.addEventListener("mouseleave", () => {
      el.style.transform = "";
      const rec = recs.get(d.id);
      if (rec) el.style.zIndex = String(3000 - rec.data.rank);
    });

    el.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const rec = recs.get(d.id);
      if (rec) onClick(rec.data);
    });

    return { el, landAura, inner, img, badge, crown, namePill };
  }

  function updateContent(rec, d) {
    rec.data = d;
    rec.badge.textContent = "#" + d.rank;
    rec.crown.style.display = d.rank === 1 ? "block" : "none";
    rec.namePill.textContent = `${d.name} · ₹${(d.amount || 0).toLocaleString("en-IN")}`;

    const sources = resolveImageSources(d);
    let srcIdx = 0;
    rec.img.onerror = () => {
      srcIdx++;
      if (srcIdx < sources.length) {
        rec.img.src = sources[srcIdx];
      } else {
        rec.img.src = generateBrandSvg(d.name, d.color);
      }
    };
    if (sources.length > 0) {
      rec.img.src = sources[0];
    } else {
      rec.img.src = generateBrandSvg(d.name, d.color);
    }
  }

  function applyStyle(rec) {
    const d = rec.data;
    const size = markerSizePx(d.weight, map.getZoom());
    rec.el.style.width = size + "px";
    rec.el.style.height = size + "px";
    rec.el.style.zIndex = String(3000 - d.rank);

    const selected = d.id === selectedId;
    const ringW = selected ? 5 : d.rank === 1 ? 4 : Math.max(2, Math.round(size * 0.035));

    rec.inner.style.borderColor = d.color;
    rec.inner.style.boxShadow =
      `0 0 0 ${ringW}px ${d.color}, 0 12px 28px rgba(15,20,25,${theme === "dark" ? 0.6 : 0.25})` +
      (selected ? `, 0 0 0 ${ringW + 6}px ${d.color}55` : "") +
      (d.rank === 1 ? `, 0 0 36px ${d.color}aa` : "");

    rec.badge.style.display = size >= 30 ? "flex" : "none";
    rec.namePill.style.display = size >= 52 ? "block" : "none";

    const visible =
      !hidden && (!filterCat || String(d.categoryId) === String(filterCat));
    rec.el.style.display = visible ? "flex" : "none";
  }

  return {
    setOnClick(fn) {
      onClick = fn;
    },
    setTheme(t) {
      theme = t;
      recs.forEach((rec) => {
        updateContent(rec, rec.data);
        applyStyle(rec);
      });
    },
    setFilter(cat) {
      filterCat = cat || null;
      recs.forEach(applyStyle);
    },
    setHidden(h) {
      hidden = !!h;
      recs.forEach(applyStyle);
    },
    setSelected(id) {
      selectedId = id || null;
      recs.forEach(applyStyle);
    },
    refresh() {
      recs.forEach(applyStyle);
    },
    sync(list) {
      const seen = new Set();
      for (const d of list) {
        seen.add(d.id);
        let rec = recs.get(d.id);
        if (!rec) {
          const parts = buildEl(d);
          rec = { ...parts, data: d };
          rec.marker = new maplibregl.Marker({ element: parts.el, anchor: "center" })
            .setLngLat(d.lngLat)
            .addTo(map);
          recs.set(d.id, rec);
        }
        rec.marker.setLngLat(d.lngLat);
        updateContent(rec, d);
        applyStyle(rec);
      }
      for (const [id, rec] of recs) {
        if (!seen.has(id)) {
          rec.marker.remove();
          recs.delete(id);
        }
      }
    },
    destroy() {
      recs.forEach((rec) => rec.marker.remove());
      recs.clear();
    },
  };
}
