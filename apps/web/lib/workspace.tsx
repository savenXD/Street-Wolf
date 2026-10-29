"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { LabelNode } from "@/lib/labels";
import { clearToday, setToday } from "@/lib/presence";
import type { ScrapeConfig } from "@/lib/maps-fields";

/**
 * The client store. The server (MongoDB) is the source of truth: edits update the screen immediately, then sync in the
 * background; if the server refuses, we reload the truth and tell the user. Sheet rows are fetched per sheet and saved
 * as diffs, so a 20,000-row sheet never travels in one piece.
 */

// Older versions kept everything on this device. That data is deleted on load (accounts only now).
const LEGACY_KEY = "street-wolf:guest:v1";

export type Invite = { email: string; at: number };
export type Counts = { leads: number; outreached: number; converted: number };
export type Role = "owner" | "admin" | "member";
export type City = { id: string; name: string; scrape?: ScrapeConfig; /** Call-outcome label id per sheet row (by row number). */
  labels?: Record<string, string>;
  /** Sheet cells by row, keyed by column (field) key. */
  rows?: Record<string, string>[];
  /** Column order and widths the user chose. */
  view?: { order?: string[]; widths?: Record<string, number> };
  /** Server-side counters, so dashboards don't need the rows. Used while `rows` isn't loaded. */
  stats?: Counts;
  /** Account mode: the rows have been fetched from the server. */
  loaded?: boolean;
  /** Bumped whenever rows arrive from the server (live scrape), so the sheet can drop its undo history. */
  syncTick?: number;
};

export type ScrapeJob = { id: string; status: "queued" | "running" | "done" | "failed" | "cancelled"; progress: number; leadsFound: number; error: string | null; at: number };
export type SaveState = "saved" | "saving" | "error";

// Per-sheet "is my data on the server yet?" indicator. A tiny external store so a keystroke doesn't re-render the whole app.
const saveStates = new Map<string, SaveState>();
const saveListeners = new Set<() => void>();
const setSaveState = (pid: string, s: SaveState) => {
  if (saveStates.get(pid) === s) return;
  saveStates.set(pid, s);
  saveListeners.forEach((l) => l());
};
export const useSaveState = (pid: string): SaveState =>
  useSyncExternalStore(
    (l) => (saveListeners.add(l), () => void saveListeners.delete(l)),
    () => saveStates.get(pid) ?? "saved",
    () => "saved",
  );
/** A niche to hunt (lawyers, clinics...) with the places (cities) it is scraped in. */
export type Domain = { id: string; name: string; /** Cover image URL shown on the domain card. */ image?: string; cities: City[] };
export type CampaignMember = { userId: string; role: Role; name: string; email: string; avatarUrl: string | null };
export type PendingInvite = { id: string; email: string; role: string; at: number };
export type ServerStats = { totals: Counts; perMember: Record<string, Counts>; perDay: Record<string, number[]> };
export type Campaign = {
  id: string; name: string; purpose: string; features: string[]; team: string[]; domains: Domain[];
  /** Custom call-outcome labels; the built-in tree when absent. */
  labelTree?: LabelNode;
  createdAt: number;
  myRole?: Role;
  members?: CampaignMember[];
  pendingInvites?: PendingInvite[];
  serverStats?: ServerStats;
};
export type IncomingInvite = { id: string; campaignId: string; campaign: string; inviter: string; role: string };
type Local = { name: string; role: string; welcomed: boolean; campaigns: Campaign[] };
type Account = { id: string; email: string; avatarUrl: string | null };

const empty: Local = { name: "", role: "", welcomed: false, campaigns: [] };

// ── API plumbing ────────────────────────────────────────────────────────────
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
async function call<T = unknown>(method: string, path: string, body?: unknown, keepalive = false): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { "content-type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    keepalive,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error ?? "Something went wrong");
  return data as T;
}

type ServerCampaign = Omit<Campaign, "pendingInvites" | "serverStats"> & { invites: PendingInvite[]; stats: ServerStats };

/** Server shape → client shape, keeping any sheet rows already loaded (a refresh must not throw away open sheets). */
function fromServer(list: ServerCampaign[], prev: Campaign[] = []): Campaign[] {
  const oldCity = new Map(prev.flatMap((c) => c.domains.flatMap((d) => d.cities)).map((c) => [c.id, c]));
  return list.map(({ invites, stats, ...c }) => ({
    ...c,
    pendingInvites: invites,
    serverStats: stats,
    domains: c.domains.map((d) => ({
      ...d,
      cities: d.cities.map((city) => {
        const o = oldCity.get(city.id);
        return o?.loaded ? { ...city, rows: o.rows, labels: o.labels, loaded: true } : city;
      }),
    })),
  }));
}

