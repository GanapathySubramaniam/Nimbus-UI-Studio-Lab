import { createServer, type Server, type ServerResponse } from "node:http";
import type { StudioProject } from "@nimbus-ui-studio/application-shell/studio-engine";

/**
 * A tiny local HTTP+SSE server so a running Nimbus UI Studio tab can watch
 * this MCP server's in-memory project and re-render live as tools change
 * it. Bound to loopback only; never exposed beyond this machine.
 */

const DEFAULT_PORT = 4796;
const clients = new Set<ServerResponse>();
let server: Server | null = null;
let latest: StudioProject | null = null;
let boundPort: number | null = null;

function writeCors(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
}

export function bridgeStatus(): { running: boolean; port: number | null; connectedTabs: number } {
  return { running: server !== null, port: boundPort, connectedTabs: clients.size };
}

export function broadcast(project: StudioProject): void {
  latest = project;
  if (clients.size === 0) return;
  const payload = `event: project\ndata: ${JSON.stringify(project)}\n\n`;
  for (const client of clients) client.write(payload);
}

export function startBridge(port = DEFAULT_PORT): Promise<{ started: boolean; port: number; reason?: string }> {
  if (server) return Promise.resolve({ started: true, port: boundPort ?? port });
  return new Promise((resolve) => {
    const instance = createServer((req, res) => {
      writeCors(res);
      const url = req.url ?? "/";
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }
      if (url === "/project") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(latest ? JSON.stringify(latest) : "null");
        return;
      }
      if (url === "/events") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        });
        res.write("retry: 1000\n\n");
        if (latest) res.write(`event: project\ndata: ${JSON.stringify(latest)}\n\n`);
        clients.add(res);
        req.on("close", () => clients.delete(res));
        return;
      }
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
    });
    instance.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        resolve({ started: false, port, reason: `Port ${port} is already in use (another Nimbus MCP server instance?).` });
      } else {
        resolve({ started: false, port, reason: error.message });
      }
    });
    instance.listen(port, "127.0.0.1", () => {
      server = instance;
      boundPort = port;
      resolve({ started: true, port });
    });
  });
}
