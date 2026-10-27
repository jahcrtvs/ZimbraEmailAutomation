import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In `npm run dev`, serve /api/download with the same handler Vercel runs (needs GITHUB_TOKEN in the shell).
const api = {
  name: "dev-api",
  configureServer(server) {
    server.middlewares.use("/api/download", async (req, res) => {
      const { default: handler } = await server.ssrLoadModule("/api/download.js");
      handler(req, res);
    });
  },
};

export default defineConfig({ plugins: [react(), api], server: { port: 5174 } });
