import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { FEED_HOSTS } from "./src/lib/sources.js";

/**
 * Tiny same-origin proxy (`/__proxy?url=...`) for the few public endpoints that
 * don't send CORS headers (e.g. ESPN's /teams/:id). Allow-listed hosts only,
 * never cached. Works in `vite` dev and `vite preview`; the app falls back to
 * public CORS proxies when it isn't available (e.g. single-file embeds).
 */
const ALLOWED_HOSTS = new Set(["site.api.espn.com", "site.web.api.espn.com", "api.rss2json.com", ...FEED_HOSTS]);

function devCorsProxy() {
  const handler = async (req, res) => {
    try {
      const target = new URL(new URL(req.url, "http://local").searchParams.get("url") ?? "");
      if (target.protocol !== "https:" || !ALLOWED_HOSTS.has(target.hostname)) {
        res.statusCode = 403;
        return res.end(JSON.stringify({ error: "Host not allowed" }));
      }
      const upstream = await fetch(target, { headers: { accept: "application/json, application/rss+xml, text/xml;q=0.9, */*;q=0.8", "user-agent": "Mozilla/5.0 (arsenal-hub dev proxy)" } });
      res.statusCode = upstream.status;
      res.setHeader("content-type", upstream.headers.get("content-type") ?? "application/json");
      res.setHeader("cache-control", "no-store");
      res.end(Buffer.from(await upstream.arrayBuffer()));
    } catch (err) {
      res.statusCode = 502;
      res.end(JSON.stringify({ error: String(err?.message ?? err) }));
    }
  };
  return {
    name: "dev-cors-proxy",
    configureServer(server) { server.middlewares.use("/__proxy", handler); },
    configurePreviewServer(server) { server.middlewares.use("/__proxy", handler); },
  };
}

export default defineConfig({
  // GitHub Pages serves the site from /<repo-name>/ — must match the repository name.
  base: "/arsenal-hub/",
  plugins: [react(), tailwindcss(), devCorsProxy()],
});
