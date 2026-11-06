// Copy of apps/scraper/src/util.ts: worker folders are copied into the downloadable scraper on their own, so they carry their own helpers.
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const jitter = (min: number, max: number) => min + Math.random() * (max - min);

export class Aborted extends Error {
  constructor() {
    super("Stopped");
  }
}

/** Sleep that wakes early (and throws) if the run is stopped. */
export async function nap(ms: number, signal: AbortSignal) {
  if (signal.aborted) throw new Aborted();
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new Aborted());
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
