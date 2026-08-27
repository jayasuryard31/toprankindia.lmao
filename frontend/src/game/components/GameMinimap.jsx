import CityMiniMap from "../../components/map/CityMiniMap";

/**
 * In-game radar. Same component as the map-view overview, so what you see on
 * the HUD is literally the city you're standing in — roads, blocks, every
 * plot (built vs free), landmarks, billboards and live traffic.
 */
export default function GameMinimap({ engine, playerRef, camYawRef, size = 172 }) {
  return (
    <CityMiniMap
      engine={engine}
      size={size}
      playerRef={playerRef}
      camYawRef={camYawRef}
      showPlots
    />
  );
}
