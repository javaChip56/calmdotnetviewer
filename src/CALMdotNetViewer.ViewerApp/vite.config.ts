import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const dotnetRoot = path.resolve(__dirname, "../..");
const packagesRoot = path.resolve(dotnetRoot, "packages");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@finos/calm-models/model": path.resolve(packagesRoot, "calm-models/src/model/index.ts"),
      "@finos/calm-models/types": path.resolve(packagesRoot, "calm-models/src/types/index.ts"),
      "@finos/calm-models/canonical": path.resolve(packagesRoot, "calm-models/src/canonical/template-models.ts"),
      "@repo/calm-widgets": path.resolve(packagesRoot, "calm-widgets/src"),
      lodash: path.resolve(__dirname, "node_modules/lodash/lodash.js")
    }
  },
  server: {
    port: 5173,
    fs: {
      allow: [dotnetRoot]
    },
    proxy: {
      "/api": "http://localhost:5073",
      "/health": "http://localhost:5073"
    }
  }
});
