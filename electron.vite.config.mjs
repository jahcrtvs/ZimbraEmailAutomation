import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

const alias = { "@shared": resolve("src/shared") };

export default defineConfig({
  main: { resolve: { alias } },
  preload: {},
  renderer: { plugins: [react()], resolve: { alias } }
});