import { create } from "zustand";

const ALL_PANELS = ["districts", "liveFeed", "topEmpires", "overview", "stats"];

const loadPanels = () => {
  try {
    const saved = JSON.parse(localStorage.getItem("tri-map-panels") || "null");
    if (saved && typeof saved === "object") {
      return ALL_PANELS.reduce((acc, k) => ({ ...acc, [k]: saved[k] !== false }), {});
    }
  } catch {
    /* ignore */
  }
  return ALL_PANELS.reduce((acc, k) => ({ ...acc, [k]: true }), {});
};

const persist = (panels) => {
  try {
    localStorage.setItem("tri-map-panels", JSON.stringify(panels));
  } catch {
    /* ignore */
  }
};

/** Centralized map-only state. Bidding panels keep their own local state. */
export const useMapStore = create((set) => ({
  selectedDistrict: null,
  selectedBuilding: null,
  hoveredDistrict: null,
  viewMode: "3D", // "2D" | "3D" - the city is 3D by default
  showHeatmap: false,
  selectedCategory: null,
  camera: { center: [72.905, 19.09], zoom: 11.85, pitch: 0, bearing: 0 },
  panels: loadPanels(),
  // True while the player is walking the city in third person. The whole site
  // chrome (header nav, footer, map overlays) steps out of the way when set.
  inCity: false,
  fps: 60,

  setSelectedDistrict: (id) => set({ selectedDistrict: id }),
  setHoveredDistrict: (id) => set({ hoveredDistrict: id }),
  setSelectedBuilding: (b) => set({ selectedBuilding: b }),
  setSelectedCategory: (id) => set({ selectedCategory: id }),
  setShowHeatmap: (v) => set({ showHeatmap: v }),
  setCamera: (camera) => set({ camera }),
  setInCity: (inCity) => set({ inCity }),
  setFps: (fps) => set({ fps }),
  toggleViewMode: () => set((s) => ({ viewMode: s.viewMode === "2D" ? "3D" : "2D" })),
  setViewMode: (viewMode) => set({ viewMode }),

  togglePanel: (key) =>
    set((s) => {
      const panels = { ...s.panels, [key]: !s.panels[key] };
      persist(panels);
      return { panels };
    }),
  setAllPanels: (value) =>
    set(() => {
      const panels = ALL_PANELS.reduce((acc, k) => ({ ...acc, [k]: value }), {});
      persist(panels);
      return { panels };
    }),
}));

export { ALL_PANELS };