type Workspace = {
  ready: boolean;
  signedIn: boolean;
  /** Signed in with a real account (data is on the server). */
  account: boolean;
  name: string;
  firstName: string;
  email: string | null;
  avatarUrl: string | null;
  userId: string | null;
  role: string;
  welcomed: boolean;
  invites: Invite[];
  campaigns: Campaign[];
  incomingInvites: IncomingInvite[];
  /** Last background-sync failure, shown once as a toast. */
  error: string | null;
  clearError: () => void;
  refresh: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<Local, "name" | "role" | "welcomed">>) => void;
  removeInvite: (email: string) => void;
  addTeamMember: (campaignId: string, email: string) => void;
  setMemberRole: (campaignId: string, userId: string, role: "admin" | "member") => void;
  removeMember: (campaignId: string, userId: string) => void;
  deleteCampaign: (campaignId: string) => void;
  acceptInvite: (inviteId: string) => Promise<void>;
  declineInvite: (inviteId: string) => Promise<void>;
  addCampaign: (c: Pick<Campaign, "name" | "purpose" | "features" | "team">) => void;
  addDomain: (campaignId: string, name: string, image?: string) => void;
  removeDomain: (campaignId: string, domainId: string) => void;
  addCity: (campaignId: string, domainId: string, name: string) => void;
  removeCity: (campaignId: string, domainId: string, cityId: string) => void;
  /** `dropFields`: columns the person deleted. Their values are removed from every lead on the sheet, in the database too. */
  setScrape: (campaignId: string, domainId: string, cityId: string, config: ScrapeConfig, dropFields?: string[]) => void;
  setLabelTree: (campaignId: string, tree: LabelNode | null) => void;
  setSheet: (campaignId: string, domainId: string, cityId: string, patch: Pick<City, "rows" | "labels"> & { view?: City["view"] }) => void;
  /** Fetch a sheet's rows (no-op if already loaded). */
  loadSheet: (campaignId: string, domainId: string, cityId: string) => Promise<void>;
  /** Live scrape: pulls rows the scraper has saved since the last call into the open sheet. Returns the newest job for the sheet. */
  syncSheet: (campaignId: string, domainId: string, cityId: string) => Promise<ScrapeJob | null>;
  startScrape: (campaignId: string, domainId: string, cityId: string) => Promise<void>;
  stopScrape: (jobId: string) => Promise<void>;
  signInWithGoogle: (next?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<Workspace | null>(null);

export function useWorkspace() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
  return ctx;
}

