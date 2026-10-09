import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@shared": resolve("src/shared") } },
  define: { __APP_VERSION__: JSON.stringify("0.0.0-test") },
  test: {
    include: ["tests/unit/**/*.test.{js,jsx}"],
    setupFiles: ["tests/setup.js"]
  }
});