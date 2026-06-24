import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

export default defineConfig({
  plugins: [react()],
  // Serve the repo-root /public so cards.json (/cards.json) and the 3,076 card
  // images (/cards/<slug>.png) are available without copying 3 GB into the app.
  publicDir: `${repoRoot}public`,
  server: {
    port: 5173,
    open: false,
  },
});
