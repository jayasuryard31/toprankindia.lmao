import { createPlayerModel } from "./player/PlayerModel";
import { PlayerAnimator } from "./player/PlayerAnimator";

/**
 * Character adapter contract - the ONLY thing gameplay code touches:
 *
 *   const char = await loadCharacter(urlOrNull, opts);
 *   char.group                       // THREE.Object3D, feet at origin
 *   char.update(dt, { state, speed }) // drive current locomotion pose
 *   char.setColor(hex)               // accent colour (team / brand)
 *   char.dispose()
 *
 * `url` null / undefined  -> procedural humanoid (works today, no assets).
 * `url` "*.glb" / "*.gltf" -> loaded with GLTFLoader + AnimationMixer, mapping
 *   clip names to the same { idle, walk, run, jump, crouch } states. Drop real
 *   models into src/game/characters/models/ and pass their path - no other
 *   code changes.
 */
export async function loadCharacter(url, opts = {}) {
  if (!url) return createProceduralAdapter(opts);

  try {
    const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
    const THREE = await import("three");
    const gltf = await new Promise((res, rej) => new GLTFLoader().load(url, res, undefined, rej));
    const group = gltf.scene;
    group.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    const mixer = new THREE.AnimationMixer(group);
    const clips = {};
    for (const clip of gltf.animations) {
      const key = matchState(clip.name);
      if (key && !clips[key]) clips[key] = mixer.clipAction(clip);
    }
    let current = null;
    const play = (state) => {
      const next = clips[state] || clips.idle;
      if (!next || next === current) return;
      next.reset().fadeIn(0.2).play();
      if (current) current.fadeOut(0.2);
      current = next;
    };
    play("idle");
    return {
      group,
      update: (dt, { state = "idle" } = {}) => {
        play(state);
        mixer.update(dt);
      },
      setColor: () => {},
      dispose: () => mixer.stopAllAction(),
    };
  } catch (err) {
    console.warn("[loadCharacter] falling back to procedural model:", err);
    return createProceduralAdapter(opts);
  }
}

function matchState(name = "") {
  const n = name.toLowerCase();
  if (n.includes("idle")) return "idle";
  if (n.includes("sprint") || n.includes("run")) return "run";
  if (n.includes("walk")) return "walk";
  if (n.includes("jump")) return "jump";
  if (n.includes("crouch") || n.includes("crawl")) return "crouch";
  return null;
}

function createProceduralAdapter(opts) {
  const model = createPlayerModel(opts);
  const animator = new PlayerAnimator(model.rig);
  return {
    group: model.group,
    update: (dt, s) => animator.update(dt, s),
    triggerJump: () => animator.triggerJump(),
    setColor: (hex) => model.setColor(hex),
    dispose: () => model.dispose(),
  };
}
