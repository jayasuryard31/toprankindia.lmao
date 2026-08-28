import * as THREE from "three";
import { loadCharacter } from "./characters/loadCharacter";
import { PlayerController } from "./systems/movement/PlayerController";
import { ThirdPersonCamera } from "./systems/camera/ThirdPersonCamera";
import { InteractionSystem } from "./systems/interaction/InteractionSystem";
import { buildVacantPlots } from "./world/VacantPlots";
import { MultiplayerClient } from "./systems/multiplayer/MultiplayerClient";
import { RemotePlayerPool } from "./systems/multiplayer/RemotePlayerPool";

/**
 * Orchestrates the in-city game layer. Owns the player, the third-person
 * camera rig, movement, interaction and the cinematic map→street transition.
 * A single `update(dt)` is driven by ThreeCityEngine's own render loop
 * (engine.setGameHook), so ambient traffic / water / clouds keep running.
 */
export class GameController {
  constructor(engine, { onState } = {}) {
    this.engine = engine;
    this.onState = onState || (() => {});
    this.phase = "idle"; // idle -> cinematic -> playing -> leaving
    this.input = {
      forward: false, back: false, left: false, right: false,
      run: false, sprint: false, crouch: false, jumpPressed: false,
    };
    this.player = null;
    this.char = null;
    this.cam = null;
    this.interaction = new InteractionSystem(engine);
    this.vacant = null;
    this.mp = null;
    this.remotePool = new RemotePlayerPool(engine);
    this.onlineCount = 1;
    this._cine = null;
    this._savedCam = null;
    this._interactable = null;
    this._locate = { district: "", area: "" };
    this._elapsed = 0;
  }

  async enter() {
    const engine = this.engine;
    this.phase = "cinematic";
    this._savedCam = {
      pos: engine.camera.position.clone(),
      target: engine.target.clone(),
      spherical: engine.spherical.clone(),
      fov: engine.camera.fov,
      near: engine.camera.near,
    };
    engine.enterGameMode();
    engine.camera.fov = 62;
    engine.camera.near = 0.2;
    engine.camera.updateProjectionMatrix();

    // Initial randomized spawn point across the city
    let spawn = engine.getSpawnPoint();
    this.spawn = spawn;

    // character + player controller
    const char = await loadCharacter(null); // default look
    if (this._disposed) {
      char.dispose();
      return;
    }
    this.char = char;
    this.char.group.position.set(spawn.x, 0.10, spawn.z);
    this.char.group.rotation.y = spawn.yaw;
    this.char.group.visible = false; // revealed at end of cinematic
    engine.scene.add(this.char.group);

    this.player = new PlayerController(engine, spawn);
    this.player.onJump = () => this.char?.triggerJump?.();
    this.player.onHit = () => this.cam?.addImpulse?.(0.4);
    this.cam = new ThirdPersonCamera(engine.camera, engine);
    this.cam.alignBehind(spawn.yaw);

    // initialize multiplayer client
    this.mp = new MultiplayerClient();
    this.mp.on("welcome", (data) => {
      if (data.color && this.char) {
        this.char.setColor?.(data.color);
      }
      if (typeof data.count === "number") {
        this.onlineCount = data.count;
        this._emit();
      }

      // If still in cinematic entry phase, refine spawn against online peers
      if (this.phase === "cinematic" && (data.players?.length || typeof data.spawnIndex === "number")) {
        const refinedSpawn = engine.getSpawnPoint(data.players || [], data.spawnIndex);
        if (refinedSpawn) {
          this.spawn = refinedSpawn;
          this.player.pos.set(refinedSpawn.x, refinedSpawn.y ?? 0.10, refinedSpawn.z);
          this.player.yaw = refinedSpawn.yaw;
          this.char.group.position.set(refinedSpawn.x, refinedSpawn.y ?? 0.10, refinedSpawn.z);
          this.char.group.rotation.y = refinedSpawn.yaw;
          this.cam.alignBehind(refinedSpawn.yaw);

          // Update cinematic camera destination
          if (this._cine) {
            this._cine.mid.set(refinedSpawn.x - 6, 240, refinedSpawn.z + 90);
            this._cine.to.set(refinedSpawn.x - 3, 3.2, refinedSpawn.z + 7);
            this._cine.lookTo.set(refinedSpawn.x, 1.6, refinedSpawn.z);
          }
        }
      }
    });
    this.mp.on("count", (count) => {
      this.onlineCount = count;
      this._emit();
    });
    this.mp.on("join", (player) => {
      this.remotePool.spawn(player);
    });
    this.mp.on("leave", (id) => {
      this.remotePool.despawn(id);
    });
    this.mp.on("state", (id, state) => {
      this.remotePool.updateState(id, state);
    });
    this.mp.on("chat", (msg) => {
      if (msg && msg.from) {
        this.remotePool.showSpeechBubble(msg.from, msg.text);
        this.onChat?.(msg);
      }
    });

    // dress undeveloped lots
    this.vacant = buildVacantPlots(engine, { max: 90 });
    engine.scene.add(this.vacant);

    // register solid world props: fences + signs from the plots, plus the
    // streetlights / trees the city engine placed.
    engine.clearExtraSolids();
    engine.addSolids(this.vacant.userData.colliders || []);
    if (engine.propColliders) engine.addSolids(engine.propColliders);

    // cinematic: current aerial -> high above spawn -> street level behind player
    const from = engine.camera.position.clone();
    const highAbove = new THREE.Vector3(spawn.x - 6, 240, spawn.z + 90);
    const streetCam = new THREE.Vector3(spawn.x - 3, 3.2, spawn.z + 7);
    this._cine = {
      t: 0,
      dur: 3.4,
      from,
      mid: highAbove,
      to: streetCam,
      lookFrom: engine.target.clone(),
      lookTo: new THREE.Vector3(spawn.x, 1.6, spawn.z),
    };
    this._emit();
  }

