import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Consume the shared @omphalos/cards package directly from source in the
      // sibling repo (no build step) while iterating locally.
      "@omphalos/cards": fileURLToPath(
        new URL("../../../omphalos-cards/src/index.ts", import.meta.url),
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
