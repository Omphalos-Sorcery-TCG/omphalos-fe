import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Consume the shared types package directly from source (no build step).
      "@sorcery/types": fileURLToPath(
        new URL("../../packages/types/src/index.ts", import.meta.url),
      ),
    },
  },
  // Serve the repo-root /public so cards.json (/cards.json) and the 3,076 card
  // images (/cards/<slug>.png) are available without copying 3 GB into the app.
  publicDir: `${repoRoot}public`,
  server: {
    port: 5173,
    open: false,
  },
});
