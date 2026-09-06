import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const localBoundary: Plugin = {
  name: "nimbus-local-boundary",
  configureServer(server) {
    // This hook runs before Vite's proxy rewrites Host and before public assets.
    server.middlewares.use((req, res, next) => {
      const port = req.socket.localPort;
      if (![ `127.0.0.1:${port}`, `localhost:${port}` ].includes(req.headers.host ?? "")) {
        res.writeHead(403, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
        res.end("Local requests only.");
        return;
      }
      let path: string;
      try { path = decodeURIComponent((req.url ?? "").split("?")[0]!); }
      catch { res.writeHead(400); res.end("Invalid request path."); return; }
      if (/(?:^|[\\/])\.nimbus(?:[\\/]|$)|\.(?:sqlite|db)(?:-(?:wal|shm))?$/i.test(path)) {
        res.writeHead(403, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
        res.end("Private local data is not a public asset.");
        return;
      }
      next();
    });
  },
};

export default defineConfig({
  plugins: [localBoundary, react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    cors: false,
    fs: {
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "**/.nimbus/**", "**/*.{sqlite,db}", "**/*.{sqlite,db}-{wal,shm}"],
    },
    proxy: { "/api/nimbus": { target: "http://127.0.0.1:4317", changeOrigin: true } },
  },
  build: { target: "es2022", sourcemap: true },
});