  setInput(partial) {
    Object.assign(this.input, partial);
  }

  addMouse(dx, dy) {
    if (this.phase === "playing" && this.cam) this.cam.addMouse(dx, dy);
  }

  /** Called when the player presses the emote key (O). */
  triggerEmote(name = null) {
    if (this.phase === "playing" && this.player) {
      const chosen = this.player.triggerEmote(name);
      if (chosen && this.mp) {
        this.mp.sendTransform({
          pos: this.player.pos,
          yaw: this.player.yaw,
          anim: chosen,
          speed: 0,
          district: this._locate.district,
        });
      }
      return chosen;
    }
    return null;
  }

  update(dt) {
    dt = Math.min(dt, 0.05);
    this._elapsed += dt;

    // update remote players in the 3D scene
    if (this.remotePool) {
      this.remotePool.update(dt);
    }

    if (this.phase === "cinematic") {
      this._updateCinematic(dt);
      return;
    }
    if (this.phase !== "playing") return;

    const cs = this.player.update(dt, this.input, this.cam.yaw);
    this.input.jumpPressed = false;

    // sync transform to multiplayer peers
    if (this.mp) {
      this.mp.sendTransform({
        pos: cs.pos,
        yaw: cs.yaw,
        anim: cs.emote || cs.state,
        speed: cs.speed,
        district: this._locate.district,
      });
    }

    // place model
    this.char.group.position.set(cs.pos.x, cs.pos.y, cs.pos.z);
    this.char.group.rotation.y = cs.yaw;
    this.char.update(dt, {
      state: cs.state,
      emote: cs.emote,
      emoteTime: cs.emoteTime,
      fallTime: cs.fallTime,
      speed: cs.speed,
      grounded: cs.grounded,
      vy: cs.vy,
    });

    this.cam.update(dt, cs.pos, { sprint: Boolean(this.input.sprint || this.input.run) });

    // interaction + locate + proximity peer scanning at a lower cadence
    this._scanAcc = (this._scanAcc || 0) + dt;
    if (this._scanAcc > 0.12) {
      this._scanAcc = 0;
      this._interactable = this.interaction.scan(cs.pos);
      this._locate = this.interaction.locate(cs.pos);
      this._nearbyPlayer = this.remotePool ? this.remotePool.getNearestPlayer(cs.pos, 8.5) : null;
      this._emit();
    }
  }

  /**
   * What the player would interact with right now. GameMode calls this on [E].
   * Re-scans on demand so a stale 8Hz cache can never swallow the keypress.
   */
  interact() {
    if (this.phase !== "playing" || !this.player) return null;
    this._interactable = this.interaction.scan(this.player.pos);
    return this._interactable;
  }

  /** Get the currently nearby player (within 8.5m) for proximity chat. */
  getNearbyPlayer() {
    if (this.phase !== "playing" || !this.player || !this.remotePool) return null;
    return this.remotePool.getNearestPlayer(this.player.pos, 8.5);
  }

  /** Send temporary proximity chat message to live players (not saved in DB). */
  sendChat(text, to = null) {
    if (!this.mp) return;
    this.mp.sendChat(text, to);
    this._showLocalBubble(text);
  }

