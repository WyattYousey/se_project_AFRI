import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev-only API shim: forward POST /api/analyze to our handler so the Vite dev server doesn't 404.
import analyzeHandler from "./src/api/analyze.js";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const isAnalyzePath = /^\/api\/analyze(?:\.js)?(?:\/)?(?:\?.*)?$/.test(
        req.url
      );

      if (isAnalyzePath && req.method === "OPTIONS") {
        // Handle trivial preflight if any
        res.statusCode = 204;
        res.end();
        return;
      }

      if (isAnalyzePath && req.method === "GET") {
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            ok: true,
            message: "analyze middleware active",
            path: req.url,
          })
        );
        return;
      }

      if (isAnalyzePath && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
          try {
            req.body = body ? JSON.parse(body) : {};
          } catch (err) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Invalid JSON" }));
            return;
          }

          // Call the existing handler with the parsed body
          try {
            analyzeHandler(req, res);
          } catch (err) {
            console.error("analyze handler error", err);
            if (!res.headersSent) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: String(err) }));
            }
          }
        });
      } else {
        next();
      }
    });
  },
});
