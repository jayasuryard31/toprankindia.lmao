/**
 * MapLibre style + layer helpers for Velora Harbor.
 *
 * The base style is intentionally minimal (just a background) so the map fires
 * `load` immediately and reliably; every GeoJSON source and layer is added
 * afterwards via `addCityLayers()`. District labels are HTML overlays.
 *
 * Light and dark are two hand-tuned cartographic palettes — never a CSS filter.
 */

export const PALETTES = {
  light: {
    land: "#F1EEE6",
    water: "#AFD6E8",
    waterLine: "#94C4DA",
    terrain: "#D9E7C6",
    terrainLine: "#C4D8AC",
    park: "#C6E1B0",
    roadPrimary: "#FFFFFF",
    roadPrimaryCasing: "#E1DACB",
    roadSecondary: "#EBE5D8",
    districtOutline: null, // uses per-district color
    districtFillMax: 0.3,
    cluster: "#F05A38",
    clusterText: "#ffffff",
    ring: 0.35,
    markerStroke: "#ffffff",
  },
  dark: {
    land: "#14171C",
    water: "#0E1B24",
    waterLine: "#183341",
    terrain: "#17201A",
    terrainLine: "#233020",
    park: "#1B2A1C",
    roadPrimary: "#3A424C",
    roadPrimaryCasing: "#242A31",
    roadSecondary: "#262C33",
    districtOutline: null,
    districtFillMax: 0.34,
    cluster: "#F0653F",
    clusterText: "#12100E",
    ring: 0.5,
    markerStroke: "#0E1013",
  },
};

export function baseStyle(theme = "light") {
  return {
    version: 8,
    name: "velora-harbor",
    sources: {},
    layers: [
      { id: "background", type: "background", paint: { "background-color": PALETTES[theme].land } },
    ],
  };
}

const districtFillExpr = (max) => [
  "case",
  ["boolean", ["feature-state", "selected"], false], max,
  ["boolean", ["feature-state", "hover"], false], max * 0.78,
  max * 0.55,
];

/** Add the city's water / terrain / parks / roads / districts to a loaded map. */
export function addCityLayers(map, layout, theme = "light") {
  const P = PALETTES[theme];

  const add = (id, data) => {
    if (!map.getSource(id)) map.addSource(id, { type: "geojson", data });
    else map.getSource(id).setData(data);
  };

  add("water", layout.water);
  add("terrain", layout.terrain);
  add("parks", layout.parks);
  add("roads-secondary", layout.roadsSecondary);
  add("roads-primary", layout.roadsPrimary);
  const districts = layout.districts;
  districts.features.forEach((f) => (f.id = f.properties.id));
  add("districts", districts);

  const layer = (spec) => {
    if (!map.getLayer(spec.id)) map.addLayer(spec);
  };

  layer({ id: "terrain", type: "fill", source: "terrain", paint: { "fill-color": P.terrain } });
  layer({ id: "terrain-line", type: "line", source: "terrain", paint: { "line-color": P.terrainLine, "line-width": 1 } });
  layer({ id: "water", type: "fill", source: "water", paint: { "fill-color": P.water } });
  layer({ id: "water-line", type: "line", source: "water", paint: { "line-color": P.waterLine, "line-width": 1.5 } });
  layer({ id: "parks", type: "fill", source: "parks", paint: { "fill-color": P.park, "fill-opacity": 0.95 } });

  layer({
    id: "district-fill",
    type: "fill",
    source: "districts",
    paint: { "fill-color": ["get", "color"], "fill-opacity": districtFillExpr(P.districtFillMax) },
  });
  layer({
    id: "district-outline",
    type: "line",
    source: "districts",
    paint: {
      "line-color": ["get", "color"],
      "line-width": ["case", ["boolean", ["feature-state", "selected"], false], 3, 1.6],
      "line-opacity": theme === "dark" ? 0.85 : 0.7,
      "line-dasharray": [2, 1.5],
    },
  });

  layer({
    id: "roads-secondary",
    type: "line",
    source: "roads-secondary",
    paint: { "line-color": P.roadSecondary, "line-width": ["interpolate", ["linear"], ["zoom"], 11, 1.5, 15, 6] },
  });
  layer({
    id: "roads-primary-casing",
    type: "line",
    source: "roads-primary",
    paint: { "line-color": P.roadPrimaryCasing, "line-width": ["interpolate", ["linear"], ["zoom"], 11, 5, 15, 20] },
  });
  layer({
    id: "roads-primary",
    type: "line",
    source: "roads-primary",
    paint: { "line-color": P.roadPrimary, "line-width": ["interpolate", ["linear"], ["zoom"], 11, 3, 15, 14] },
  });
}

/** Re-tint every base + marker layer for a theme change (no reload). */
export function applyTheme(map, theme) {
  if (!map || !map.getLayer("background")) return;
  const P = PALETTES[theme];
  const set = (id, prop, val) => {
    if (map.getLayer(id)) map.setPaintProperty(id, prop, val);
  };
  set("background", "background-color", P.land);
  set("terrain", "fill-color", P.terrain);
  set("terrain-line", "line-color", P.terrainLine);
  set("water", "fill-color", P.water);
  set("water-line", "line-color", P.waterLine);
  set("parks", "fill-color", P.park);
  set("district-fill", "fill-opacity", districtFillExpr(P.districtFillMax));
  set("district-outline", "line-opacity", theme === "dark" ? 0.85 : 0.7);
  set("roads-secondary", "line-color", P.roadSecondary);
  set("roads-primary-casing", "line-color", P.roadPrimaryCasing);
  set("roads-primary", "line-color", P.roadPrimary);
  set("clusters", "circle-color", P.cluster);
  set("cluster-count", "text-color", P.clusterText);
  set("building-dot", "circle-stroke-color", P.markerStroke);
  set("building-ring", "circle-stroke-opacity", P.ring);
}
