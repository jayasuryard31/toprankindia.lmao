/**
 * Ambient Traffic Simulator across vast road infrastructure
 */

export function createTrafficSimulator() {
  const routes = [
    // Route 0: Grand Central Avenue East-West (Y=300)
    [
      { x: -1400, y: 300 },
      { x: -680, y: 300 },
      { x: -280, y: 300 },
      { x: 180, y: 300 },
      { x: 560, y: 300 },
      { x: 880, y: 300 },
      { x: 1000, y: 300 },
      { x: 1000, y: 680 },
      { x: 560, y: 680 },
      { x: 180, y: 680 },
      { x: -280, y: 680 },
      { x: -1400, y: 680 },
    ],
    // Route 1: North Avenue Corridor (Y=-80)
    [
      { x: -1400, y: -80 },
      { x: -280, y: -80 },
      { x: 180, y: -80 },
      { x: 560, y: -80 },
      { x: 880, y: -80 },
      { x: 1000, y: -80 },
      { x: 1000, y: -460 },
      { x: 180, y: -460 },
      { x: -1400, y: -460 },
    ],
    // Route 2: Downtown Central Boulevard North-South (X=180)
    [
      { x: 180, y: -1200 },
      { x: 180, y: -460 },
      { x: 180, y: -80 },
      { x: 180, y: 300 },
      { x: 180, y: 680 },
      { x: 180, y: 1060 },
      { x: 180, y: 1800 },
    ],
    // Route 3: Financial District Boulevard (X=560)
    [
      { x: 560, y: 1800 },
      { x: 560, y: 1060 },
      { x: 560, y: 680 },
      { x: 560, y: 300 },
      { x: 560, y: -80 },
      { x: 560, y: -1200 },
    ],
    // Route 4: Coastal Scenic Highway
    [
      { x: 1000, y: 2000 },
      { x: 1020, y: 1400 },
      { x: 1010, y: 800 },
      { x: 1020, y: 200 },
      { x: 1000, y: -400 },
      { x: 1010, y: -1000 },
    ],
  ];

  const vehicles = [
    { routeIndex: 0, segment: 0, progress: 0.15, speed: 0.005, color: "#0284C7", width: 14, height: 8 },
    { routeIndex: 0, segment: 3, progress: 0.60, speed: 0.006, color: "#10B981", width: 13, height: 7 },
    { routeIndex: 1, segment: 1, progress: 0.35, speed: 0.007, color: "#8B5CF6", width: 12, height: 7 },
    { routeIndex: 2, segment: 1, progress: 0.70, speed: 0.005, color: "#F59E0B", width: 14, height: 8 },
    { routeIndex: 3, segment: 2, progress: 0.45, speed: 0.006, color: "#EC4899", width: 13, height: 8 },
    { routeIndex: 4, segment: 1, progress: 0.25, speed: 0.005, color: "#EF4444", width: 14, height: 8 },
  ];

  function update() {
    vehicles.forEach((v) => {
      v.progress += v.speed;
      if (v.progress >= 1) {
        v.progress = 0;
        const route = routes[v.routeIndex];
        v.segment = (v.segment + 1) % (route.length - 1);
      }
    });
  }

  function getVehicles() {
    return vehicles.map((v) => {
      const route = routes[v.routeIndex];
      const p1 = route[v.segment];
      const p2 = route[(v.segment + 1) % route.length] || p1;
      const curX = p1.x + (p2.x - p1.x) * v.progress;
      const curY = p1.y + (p2.y - p1.y) * v.progress;
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

      return {
        x: curX,
        y: curY,
        angle,
        color: v.color,
        width: v.width,
        height: v.height,
      };
    });
  }

  return { update, getVehicles };
}
