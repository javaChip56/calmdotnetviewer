import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repoRoot = path.resolve(__dirname, "../../../..");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@finos/calm-models/model": path.resolve(repoRoot, "calm-models/src/model/index.ts"),
      "@finos/calm-models/types": path.resolve(repoRoot, "calm-models/src/types/index.ts"),
      "@finos/calm-models/canonical": path.resolve(repoRoot, "calm-models/src/canonical/template-models.ts"),
      "@repo/calm-widgets": path.resolve(repoRoot, "calm-widgets/src"),
      lodash: path.resolve(__dirname, "node_modules/lodash/lodash.js")
    }
  },
  server: {
    port: 5173,
    fs: {
      allow: [repoRoot]
    },
    proxy: {
      "/api": "http://localhost:5073",
      "/health": "http://localhost:5073"
    }
  }
});
