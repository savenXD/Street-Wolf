import { existsSync, readFileSync } from "node:fs";
import { request } from "node:http";
import { PROXY_FILE } from "./config";

export type Proxy = { server: string; username?: string; password?: string };

const FREE_LISTS = [
  "https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/protocols/http/data.txt",
  "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt",
];

function parse(line: string): Proxy | null {
  const l = line.trim();
  if (!l || l.startsWith("#")) return null;
  try {
    const u = new URL(/^\w+:\/\//.test(l) ? l : `http://${l}`);
    if (!u.hostname || !u.port) return null;
    return { server: `${u.protocol}//${u.hostname}:${u.port}`, username: u.username ? decodeURIComponent(u.username) : undefined, password: u.password ? decodeURIComponent(u.password) : undefined };
  } catch {
    return null;
  }
}

export function loadOwnProxies(): Proxy[] {
  if (!existsSync(PROXY_FILE)) return [];
  return readFileSync(PROXY_FILE, "utf8").split(/\r?\n/).map(parse).filter((p): p is Proxy => !!p);
}

/** True if the proxy can open an HTTPS tunnel to Google within the timeout. Cheap filter before a browser ever touches it. */
function tunnels(p: Proxy, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const u = new URL(p.server);
    const req = request({ host: u.hostname, port: Number(u.port), method: "CONNECT", path: "www.google.com:443", timeout: timeoutMs });
    const done = (ok: boolean) => {
      req.destroy();
      resolve(ok);
    };
    req.on("connect", (res, socket) => {
      socket.destroy();
      done(res.statusCode === 200);
    });
    req.on("timeout", () => done(false));
    req.on("error", () => done(false));
    req.end();
  });
}

export async function fetchFreeProxies(want = 15, log: (m: string) => void = () => {}): Promise<Proxy[]> {
  const found = new Map<string, Proxy>();
  for (const url of FREE_LISTS) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      for (const line of (await res.text()).split(/\r?\n/)) {
        const p = parse(line);
        if (p) found.set(p.server, p);
      }
    } catch {}
  }
  const all = [...found.values()].sort(() => Math.random() - 0.5).slice(0, 600);
  log(`Testing ${all.length} free proxies (most will be dead)...`);
  const good: Proxy[] = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: 60 }, async () => {
      while (i < all.length && good.length < want) {
        const p = all[i++];
        if (await tunnels(p, 4000)) good.push(p);
      }
    }),
  );
  return good.slice(0, want);
}

/** Round-robin over proxies. `null` means a direct connection. */
export class ProxyPool {
  private i = 0;
  constructor(private list: (Proxy | null)[]) {
    if (!list.length) this.list = [null];
  }
  get size() {
    return this.list.length;
  }
  current() {
    return this.list[this.i % this.list.length];
  }
  rotate() {
    this.i++;
    return this.current();
  }
  drop(p: Proxy | null) {
    if (p && this.list.length > 1) this.list = this.list.filter((x) => x !== p);
  }
}
