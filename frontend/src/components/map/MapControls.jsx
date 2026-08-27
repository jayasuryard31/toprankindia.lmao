import { getMapInstance } from "./mapInstance";
import { CITY_CENTER, CITY_ZOOM } from "./cityData";

function IconBtn({ label, onClick, children }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="w-9 h-9 rounded-xl flex items-center justify-center text-muted hover:text-charcoal dark:hover:text-white hover:bg-surface-soft dark:hover:bg-elevated transition-colors cursor-pointer text-base font-bold"
    >
      {children}
    </button>
  );
}

export default function MapControls() {
  const map = () => getMapInstance();

  const handleZoomOut = () => {
    if (window.__threeCityEngine) window.__threeCityEngine.zoomOut();
    map()?.zoomOut();
  };

  const handleZoomIn = () => {
    if (window.__threeCityEngine) window.__threeCityEngine.zoomIn();
    map()?.zoomIn();
  };

  const locate = () => {
    if (window.__threeCityEngine) {
      window.__threeCityEngine.resetView();
      return;
    }
    if (!navigator.geolocation) {
      map()?.flyTo({ center: CITY_CENTER, zoom: CITY_ZOOM, duration: 900 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => map()?.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 13, duration: 1200 }),
      () => map()?.flyTo({ center: CITY_CENTER, zoom: CITY_ZOOM, duration: 900 }),
      { timeout: 4000 }
    );
  };

  const resetNorth = () => {
    if (window.__threeCityEngine) {
      window.__threeCityEngine.resetView();
      return;
    }
    map()?.easeTo({ bearing: 0, pitch: 55, duration: 500 });
  };

  return (
    <div className="flex flex-col gap-2 select-none pointer-events-auto">
      <div className="flex items-center gap-0.5 p-1 rounded-2xl glass-panel shadow-feather-lg border border-border/80 w-fit">
        <IconBtn label="Zoom out" onClick={handleZoomOut}>−</IconBtn>
        <IconBtn label="Zoom in" onClick={handleZoomIn}>+</IconBtn>
        <div className="w-px h-5 bg-border/60 mx-0.5" />
        <IconBtn label="Recenter city" onClick={locate}>◎</IconBtn>
        <IconBtn label="Reset bearing / pitch" onClick={resetNorth}>⌖</IconBtn>
      </div>
    </div>
  );
}
