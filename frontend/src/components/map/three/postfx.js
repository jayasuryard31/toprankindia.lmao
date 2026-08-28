/**
 * postfx.js - optional EffectComposer pipeline with a hard fallback to the
 * plain renderer. Selective bloom: only meshes tagged userData.bloom (lit
 * windows, beacons, the #1 crown ring) glow.
 */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { GammaCorrectionShader } from "three/addons/shaders/GammaCorrectionShader.js";

const dark = new THREE.MeshBasicMaterial({ color: 0x000000 });

// The bloom chain's whole output is a blur, so feeding it a half-resolution
// render is visually indistinguishable from full res while costing a quarter
// of the fill - and the bloom pass re-renders the entire scene, so this is the
// single cheapest way to claw that back. The final image stays full res.
const BLOOM_SCALE = 0.5;

export function shouldEnablePostFX() {
  if (typeof window === "undefined") return false;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const small = window.innerWidth < 820;
  const lowDpr = (window.devicePixelRatio || 1) < 1;
  return !reduce && !small && !lowDpr;
}

export function createPostFX(renderer, scene, camera) {
  const size = new THREE.Vector2();
  renderer.getSize(size);

  const bloomComposer = new EffectComposer(renderer);
  bloomComposer.renderToScreen = false;
  bloomComposer.setSize(Math.max(1, Math.round(size.x * BLOOM_SCALE)),
                        Math.max(1, Math.round(size.y * BLOOM_SCALE)));
  bloomComposer.addPass(new RenderPass(scene, camera));
  // strength / radius / threshold.
  // Tuned DOWN hard: at 0.55/0.6 the Times Square sign wall blew into a single
  // white blob you could not read a word through. Bloom's job here is a halo
  // around lamps and sign edges, not a light source of its own.
  const bloomPass = new UnrealBloomPass(size.clone(), 0.28, 0.45, 0.62);
  bloomComposer.addPass(bloomPass);

  const mixPass = new ShaderPass(
    new THREE.ShaderMaterial({
      uniforms: {
        baseTexture: { value: null },
        bloomTexture: { value: bloomComposer.renderTarget2.texture },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform sampler2D baseTexture; uniform sampler2D bloomTexture; varying vec2 vUv;
        void main(){ gl_FragColor = texture2D(baseTexture, vUv) + 0.8 * texture2D(bloomTexture, vUv); }`,
      defines: {},
    }),
    "baseTexture"
  );
  mixPass.needsSwap = true;

  const finalComposer = new EffectComposer(renderer);
  finalComposer.addPass(new RenderPass(scene, camera));
  finalComposer.addPass(mixPass);
  finalComposer.addPass(new ShaderPass(GammaCorrectionShader));
  finalComposer.addPass(new SMAAPass(size.x, size.y));

  // ── Cached darken list ──────────────────────────────────────────────
  // The naive version ran scene.traverse() TWICE every frame to find which
  // meshes to black out. This scene is ~23k meshes inside ~39k Object3Ds, so
  // that was ~80k node visits plus ~46k material writes per frame, purely to
  // rediscover a set that only changes when the world is rebuilt.
  //
  // Instead: walk once, keep the non-bloom meshes in a flat array, and reuse
  // it until something invalidates it. Identical output, no per-frame walk.
  let occluders = [];   // meshes that must render black in the bloom pass
  let saved = [];       // their real materials, parallel to `occluders`
  let dirty = true;
  let lastBuild = 0;

  function rebuild() {
    occluders.length = 0;
    scene.traverse((o) => {
      if (o.isMesh && !(o.userData && o.userData.bloom)) occluders.push(o);
    });
    saved = new Array(occluders.length);
    dirty = false;
    lastBuild = performance.now();
  }

  return {
    /** Call when meshes are added/removed outside the tracked rebuild hooks. */
    invalidate() {
      dirty = true;
    },
    render() {
      // Safety net: anything that adds meshes without calling invalidate()
      // (a multiplayer peer joining, say) is picked up within a second.
      if (dirty || performance.now() - lastBuild > 1000) rebuild();

      for (let i = 0; i < occluders.length; i++) {
        saved[i] = occluders[i].material;
        occluders[i].material = dark;
      }
      // Flag the bloom pass so anything with an expensive onBeforeRender can
      // opt out of it. Water surfaces in particular re-render the whole scene
      // into a reflection target, and in this pass they are painted flat black
      // - the reflection would be computed and immediately discarded.
      scene.userData.bloomPass = true;
      bloomComposer.render();
      scene.userData.bloomPass = false;
      for (let i = 0; i < occluders.length; i++) {
        occluders[i].material = saved[i];
        saved[i] = null;
      }
      finalComposer.render();
    },
    setSize(w, h) {
      bloomComposer.setSize(Math.max(1, Math.round(w * BLOOM_SCALE)),
                            Math.max(1, Math.round(h * BLOOM_SCALE)));
      finalComposer.setSize(w, h);
    },
    dispose() {
      bloomComposer.dispose();
      finalComposer.dispose();
    },
  };
}
