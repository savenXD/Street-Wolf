import type { Job, Row } from "./types";

export class Api {
  constructor(private base: string, private token: string) {}

  private async call<T>(path: string, method: string, body?: unknown): Promise<{ status: number; data: T }> {
    const res = await fetch(`${this.base}${path}`, {
      method,
      headers: { authorization: `Bearer ${this.token}`, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    return { status: res.status, data: (await res.json().catch(() => ({}))) as T };
  }

  /** 200 means the token works; used by `setup` and the health check. */
  async check(): Promise<"ok" | "bad-token" | "unreachable"> {
    try {
      const { status } = await this.call("/api/ingest", "POST", {});
      return status === 401 || status === 403 ? "bad-token" : "ok";
    } catch {
      return "unreachable";
    }
  }

  async claim(): Promise<Job | null> {
    const { status, data } = await this.call<{ job: Job | null }>("/api/jobs/claim", "POST");
    if (status !== 200) throw new Error(`claim failed (${status})`);
    return data.job;
  }

  /** Rows go through the job, which decides the campaign and sheet server-side. */
  async ingest(jobId: string, rows: Row[]) {
    for (let i = 0; i < rows.length; i += 200) {
      let err = "";
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const { status, data } = await this.call<{ error?: string }>("/api/ingest", "POST", { jobId, source: "googlemaps", items: rows.slice(i, i + 200) });
          if (status === 200) { err = ""; break; }
          err = data.error ?? `ingest failed (${status})`;
          if (status < 500 && status !== 429) throw new Error(err); // our fault, retrying won't help
        } catch (e) {
          if (attempt === 3 || (e as Error).message === err) throw e;
          err = (e as Error).message;
        }
        await new Promise((r) => setTimeout(r, 1500 * 2 ** attempt));
      }
      if (err) throw new Error(err);
    }
  }

  /** Businesses already on the sheet, so a re-run doesn't open them again. */
  async known(jobId: string): Promise<Set<string>> {
    const { status, data } = await this.call<{ ids?: string[] }>(`/api/ingest/known?jobId=${jobId}`, "GET");
    return new Set(status === 200 ? (data.ids ?? []) : []);
  }

  /** Returns the job's server-side status, so the worker notices a Stop pressed in the dashboard. */
  async patch(id: string, body: { progress?: number; leadsFound?: number; status?: "running" | "done" | "failed" | "cancelled"; error?: string | null }): Promise<string | null> {
    try {
      const r = await this.call<{ status?: string }>(`/api/jobs/${id}`, "PATCH", body);
      if (r.status === 404) return "cancelled"; // the job (or its whole sheet) was deleted: stop
      return r.data.status ?? null;
    } catch {
      return null;
    }
  }
}
