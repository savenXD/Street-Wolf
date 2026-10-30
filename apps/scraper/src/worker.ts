import { Api } from "./api";
import { loadSettings } from "./config";
import { run } from "./runner";
import { defaultConfig, type Hooks, type Job, type ScrapeConfig } from "./types";
import { Aborted, sleep } from "./util";

export type State = { connected: boolean; busy: boolean; jobId: string | null; progress: number; found: number; note: string; log: string[]; error: string | null };

export const state: State = { connected: false, busy: false, jobId: null, progress: 0, found: 0, note: "", log: [], error: null };
let current: AbortController | null = null;

export const stopCurrent = () => current?.abort();

function say(msg: string, level: "info" | "warn" | "error" = "info") {
  const line = `${new Date().toLocaleTimeString()} ${level === "info" ? "" : level.toUpperCase() + " "}${msg}`;
  state.log.push(line);
  if (state.log.length > 200) state.log.shift();
  console.log(line);
}

function parseInput(job: Job): { cfg: ScrapeConfig; location: string } {
  const i = (job.input ?? {}) as { config?: Partial<ScrapeConfig>; location?: string };
  const base = defaultConfig([]);
  const c = i.config ?? {};
  const cfg: ScrapeConfig = { ...base, ...c, filters: { ...base.filters, ...(c.filters ?? {}) }, queries: (c.queries ?? []).filter(Boolean) };
  if (!cfg.queries.length) throw new Error("This job has no search queries");
  if (!cfg.fields?.length) cfg.fields = base.fields;
  return { cfg, location: i.location ?? "" };
}

async function runJob(api: Api, job: Job) {
  const ctl = (current = new AbortController());
  Object.assign(state, { busy: true, jobId: job.id, progress: 0, found: 0, note: "Starting", error: null });
  say(`Job ${job.id.slice(0, 8)} started`);
  let found = 0;
  const hooks: Hooks = {
    signal: ctl.signal,
    log: say,
    async onRows(rows) {
      await api.ingest(job.id, rows);
      found += rows.length;
      state.found = found;
    },
    onProgress(p) {
      state.progress = Math.min(1, p.done / Math.max(1, p.total));
      state.note = p.note ?? state.note;
    },
  };
  // Heartbeat: keeps the dashboard's progress live and is how a Stop pressed there reaches this machine.
  const beat = setInterval(async () => {
    const status = await api.patch(job.id, { progress: state.progress, leadsFound: found });
    if (status === "cancelled" && !ctl.signal.aborted) {
      say("Stopped from the dashboard", "warn");
      ctl.abort();
    }
  }, 3000);
  try {
    const { cfg, location } = parseInput(job);
    const known = cfg.filters.skipScraped ? await api.known(job.id) : new Set<string>();
    if (known.size) say(`${known.size} businesses are already in this niche (this sheet or another city) and will be skipped`);
    await run(cfg, location, hooks, loadSettings(), known);
    await api.patch(job.id, { status: "done", progress: 1, leadsFound: found });
    say(`Job finished with ${found} leads`);
  } catch (e) {
    const stopped = e instanceof Aborted || ctl.signal.aborted; // a save refused because the job was just stopped is a stop, not a failure
    const msg = stopped ? null : (e as Error).message.slice(0, 480);
    state.error = msg;
    await api.patch(job.id, { status: stopped ? "cancelled" : "failed", error: msg, leadsFound: found });
    say(stopped ? `Job stopped with ${found} leads saved` : `Job failed: ${msg} (${found} leads were saved)`, stopped ? "warn" : "error");
  } finally {
    clearInterval(beat);
    current = null;
    Object.assign(state, { busy: false, jobId: null });
  }
}

/** Polls the web app for work. Jobs are claimed atomically and only from campaigns the token's owner belongs to. */
export async function workLoop(signal: AbortSignal) {
  const s = loadSettings();
  const api = new Api(s.apiUrl, s.token);
  while (!signal.aborted) {
    try {
      const job = await api.claim();
      state.connected = true;
      if (job) {
        await runJob(api, job);
        continue;
      }
    } catch (e) {
      if (state.connected) say(`Can't reach ${s.apiUrl}: ${(e as Error).message}`, "warn");
      state.connected = false;
    }
    await sleep(5000);
  }
}
