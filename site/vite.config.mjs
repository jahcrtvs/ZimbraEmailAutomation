import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In `npm run dev`, serve /api/* with the same handlers Vercel runs (needs GITHUB_TOKEN in the shell),
// and /downloads like the rewrite in vercel.json.
const api = {
  name: "dev-api",
  configureServer(server) {
    for (const name of ["download", "version", "releases"]) {
      server.middlewares.use("/api/" + name, async (req, res) => {
        const { default: handler } = await server.ssrLoadModule(`/api/${name}.js`);
        handler(req, res);
      });
    }
    server.middlewares.use((req, _res, next) => { if (req.url === "/downloads") req.url = "/downloads.html"; next(); });
  },
};

export default defineConfig({
  plugins: [react(), api],
  server: { port: 5174 },
  build: { rollupOptions: { input: { main: "index.html", downloads: "downloads.html" } } },
});