  _showLocalBubble(text) {
    if (!this.char || !this.char.group) return;
    if (this._localBubble) {
      this.char.group.remove(this._localBubble);
      this._localBubble.material?.map?.dispose?.();
      this._localBubble.material?.dispose?.();
      this._localBubble = null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 384;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
    ctx.beginPath();
    ctx.roundRect(16, 12, 352, 80, 24);
    ctx.fill();
    ctx.strokeStyle = "#f05a38";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(180, 92);
    ctx.lineTo(192, 114);
    ctx.lineTo(204, 92);
    ctx.closePath();
    ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
    ctx.fill();
    ctx.strokeStyle = "#f05a38";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const display = text.length > 26 ? text.slice(0, 24) + "…" : text;
    ctx.fillText(`💬 ${display}`, 192, 52);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2.4, 0.8, 1);
    sprite.position.y = 2.45;
    sprite.renderOrder = 1000;
    this.char.group.add(sprite);
    this._localBubble = sprite;

    if (this._localBubbleTimer) clearTimeout(this._localBubbleTimer);
    this._localBubbleTimer = setTimeout(() => {
      if (this._localBubble && this.char) {
        this.char.group.remove(this._localBubble);
        this._localBubble.material?.map?.dispose?.();
        this._localBubble.material?.dispose?.();
        this._localBubble = null;
      }
    }, 5000);
  }

  /** Screen anchor just above the player's head, for in-world panels. */
  getHeadAnchor() {
    if (!this.player || !this.engine.getProjectedPoint) return null;
    const p = this.player.pos;
    return this.engine.getProjectedPoint(p.x, p.z, p.y + 2.35);
  }

  _updateCinematic(dt) {
    const c = this._cine;
    c.t += dt / c.dur;
    const k = easeInOut(Math.min(1, c.t));
    // quadratic bezier from -> mid -> to
    const p = quadBezier(c.from, c.mid, c.to, k);
    this.engine.camera.position.copy(p);
    const look = c.lookFrom.clone().lerp(c.lookTo, easeInOut(Math.min(1, c.t * 1.15)));
    this.engine.camera.lookAt(look);

    if (c.t >= 0.62 && this.char) this.char.group.visible = true;

    if (c.t >= 1) {
      this.phase = "playing";
      this.cam.snap(this.player.pos);
      this._interactable = this.interaction.scan(this.player.pos);
      this._locate = this.interaction.locate(this.player.pos);
      this._nearbyPlayer = this.remotePool ? this.remotePool.getNearestPlayer(this.player.pos, 8.5) : null;
      this._emit();
    }
  }

  async leave() {
    if (this.phase === "leaving" || this.phase === "idle") return;
    this.phase = "leaving";
    this._emit();
    // quick lift back to the saved aerial framing - time-boxed so a throttled
    // rAF (e.g. a hidden tab) can never make the exit hang.
    const engine = this.engine;
    const from = engine.camera.position.clone();
    const to = this._savedCam.pos.clone();
    const lookFrom = this.player ? this.player.pos.clone().setY(1.6) : engine.target.clone();
    const lookTo = this._savedCam.target.clone();
    await Promise.race([
      tween(1.4, (k) => {
        const e = easeInOut(k);
        engine.camera.position.lerpVectors(from, to, e);
        engine.camera.lookAt(lookFrom.clone().lerp(lookTo, e));
      }),
      new Promise((r) => setTimeout(r, 1800)),
    ]);
    this.dispose();
  }

  dispose() {
    this._disposed = true;
    const engine = this.engine;
    engine.setGameHook(null);
    if (this.char) {
      engine.scene.remove(this.char.group);
      this.char.dispose();
    }
    if (this.vacant) {
      engine.scene.remove(this.vacant);
      this.vacant.userData.dispose?.();
    }
    if (this.remotePool) {
      this.remotePool.dispose();
    }
    if (this.mp) {
      this.mp.dispose();
      this.mp = null;
    }
    engine.clearExtraSolids?.();
    if (this._savedCam) {
      engine.target.copy(this._savedCam.target);
      engine.spherical.copy(this._savedCam.spherical);
      engine.camera.fov = this._savedCam.fov;
      engine.camera.near = this._savedCam.near;
      engine.camera.updateProjectionMatrix();
    }
    engine.exitGameMode();
    this.phase = "idle";
    this.player = null;
    this.char = null;
    this.cam = null;
    this._emit();
  }

  _emit() {
    this.onState({
      phase: this.phase,
      interactable: this._interactable,
      nearbyPlayer: this._nearbyPlayer,
      locate: this._locate,
      player: this.player ? this.player.pos : null,
      headAnchor: this.getHeadAnchor(),
      camYaw: this.cam ? this.cam.yaw : 0,
      online: this.onlineCount,
      myId: this.mp?.id,
    });
  }
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
function quadBezier(a, b, c, t) {
  const u = 1 - t;
  return new THREE.Vector3(
    u * u * a.x + 2 * u * t * b.x + t * t * c.x,
    u * u * a.y + 2 * u * t * b.y + t * t * c.y,
    u * u * a.z + 2 * u * t * b.z + t * t * c.z
  );
}
function tween(dur, fn) {
  return new Promise((resolve) => {
    const start = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - start) / (dur * 1000));
      fn(k);
      if (k < 1) requestAnimationFrame(step);
      else resolve();
    };
    step();
  });
}