type SheetSync = { cid: string; did: string; cursor: number; baseRows: string[]; baseLabels: Record<string, string>; timer?: ReturnType<typeof setTimeout>; sending?: boolean; again?: boolean };

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [local, setLocal] = useState<Local>(empty);
  const [account, setAccount] = useState<Account | null>(null);
  const [incoming, setIncoming] = useState<IncomingInvite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  // Latest state, so mutations persist immediately: the provider can unmount (route change) before an effect runs.
  const latest = useRef<Local>(empty);
  const accountRef = useRef<Account | null>(null);
  const sheets = useRef(new Map<string, SheetSync>());
  const loading = useRef(new Set<string>());
  const lastRefresh = useRef(0);
  const refreshRef = useRef<() => Promise<void>>(async () => {});

  const mutate = useCallback((fn: (l: Local) => Local) => {
    const next = fn(latest.current);
    latest.current = next;
    setLocal(next);
  }, []);

  const applyBoot = useCallback(
    (boot: { user: { id: string; email: string; name: string; title: string; avatarUrl: string | null; welcomed: boolean } | null; campaigns?: ServerCampaign[]; incomingInvites?: IncomingInvite[] }) => {
      if (!boot.user) return;
      clearToday();
      const acc = { id: boot.user.id, email: boot.user.email, avatarUrl: boot.user.avatarUrl };
      accountRef.current = acc;
      setAccount(acc);
      setIncoming(boot.incomingInvites ?? []);
      const next: Local = {
        name: boot.user.name,
        role: boot.user.title,
        welcomed: boot.user.welcomed,
        campaigns: fromServer(boot.campaigns ?? [], latest.current.campaigns),
      };
      latest.current = next;
      setLocal(next);
    },
    [],
  );

  const refresh = useCallback(async () => {
    if (!accountRef.current) return;
    lastRefresh.current = Date.now();
    try {
      applyBoot(await call("GET", "/api/bootstrap"));
    } catch {}
  }, [applyBoot]);

  refreshRef.current = refresh;

  /** Run a server write. On failure, reload the server's version (the optimistic change disappears) and say why. */
  const sync = useCallback(
    async (p: Promise<unknown>) => {
      try {
        await p;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save that");
        await refresh();
      }
    },
    [refresh],
  );

  // Hydrate: ask the server who we are. No session -> signed out (the shell sends people to /signup).
  useEffect(() => {
    (async () => {
      try {
        localStorage.removeItem(LEGACY_KEY);
      } catch {}
      try {
        applyBoot(await call("GET", "/api/bootstrap"));
      } catch {}
      setReady(true);
    })();
  }, [applyBoot]);

  // While the tab is open, re-pull the workspace every 2 minutes so teammates' outreach reaches the charts without a reload.
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible" && accountRef.current) void refresh();
    }, 120_000);
    return () => clearInterval(t);
  }, [refresh]);

  // Pick up team changes made elsewhere when the tab regains focus (at most every 30s).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && accountRef.current && Date.now() - lastRefresh.current > 30_000) void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  // ── Sheet sync ───────────────────────────────────────────────────────────
  const findCity = (pid: string) => latest.current.campaigns.flatMap((c) => c.domains.flatMap((d) => d.cities)).find((c) => c.id === pid);

  const flushSheet = useCallback(async (pid: string, keepalive = false) => {
    const sh = sheets.current.get(pid);
    const city = findCity(pid);
    if (!sh || !city) return;
    clearTimeout(sh.timer);
    if (sh.sending) {
      sh.again = true;
      return;
    }
    const rows = city.rows ?? [];
    const labels = city.labels ?? {};
    const len = Math.max(rows.length, sh.baseRows.length, ...Object.keys(labels).map((k) => +k + 1), ...Object.keys(sh.baseLabels).map((k) => +k + 1));
    const changes: { row: number; cells: Record<string, string>; label: string | null }[] = [];
    const snapshot: string[] = [];
    for (let i = 0; i < len; i++) {
      const json = JSON.stringify(rows[i] ?? {});
      snapshot[i] = json;
      const label = labels[String(i)] ?? null;
      if (json !== (sh.baseRows[i] ?? "{}") || label !== (sh.baseLabels[String(i)] ?? null)) changes.push({ row: i, cells: rows[i] ?? {}, label });
    }
    if (!changes.length) {
      setSaveState(pid, "saved");
      return;
    }
    sh.sending = true;
    setSaveState(pid, "saving");
    try {
      for (let i = 0; i < changes.length; i += 2000) {
        const chunk = changes.slice(i, i + 2000);
        const r = await call<{ today: number | null }>("PATCH", `/api/campaigns/${sh.cid}/domains/${sh.did}/places/${pid}/sheet`, { changes: chunk, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }, keepalive && chunk.length < 100);
        // Outreach moved: show today's number right away and pull fresh chart data (throttled).
        if (r?.today != null && accountRef.current) {
          setToday(sh.cid, accountRef.current.id, r.today);
          if (Date.now() - lastRefresh.current > 10_000) void refreshRef.current();
        }
      }
      // Only the rows that were sent move the baseline, so rows a live scrape merged in meanwhile aren't disturbed.
      for (const ch of changes) sh.baseRows[ch.row] = snapshot[ch.row];
      sh.baseLabels = { ...labels };
      if (!sh.again) setSaveState(pid, "saved");
    } catch (e) {
      setSaveState(pid, "error");
      setError(e instanceof Error ? `Couldn't save the sheet: ${e.message}` : "Couldn't save the sheet");
    } finally {
      sh.sending = false;
      if (sh.again) {
        sh.again = false;
        void flushSheet(pid);
      }
    }
  }, []);

  const scheduleSheet = useCallback(
    (pid: string) => {
      const sh = sheets.current.get(pid);
      if (!sh) return;
      clearTimeout(sh.timer);
      setSaveState(pid, "saving");
      sh.timer = setTimeout(() => void flushSheet(pid), 700);
    },
    [flushSheet],
  );

  // Don't lose the last edits when the tab is closed or hidden.
  useEffect(() => {
    const flushAll = () => sheets.current.forEach((_, pid) => void flushSheet(pid, true));
    const onHide = () => document.visibilityState === "hidden" && flushAll();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flushAll);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flushAll);
    };
  }, [flushSheet]);

  const loadSheet = useCallback<Workspace["loadSheet"]>(
    async (cid, did, pid) => {
      if (!accountRef.current || sheets.current.has(pid) || loading.current.has(pid)) return;
      loading.current.add(pid);
      try {
        const s = await call<{ rows: Record<string, string>[]; labels: Record<string, string>; stats: Counts; cursor: number }>("GET", `/api/campaigns/${cid}/domains/${did}/places/${pid}/sheet`);
        sheets.current.set(pid, { cid, did, cursor: s.cursor, baseRows: s.rows.map((r) => JSON.stringify(r)), baseLabels: { ...s.labels } });
        mutate((l) => ({
          ...l,
          campaigns: l.campaigns.map((c) => (c.id !== cid ? c : { ...c, domains: c.domains.map((d) => (d.id !== did ? d : { ...d, cities: d.cities.map((city) => (city.id !== pid ? city : { ...city, rows: s.rows, labels: s.labels, stats: s.stats, loaded: true })) })) })),
        }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't open that sheet");
      } finally {
        loading.current.delete(pid);
      }
    },
    [mutate],
  );

  /** Rows saved by the scraper (or a teammate) arrive here. Rows with an unsaved local edit are left alone: the person's typing wins. */
  const syncSheet = useCallback<Workspace["syncSheet"]>(
    async (cid, did, pid) => {
      const sh = sheets.current.get(pid);
      if (!accountRef.current || !sh) return null;
      let job: ScrapeJob | null = null;
      for (let guard = 0; guard < 50; guard++) {
        const r = await call<{ job: ScrapeJob | null; rows: { row: number; cells: Record<string, string> }[]; more: boolean; cursor: number; now: number; stats: Counts }>(
          "GET",
          `/api/campaigns/${cid}/domains/${did}/places/${pid}/sync?since=${Math.max(0, sh.cursor - 3000)}`,
        );
        if (r.rows.length) {
          mutate((l) => ({
            ...l,
            campaigns: l.campaigns.map((c) =>
              c.id !== cid ? c : { ...c, domains: c.domains.map((d) => d.id !== did ? d : { ...d, cities: d.cities.map((city) => {
                if (city.id !== pid) return city;
                const rows = [...(city.rows ?? [])];
                for (const x of r.rows) {
                  const cur = JSON.stringify(rows[x.row] ?? {});
                  if (cur !== (sh.baseRows[x.row] ?? "{}")) continue; // unsaved local edit wins
                  while (rows.length <= x.row) rows.push({});
                  rows[x.row] = x.cells;
                  sh.baseRows[x.row] = JSON.stringify(x.cells);
                }
                return { ...city, rows, stats: r.stats, syncTick: (city.syncTick ?? 0) + 1 };
              }) }) }
            ),
          }));
        }
        sh.cursor = r.more ? r.cursor : r.now;
        job = r.job;
        if (!r.more) break; // otherwise a big backlog: keep pulling until we've caught up
        if (!r.rows.length) mutate((l) => ({ ...l, campaigns: l.campaigns.map((c) => c.id !== cid ? c : { ...c, domains: c.domains.map((d) => d.id !== did ? d : { ...d, cities: d.cities.map((city) => city.id !== pid ? city : { ...city, stats: r.stats }) }) }) }));
      }
      return job;
    },
    [mutate],
  );

  const startScrape = useCallback<Workspace["startScrape"]>(
    async (cid, did, pid) => {
      const city = findCity(pid);
      if (!city?.scrape) throw new Error("Set up the scrape first");
      await call("POST", "/api/jobs", { campaignId: cid, placeId: pid, tool: "googlemaps", input: { location: city.name, config: city.scrape } });
    },
    [],
  );

  const stopScrape = useCallback<Workspace["stopScrape"]>(async (jobId) => {
    await call("PATCH", `/api/jobs/${jobId}`, { status: "cancelled" });
  }, []);

  // ── Mutations ────────────────────────────────────────────
  const updateProfile = useCallback<Workspace["updateProfile"]>(
    (patch) => {
      mutate((l) => ({ ...l, ...patch }));
      if (accountRef.current) void sync(call("PATCH", "/api/profile", { ...(patch.name !== undefined && { name: patch.name }), ...(patch.role !== undefined && { title: patch.role }), ...(patch.welcomed !== undefined && { welcomed: patch.welcomed }) }));
    },
    [mutate, sync],
  );

  const editDomains = useCallback(
    (campaignId: string, fn: (d: Domain[]) => Domain[]) =>
      mutate((l) => ({ ...l, campaigns: l.campaigns.map((c) => (c.id === campaignId ? { ...c, domains: fn(c.domains) } : c)) })),
    [mutate],
  );

  const value = useMemo<Workspace>(() => {
    const api = (p: Promise<unknown>) => void sync(p);
    // Dates and ids are minted here so the screen can update before the server answers.
    const mine = account ? { userId: account.id, role: "owner" as Role, name: local.name, email: account.email, avatarUrl: account.avatarUrl } : null;
    const name = local.name;
    const pendingEmails = [...new Set(local.campaigns.flatMap((c) => c.pendingInvites ?? []).map((i) => i.email))];

    return {
      ready,
      signedIn: !!account,
      account: !!account,
      name,
      firstName: name.split(" ")[0] ?? "",
      email: account?.email ?? null,
      avatarUrl: account?.avatarUrl ?? null,
      userId: account?.id ?? null,
      role: local.role,
      welcomed: local.welcomed,
      invites: pendingEmails.map((email) => ({ email, at: 0 })),
      campaigns: local.campaigns,
      incomingInvites: incoming,
      error,
      clearError: () => setError(null),
      refresh,
      updateProfile,
      addTeamMember: (campaignId, email) => {
        mutate((l) => ({ ...l, campaigns: l.campaigns.map((c) => (c.id === campaignId && !c.team.includes(email) ? { ...c, team: [...c.team, email] } : c)) }));
        api(call("POST", `/api/campaigns/${campaignId}/invites`, { email }).then(refresh));
      },
      removeInvite: (email) => {
        for (const c of local.campaigns) for (const i of c.pendingInvites ?? []) if (i.email === email) api(call("DELETE", `/api/campaigns/${c.id}/invites/${i.id}`).then(refresh));
      },
      setMemberRole: (cid, userId, role) => api(call("PATCH", `/api/campaigns/${cid}/members/${userId}`, { role }).then(refresh)),
      removeMember: (cid, userId) => api(call("DELETE", `/api/campaigns/${cid}/members/${userId}`).then(refresh)),
      deleteCampaign: (cid) => {
        mutate((l) => ({ ...l, campaigns: l.campaigns.filter((c) => c.id !== cid) }));
        api(call("DELETE", `/api/campaigns/${cid}`));
      },
      acceptInvite: async (inviteId) => {
        await call("POST", `/api/invites/by-id/${inviteId}/accept`);
        await refresh();
      },
      declineInvite: async (inviteId) => {
        await call("POST", `/api/invites/by-id/${inviteId}/decline`);
        await refresh();
      },
      addCampaign: (c) => {
        const id = crypto.randomUUID();
        mutate((l) => ({
          ...l,
          campaigns: [{ ...c, domains: [], id, createdAt: Date.now(), ...(mine && { myRole: "owner" as Role, members: [mine], pendingInvites: [] }) }, ...l.campaigns],
        }));
        api(call("POST", "/api/campaigns", { id, name: c.name, purpose: c.purpose, features: c.features, team: c.team }).then(refresh));
      },
      addDomain: (cid, name, image) => {
        const id = crypto.randomUUID();
        let added = false;
        editDomains(cid, (ds) => {
          if (ds.some((d) => d.name.toLowerCase() === name.toLowerCase())) return ds;
          added = true;
          return [...ds, { id, name, image: image || undefined, cities: [] }];
        });
        if (added) api(call("POST", `/api/campaigns/${cid}/domains`, { id, name, image: image || null }));
      },
      removeDomain: (cid, did) => {
        editDomains(cid, (ds) => ds.filter((d) => d.id !== did));
        api(call("DELETE", `/api/campaigns/${cid}/domains/${did}`));
      },
      addCity: (cid, did, name) => {
        const id = crypto.randomUUID();
        let added = false;
        editDomains(cid, (ds) =>
          ds.map((d) => {
            if (d.id !== did || d.cities.some((c) => c.name.toLowerCase() === name.toLowerCase())) return d;
            added = true;
            return { ...d, cities: [...d.cities, { id, name, loaded: true, rows: [], labels: {} }] };
          }),
        );
        if (added) {
          sheets.current.set(id, { cid, did, cursor: Date.now(), baseRows: [], baseLabels: {} });
          api(call("POST", `/api/campaigns/${cid}/domains/${did}/places`, { id, name }));
        }
      },
      removeCity: (cid, did, city) => {
        editDomains(cid, (ds) => ds.map((d) => (d.id === did ? { ...d, cities: d.cities.filter((c) => c.id !== city) } : d)));
        sheets.current.delete(city);
        api(call("DELETE", `/api/campaigns/${cid}/domains/${did}/places/${city}`));
      },
      setScrape: (cid, did, city, config, dropFields) => {
        editDomains(cid, (ds) => ds.map((d) => (d.id === did ? { ...d, cities: d.cities.map((c) => (c.id === city ? { ...c, scrape: config } : c)) } : d)));
        const drop = dropFields?.length ? dropFields : undefined;
        const req = call<{ stats?: Counts }>("PATCH", `/api/campaigns/${cid}/domains/${did}/places/${city}`, { scrape: config, ...(drop && { dropFields: drop }) });
        // Only after the server has deleted the data do the values disappear from the open sheet (a refused request leaves them).
        api(
          req.then((r) => {
            if (!drop) return;
            const sh = sheets.current.get(city);
            const strip = (row: Record<string, string>) => Object.fromEntries(Object.entries(row).filter(([k]) => !drop.includes(k)));
            mutate((l) => ({
              ...l,
              campaigns: l.campaigns.map((c) => c.id !== cid ? c : { ...c, domains: c.domains.map((d) => d.id !== did ? d : { ...d, cities: d.cities.map((ct) => {
                if (ct.id !== city || !ct.rows) return ct;
                const rows = ct.rows.map((row, i) => {
                  const next = strip(row);
                  // A row with no unsaved edits stays "clean" so the cleanup isn't sent back to the server as a change.
                  if (sh && JSON.stringify(row) === (sh.baseRows[i] ?? "{}")) sh.baseRows[i] = JSON.stringify(next);
                  return next;
                });
                return { ...ct, rows, stats: r.stats ?? ct.stats, syncTick: (ct.syncTick ?? 0) + 1 };
              }) }) }),
            }));
          }),
        );
      },
      setLabelTree: (cid, tree) => {
        mutate((l) => ({ ...l, campaigns: l.campaigns.map((c) => (c.id === cid ? { ...c, labelTree: tree ?? undefined } : c)) }));
        api(call("PATCH", `/api/campaigns/${cid}`, { labelTree: tree }));
      },
      setSheet: (cid, did, city, patch) => {
        editDomains(cid, (ds) =>
          ds.map((d) =>
            d.id !== did
              ? d
              : {
                  ...d,
                  cities: d.cities.map((c) =>
                    c.id !== city
                      ? c
                      : {
                          ...c,
                          ...(patch.rows && { rows: patch.rows }),
                          ...(patch.labels && { labels: patch.labels }),
                          ...(patch.view && { view: { ...c.view, ...patch.view } }),
                        },
                  ),
                },
          ),
        );
        if (patch.rows || patch.labels) scheduleSheet(city);
        if (patch.view) {
          const view = findCity(city)?.view;
          const sh = sheets.current.get(city);
          if (sh && view) {
            const key = `view:${city}`;
            clearTimeout((viewTimers.get(key) as ReturnType<typeof setTimeout>) ?? undefined);
            viewTimers.set(key, setTimeout(() => api(call("PATCH", `/api/campaigns/${cid}/domains/${did}/places/${city}`, { view })), 600));
          }
        }
      },
      loadSheet,
      syncSheet,
      startScrape,
      stopScrape,
      signInWithGoogle: async (next = "/dashboard") => {
        let google = false;
        try {
          google = (await call<{ google: boolean }>("GET", "/api/auth/providers")).google;
        } catch {}
        // Full navigation on purpose: an API route that redirects to Google.
        window.location.href = google ? `/api/auth/google?next=${encodeURIComponent(next)}` : `/signup?next=${encodeURIComponent(next)}`;
      },
      signOut: async () => {
        await call("POST", "/api/auth/logout").catch(() => {});
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/"; // hard reload clears every trace of the account from memory
      },
    };
  }, [local, account, incoming, error, ready, updateProfile, mutate, editDomains, sync, refresh, loadSheet, syncSheet, startScrape, stopScrape, scheduleSheet]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const viewTimers = new Map<string, ReturnType<typeof setTimeout>>();
