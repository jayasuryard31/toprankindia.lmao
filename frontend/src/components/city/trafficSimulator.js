/**
 * Top-Down Ambient Vehicle & Highway Traffic Simulator
 */

export function createTrafficSimulator() {
  const routes = [
    // Main Purple Arterial Track
    [
      { x: 380, y: 460 },
      { x: 390, y: 320 },
      { x: 480, y: 260 },
      { x: 600, y: 390 },
      { x: 720, y: 390 },
      { x: 910, y: 390 },
      { x: 910, y: 560 },
    ],
    // South-West Road
    [
      { x: 260, y: 590 },
      { x: 340, y: 590 },
      { x: 480, y: 590 },
      { x: 550, y: 480 },
      { x: 600, y: 390 },
    ],
    // East Bridge Crossway
    [
      { x: 600, y: 390 },
      { x: 780, y: 530 },
      { x: 910, y: 530 },
      { x: 960, y: 530 },
      { x: 960, y: 680 },
    ],
  ];

  const vehicles = [
    { routeIndex: 0, segment: 0, progress: 0.15, speed: 0.007, color: "#8B5CF6", width: 14, height: 8 },
    { routeIndex: 0, segment: 2, progress: 0.65, speed: 0.009, color: "#3B82F6", width: 12, height: 7 },
    { routeIndex: 0, segment: 4, progress: 0.40, speed: 0.008, color: "#EC4899", width: 11, height: 7 },
    { routeIndex: 1, segment: 1, progress: 0.30, speed: 0.006, color: "#10B981", width: 12, height: 7 },
    { routeIndex: 2, segment: 0, progress: 0.80, speed: 0.007, color: "#F59E0B", width: 14, height: 8 },
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
