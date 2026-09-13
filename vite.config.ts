import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// @ts-ignore Local Node-only development middleware.
import { localSaves } from './scripts/local-saves.mjs';
export default defineConfig({
  plugins: [react(), localSaves()],
  base: "/thelegendoftrump/",
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three", "@react-three/fiber"],
          react: ["react", "react-dom"],
        },
      },
    },
  },
});
