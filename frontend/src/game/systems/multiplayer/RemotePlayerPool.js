import * as THREE from "three";
import { loadCharacter } from "../../characters/loadCharacter";

function createNameTag(label) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");

  // Background pill
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.beginPath();
  ctx.roundRect(16, 12, 224, 40, 20);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Text
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.4, 0.35, 1);
  sprite.position.y = 1.95;
  sprite.renderOrder = 999;
  return sprite;
}

export class RemotePlayerPool {
  constructor(engine) {
    this.engine = engine;
    this.players = new Map(); // id -> { id, color, char, targetPos, currentPos, targetYaw, currentYaw, animState, speed, tag, disposed }
    this._disposed = false;
  }

  async spawn(player) {
    if (this._disposed || !player || !player.id) return;

    if (this.players.has(player.id)) {
      const existing = this.players.get(player.id);
      if (player.pos) existing.targetPos.set(player.pos.x, player.pos.y, player.pos.z);
      if (typeof player.yaw === "number") existing.targetYaw = player.yaw;
      if (player.anim) existing.animState = player.anim;
      if (typeof player.speed === "number") existing.speed = player.speed;
      return;
    }

    const initPos = player.pos || { x: 0, y: 0, z: 0 };
    const entry = {
      id: player.id,
      color: player.color,
      char: null,
      tag: null,
      currentPos: new THREE.Vector3(initPos.x, initPos.y, initPos.z),
      targetPos: new THREE.Vector3(initPos.x, initPos.y, initPos.z),
      currentYaw: player.yaw || 0,
      targetYaw: player.yaw || 0,
      animState: player.anim || "idle",
      speed: player.speed || 0,
      disposed: false,
    };

    this.players.set(player.id, entry);

    try {
      const char = await loadCharacter(null, { shirt: player.color });
      if (this._disposed || entry.disposed || !this.players.has(player.id)) {
        char.dispose();
        return;
      }

      char.group.position.copy(entry.currentPos);
      char.group.rotation.y = entry.currentYaw;

      // Overhead name tag
      const shortId = player.id.startsWith("p_") ? player.id.slice(2, 6).toUpperCase() : player.id.slice(0, 4);
      const tag = createNameTag(`Player #${shortId}`);
      char.group.add(tag);

      this.engine.scene.add(char.group);
      entry.char = char;
      entry.tag = tag;
    } catch (err) {
      console.warn("[RemotePlayerPool] Failed to load remote avatar:", err);
    }
  }

  despawn(id) {
    if (!this.players.has(id)) return;
    const entry = this.players.get(id);
    entry.disposed = true;
    if (entry.char) {
      this.engine.scene.remove(entry.char.group);
      entry.char.dispose();
    }
    if (entry.tag) {
      entry.tag.material?.map?.dispose();
      entry.tag.material?.dispose();
    }
    this.players.delete(id);
  }

  updateState(id, data) {
    if (!this.players.has(id)) {
      this.spawn({ id, ...data });
      return;
    }
    const entry = this.players.get(id);
    if (data.pos) {
      entry.targetPos.set(data.pos.x, data.pos.y, data.pos.z);
    }
    if (typeof data.yaw === "number") {
      entry.targetYaw = data.yaw;
    }
    if (data.anim) {
      entry.animState = data.anim;
    }
    if (typeof data.speed === "number") {
      entry.speed = data.speed;
    }
  }

  update(dt) {
    if (this._disposed) return;
    const lerpFactor = Math.min(1, dt * 10);

    for (const entry of this.players.values()) {
      if (!entry.char || entry.disposed) continue;

      // 1. Position interpolation
      entry.currentPos.lerp(entry.targetPos, lerpFactor);
      entry.char.group.position.copy(entry.currentPos);

      // 2. Shortest-path angle rotation interpolation
      let dy = entry.targetYaw - entry.currentYaw;
      while (dy < -Math.PI) dy += Math.PI * 2;
      while (dy > Math.PI) dy -= Math.PI * 2;
      entry.currentYaw += dy * lerpFactor;
      entry.char.group.rotation.y = entry.currentYaw;

      // 3. Drive procedural animator pose
      if (entry.animState === "fall") {
        entry.fallTimer = (entry.fallTimer || 0) + dt;
        if (entry.fallTimer > 1.9) entry.fallTimer = 1.9;
      } else {
        entry.fallTimer = 0;
      }

      const isEmote = entry.animState && entry.animState !== "idle" && entry.animState !== "walk" && entry.animState !== "run" && entry.animState !== "sprint" && entry.animState !== "jump" && entry.animState !== "crouch" && entry.animState !== "fall";

      entry.char.update(dt, {
        state: isEmote ? "idle" : (entry.animState || "idle"),
        emote: isEmote ? entry.animState : null,
        fallTime: entry.fallTimer,
        speed: entry.speed || 0,
        grounded: true,
      });
    }
  }

  dispose() {
    this._disposed = true;
    for (const [id] of this.players) {
      this.despawn(id);
    }
    this.players.clear();
  }
}

