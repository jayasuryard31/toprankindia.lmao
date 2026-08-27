import { useEffect, useRef } from "react";
import * as maplibreNS from "maplibre-gl";

const maplibregl = maplibreNS.default ?? maplibreNS;
import { baseStyle, addCityLayers, applyTheme } from "./cityStyle";
import { useCityLayout } from "../../hooks/useCityLayout";
import { useMapStore } from "./useMapStore";
import { useTheme } from "../../context/ThemeContext";
import { getMapInstance } from "./mapInstance";

const viewportPolygon = (b) => ({
  type: "FeatureCollection",
  features: [{
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [[
        [b.getWest(), b.getSouth()],
        [b.getEast(), b.getSouth()],
        [b.getEast(), b.getNorth()],
        [b.getWest(), b.getNorth()],
        [b.getWest(), b.getSouth()],
      ]],
    },
  }],
});

export default function MiniMap() {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const readyRef = useRef(false);
  const { data: layout } = useCityLayout();
  const { theme } = useTheme();
  const camera = useMapStore((s) => s.camera);
  const themeRef = useRef(theme);

  useEffect(() => {
    themeRef.current = theme;
  });

  useEffect(() => {
    const map = new maplibregl.Map({
      container: ref.current,
      style: baseStyle(themeRef.current),
      center: [72.915, 19.09],
      zoom: 10.4,
      interactive: false,
      attributionControl: false,
    });
    mapRef.current = map;
    const draw = () => {
      addCityLayers(map, layout, themeRef.current);
      map.addSource("viewport", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "viewport-fill", type: "fill", source: "viewport", paint: { "fill-color": "#F05A38", "fill-opacity": 0.16 } });
      map.addLayer({ id: "viewport-line", type: "line", source: "viewport", paint: { "line-color": "#F05A38", "line-width": 2 } });
      map.resize();
      readyRef.current = true;
      const kick = () => {
        if (!mapRef.current) return;
        map.resize();
        try { map.redraw(); } catch { /* noop */ }
      };
      requestAnimationFrame(kick);
      [180, 500, 1200].forEach((ms) => setTimeout(kick, ms));
    };
    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      clearInterval(poll);
      draw();
    };
    map.on("load", run);
    const poll = setInterval(() => {
      if (done) return;
      try { map.redraw(); } catch { /* not ready */ }
      if (map.style && map.isStyleLoaded()) run();
    }, 150);
    return () => {
      clearInterval(poll);
      readyRef.current = false;
      try { map.remove(); } catch { /* noop */ }
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const mini = mapRef.current;
    if (!mini || !readyRef.current) return;
    applyTheme(mini, theme);
    try { mini.redraw(); } catch { /* noop */ }
  }, [theme]);

  useEffect(() => {
    const mini = mapRef.current;
    const main = getMapInstance();
    if (!mini || !main || !mini.getSource("viewport")) return;
    mini.getSource("viewport").setData(viewportPolygon(main.getBounds()));
  }, [camera]);

  return (
    <div className="w-full glass-panel rounded-2xl shadow-feather-lg border border-border/80 p-2">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted px-1 pb-1.5">Overview</div>
      <div ref={ref} className="w-full h-32 rounded-xl overflow-hidden" />
    </div>
  );
}
