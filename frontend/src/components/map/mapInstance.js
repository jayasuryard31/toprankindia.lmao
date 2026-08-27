/** Shared handle to the live MapLibre instance so overlay controls can drive it. */
let _map = null;
export const setMapInstance = (m) => {
  _map = m;
  if (typeof window !== "undefined") window.__map = m;
};
export const getMapInstance = () => _map;
