/**
 * TrafficSystem - reserved extension point (not wired this build).
 *
 * The map layer already drives cars strictly along `cityGrid.roadSegments()`
 * (verified never on grass/water). This system will add:
 *   - traffic-light state machines at major intersections (red/amber/green)
 *   - car following model (stop line, gap keeping, no rear-end collisions)
 *   - lane changes + turning at junctions
 *   - spawn/despawn near the player, pooled bodies
 *   - designated parking bays along block frontages
 *   - later: a drivable-vehicle controller sharing the same road graph
 */
export class TrafficSystem {
  constructor() {
    this.enabled = false;
  }
  update() {}
  dispose() {}
}
