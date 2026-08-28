const { WebSocketServer, WebSocket } = require("ws");

const AVATAR_COLORS = [
  0x4a9fe0, // electric blue
  0xf05a38, // coral
  0x10b981, // emerald
  0x8b5cf6, // purple
  0xf59e0b, // amber
  0xec4899, // pink
  0x06b6d4, // cyan
  0x84cc16, // lime
];

function setupGameSocket(server) {
  const wss = new WebSocketServer({ server, path: "/game-ws" });

  const players = new Map(); // id -> { id, ws, color, pos, yaw, anim, speed, district, lastActive }

  function broadcast(msg, excludeId = null) {
    const data = JSON.stringify(msg);
    for (const [id, player] of players.entries()) {
      if (id !== excludeId && player.ws.readyState === WebSocket.OPEN) {
        try {
          player.ws.send(data);
        } catch (_) {}
      }
    }
  }

  function getOnlineCount() {
    return players.size;
  }

  wss.on("connection", (ws, req) => {
    const id = "p_" + Math.random().toString(36).substring(2, 9);
    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    const playerData = {
      id,
      ws,
      color,
      pos: { x: 0, y: 0, z: 0 },
      yaw: 0,
      anim: "idle",
      speed: 0,
      district: "",
      lastActive: Date.now(),
    };

    players.set(id, playerData);

    // 1. Gather existing players to send in welcome packet
    const existingPlayers = [];
    for (const [pId, p] of players.entries()) {
      if (pId !== id) {
        existingPlayers.push({
          id: p.id,
          color: p.color,
          pos: p.pos,
          yaw: p.yaw,
          anim: p.anim,
          speed: p.speed,
          district: p.district,
        });
      }
    }

    // Send welcome to this newly connected client
    const spawnIndex = Math.floor(Math.random() * 16);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "welcome",
          id,
          color,
          spawnIndex,
          players: existingPlayers,
          count: getOnlineCount(),
        })
      );
    }

    // 2. Broadcast join to all other players
    broadcast(
      {
        type: "join",
        player: {
          id,
          color,
          pos: playerData.pos,
          yaw: playerData.yaw,
          anim: playerData.anim,
          speed: playerData.speed,
          district: playerData.district,
        },
      },
      id
    );

    // 3. Broadcast updated count to all players
    broadcast({
      type: "count",
      count: getOnlineCount(),
    });

    // 4. Handle incoming messages
    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        playerData.lastActive = Date.now();

        if (msg.type === "state" || msg.type === "transform") {
          if (msg.pos) playerData.pos = msg.pos;
          if (typeof msg.yaw === "number") playerData.yaw = msg.yaw;
          if (msg.anim) playerData.anim = msg.anim;
          if (typeof msg.speed === "number") playerData.speed = msg.speed;
          if (msg.district) playerData.district = msg.district;

          broadcast(
            {
              type: "state",
              id,
              pos: playerData.pos,
              yaw: playerData.yaw,
              anim: playerData.anim,
              speed: playerData.speed,
              district: playerData.district,
            },
            id
          );
        } else if (msg.type === "chat") {
          // Ephemeral temporary proximity chat between live players (NOT stored in database)
          const text = String(msg.text || "").trim().slice(0, 300);
          if (text) {
            broadcast({
              type: "chat",
              from: id,
              to: msg.to || null,
              senderName: msg.senderName || `Player #${id.slice(2, 6).toUpperCase()}`,
              color: playerData.color,
              text,
              pos: playerData.pos,
              timestamp: Date.now(),
            });
          }
        } else if (msg.type === "ping") {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "pong" }));
          }
        }
      } catch (_) {}
    });

    // 5. Handle disconnection
    const handleClose = () => {
      if (!players.has(id)) return;
      players.delete(id);

      broadcast({
        type: "leave",
        id,
      });

      broadcast({
        type: "count",
        count: getOnlineCount(),
      });
    };

    ws.on("close", handleClose);
    ws.on("error", handleClose);
  });

  // Stale connection cleanup heartbeat every 25s
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [id, player] of players.entries()) {
      if (player.ws.readyState !== WebSocket.OPEN || now - player.lastActive > 60000) {
        try {
          player.ws.terminate();
        } catch (_) {}
        players.delete(id);
        broadcast({ type: "leave", id });
        broadcast({ type: "count", count: getOnlineCount() });
      }
    }
  }, 25000);

  wss.on("close", () => {
    clearInterval(interval);
  });

  return wss;
}

module.exports = { setupGameSocket };

