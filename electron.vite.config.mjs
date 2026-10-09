import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

const alias = { "@shared": resolve("src/shared") };
// Version comes from package.json; bump it with npm run release:patch|minor|major.
const { version } = JSON.parse(readFileSync("package.json", "utf8"));

export default defineConfig({
  main: { resolve: { alias } },
  preload: {},
  renderer: { plugins: [react()], resolve: { alias }, define: { __APP_VERSION__: JSON.stringify(version) } }
});
