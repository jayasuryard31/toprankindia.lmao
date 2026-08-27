import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  build: {
    rollupOptions: {
      output: {
        // Keep three.js (+ its examples/addons) in a dedicated, separately
        // cacheable chunk instead of inlining it into the map bundle.
        manualChunks(id) {
          if (id.includes("node_modules/three/")) return "vendor-three";
          if (id.includes("node_modules/maplibre-gl/")) return "vendor-maplibre";
        },
      },
    },
  },
})
