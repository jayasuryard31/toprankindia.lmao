/**
 * postfx.js — optional EffectComposer pipeline with a hard fallback to the
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

const BLOOM_LAYER = 1;
const dark = new THREE.MeshBasicMaterial({ color: 0x000000 });

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
  bloomComposer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(size.clone(), 0.55, 0.6, 0.35);
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
        void main(){ gl_FragColor = texture2D(baseTexture, vUv) + vec4(1.0) * texture2D(bloomTexture, vUv); }`,
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

  const bloomLayer = new THREE.Layers();
  bloomLayer.set(BLOOM_LAYER);
  const stash = {};

  function darken(obj) {
    if (obj.isMesh) {
      const glows = obj.userData && obj.userData.bloom;
      if (!glows) {
        stash[obj.uuid] = obj.material;
        obj.material = dark;
      }
    }
  }
  function restore(obj) {
    if (stash[obj.uuid]) {
      obj.material = stash[obj.uuid];
      delete stash[obj.uuid];
    }
  }

  return {
    render() {
      scene.traverse(darken);
      bloomComposer.render();
      scene.traverse(restore);
      finalComposer.render();
    },
    setSize(w, h) {
      bloomComposer.setSize(w, h);
      finalComposer.setSize(w, h);
    },
    dispose() {
      bloomComposer.dispose();
      finalComposer.dispose();
    },
  };
}
