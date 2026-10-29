import { createServer } from "node:http";
import { loadSettings } from "./config";
import { state, stopCurrent } from "./worker";

/** Tiny local server. The web app pings /health to show "Scraper connected"; nothing here exposes data or accepts jobs. */
export function startServer() {
  const s = loadSettings();
  const origin = new URL(s.apiUrl).origin;
  const server = createServer((req, res) => {
    const from = req.headers.origin;
    const allowed = from === origin || from === undefined;
    res.setHeader("access-control-allow-origin", allowed && from ? from : origin);
    res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
    res.setHeader("access-control-allow-private-network", "true");
    res.setHeader("vary", "origin");
    if (req.method === "OPTIONS") return void res.writeHead(204).end();
    const json = (code: number, body: unknown) => void res.writeHead(code, { "content-type": "application/json" }).end(JSON.stringify(body));
    if (req.url === "/health") return json(200, { ok: true, version: "0.1.0", connected: state.connected, busy: state.busy });
    if (req.url === "/status") return json(200, state);
    if (req.url === "/stop" && req.method === "POST" && allowed) {
      stopCurrent();
      return json(200, { ok: true });
    }
    json(404, { error: "not found" });
  });
  server.on("error", (e: NodeJS.ErrnoException) => {
    if (e.code === "EADDRINUSE") console.error(`Port ${s.port} is already in use. Is the scraper already running?`);
    else console.error(e.message);
    process.exit(1);
  });
  server.listen(s.port, "127.0.0.1");
  return server;
}
