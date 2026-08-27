/**
 * MultiplayerClient — Real-time WebSocket client for in-city player presence,
 * movement sync, and live online count.
 */

function resolveWsUrl(customUrl) {
  if (customUrl) return customUrl;

  const apiBase = import.meta.env.VITE_API_BASE_URL;
  if (apiBase) {
    try {
      const parsed = new URL(apiBase);
      parsed.protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
      parsed.pathname = "/game-ws";
      return parsed.href;
    } catch (_) {}
  }

  if (typeof window !== "undefined") {
    const isHttps = window.location.protocol === "https:";
    const protocol = isHttps ? "wss:" : "ws:";
    const host =
      window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "localhost:5000"
        : window.location.host;
    return `${protocol}//${host}/game-ws`;
  }

  return "ws://localhost:5000/game-ws";
}

export class MultiplayerClient {
  constructor(opts = {}) {
    this.url = resolveWsUrl(opts.url);
    this.name = opts.name || "Player";
    this.id = null;
    this.color = null;
    this.count = 1;
    this.connected = false;
    this._handlers = {};
    this._disposed = false;
    this._ws = null;
    this._reconnectTimer = null;
    this._reconnectAttempts = 0;
    this._pingTimer = null;
    this._lastSendTime = 0;
    this._throttleMs = 65; // ~15Hz

    this._connect();
  }

  on(evt, fn) {
    (this._handlers[evt] ||= []).push(fn);
    return this;
  }

  off(evt, fn) {
    if (!this._handlers[evt]) return this;
    this._handlers[evt] = this._handlers[evt].filter((cb) => cb !== fn);
    return this;
  }

  _emit(evt, ...args) {
    (this._handlers[evt] || []).forEach((fn) => {
      try {
        fn(...args);
      } catch (err) {
        console.error(`[MultiplayerClient] Error in "${evt}" listener:`, err);
      }
    });
  }

  _connect() {
    if (this._disposed) return;

    try {
      this._ws = new WebSocket(this.url);

      this._ws.onopen = () => {
        if (this._disposed) {
          this._ws.close();
          return;
        }
        this.connected = true;
        this._reconnectAttempts = 0;
        this._startHeartbeat();
      };

      this._ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this._handleMessage(msg);
        } catch (_) {}
      };

      this._ws.onclose = () => {
        this.connected = false;
        this._stopHeartbeat();
        this._scheduleReconnect();
      };

      this._ws.onerror = () => {
        this.connected = false;
      };
    } catch (_) {
      this._scheduleReconnect();
    }
  }

  _handleMessage(msg) {
    if (!msg || typeof msg !== "object") return;

    switch (msg.type) {
      case "welcome":
        this.id = msg.id;
        this.color = msg.color;
        if (typeof msg.count === "number") {
          this.count = msg.count;
          this._emit("count", this.count);
        }
        this._emit("welcome", msg);
        if (Array.isArray(msg.players)) {
          msg.players.forEach((p) => this._emit("join", p));
        }
        break;

      case "count":
        if (typeof msg.count === "number") {
          this.count = msg.count;
          this._emit("count", this.count);
        }
        break;

      case "join":
        if (msg.player && msg.player.id !== this.id) {
          this._emit("join", msg.player);
        }
        break;

      case "leave":
        if (msg.id && msg.id !== this.id) {
          this._emit("leave", msg.id);
        }
        break;

      case "state":
        if (msg.id && msg.id !== this.id) {
          this._emit("state", msg.id, {
            pos: msg.pos,
            yaw: msg.yaw,
            anim: msg.anim,
            speed: msg.speed,
            district: msg.district,
          });
        }
        break;

      case "pong":
        break;

      default:
        break;
    }
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this._pingTimer = setInterval(() => {
      if (this._ws && this._ws.readyState === WebSocket.OPEN) {
        this._ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 20000);
  }

  _stopHeartbeat() {
    if (this._pingTimer) {
      clearInterval(this._pingTimer);
      this._pingTimer = null;
    }
  }

  _scheduleReconnect() {
    if (this._disposed || this._reconnectTimer) return;
    const delay = Math.min(1000 * Math.pow(1.5, this._reconnectAttempts), 8000);
    this._reconnectAttempts++;
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this._connect();
    }, delay);
  }

  sendTransform(data) {
    if (this._disposed || !this._ws || this._ws.readyState !== WebSocket.OPEN) return;

    const now = performance.now();
    if (now - this._lastSendTime < this._throttleMs) return;
    this._lastSendTime = now;

    const payload = {
      type: "state",
      pos: data.pos ? { x: Number(data.pos.x.toFixed(3)), y: Number(data.pos.y.toFixed(3)), z: Number(data.pos.z.toFixed(3)) } : null,
      yaw: typeof data.yaw === "number" ? Number(data.yaw.toFixed(3)) : 0,
      anim: data.anim || "idle",
      speed: typeof data.speed === "number" ? Number(data.speed.toFixed(2)) : 0,
      district: data.district || "",
    };

    try {
      this._ws.send(JSON.stringify(payload));
    } catch (_) {}
  }

  dispose() {
    this._disposed = true;
    this._stopHeartbeat();
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    if (this._ws) {
      try {
        this._ws.close();
      } catch (_) {}
      this._ws = null;
    }
    this._handlers = {};
  }
}
