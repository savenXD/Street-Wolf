// Checks that every platform folder is complete and wired into every place it must be, and that worker code only imports
// what the downloadable scraper ships. Run: pnpm check:platforms (also part of pnpm check and CI). Exits 1 on any problem.
// The rules it enforces are written down in platforms/README.md; keep the two in step.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const read = (p) => (existsSync(join(root, p)) ? readFileSync(join(root, p), "utf8") : "");
const problems = [];
const fail = (where, msg) => problems.push(`${where}: ${msg}`);

const web = {
  pkg: JSON.parse(read("apps/web/package.json")),
  nextConfig: read("apps/web/next.config.ts"),
  registry: read("apps/web/lib/platforms.ts"),
  tiles: read("apps/web/components/dashboard/platform-tiles.tsx"),
  server: read("apps/web/lib/server/platforms.ts"),
  ingest: read("apps/web/app/api/ingest/route.ts"),
};
const dbTypes = read("packages/db/src/types.ts");
const lintBase = read("platforms/eslint.base.mjs");
const scraperRegistry = read("apps/scraper/src/platforms.ts");
const platformUnion = (dbTypes.match(/export type Platform = ([^;]+);/) ?? [])[1] ?? "";
const ingestEnum = (web.ingest.match(/source: z\.enum\(\[([^\]]+)\]\)/) ?? [])[1] ?? "";
const lintAll = (lintBase.match(/const ALL = \[([^\]]+)\]/) ?? [])[1] ?? "";

const dirs = readdirSync(join(root, "platforms"), { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(root, "platforms", d.name, "package.json")))
  .map((d) => d.name);

for (const dir of dirs) {
  const at = `platforms/${dir}`;
  const pkg = JSON.parse(read(`${at}/package.json`));
  const name = `@street-wolf/${dir}`;
  if (pkg.name !== name) fail(at, `package.json name must be "${name}" (is "${pkg.name}")`);
  for (const f of ["README.md", "platform.ts", "fields.ts", "tsconfig.json", "eslint.config.mjs"]) if (!existsSync(join(root, at, f))) fail(at, `missing ${f}`);
  for (const s of ["lint", "typecheck"]) if (!pkg.scripts?.[s]) fail(at, `package.json needs a "${s}" script`);

  const id = (read(`${at}/platform.ts`).match(/\bid: "([^"]+)"/) ?? [])[1];
  if (!id) { fail(at, "platform.ts has no id"); continue; }
  if (!platformUnion.includes(`"${id}"`)) fail(at, `add "${id}" to Platform in packages/db/src/types.ts`);
  if (!ingestEnum.includes(`"${id}"`)) fail(at, `add "${id}" to the source enum in apps/web/app/api/ingest/route.ts`);
  if (!lintAll.includes(`"${dir}"`)) fail(at, `add "${dir}" to ALL in platforms/eslint.base.mjs`);
  if (!web.pkg.dependencies?.[name]) fail(at, `add "${name}": "workspace:*" to apps/web/package.json`);
  if (!web.nextConfig.includes(`"${name}"`)) fail(at, `add "${name}" to transpilePackages in apps/web/next.config.ts`);
  if (!web.registry.includes(`"${name}/platform"`)) fail(at, `import its manifest in apps/web/lib/platforms.ts`);

  const exp = pkg.exports ?? {};
  for (const [key, file] of Object.entries(exp)) if (!existsSync(join(root, at, file))) fail(at, `exports "${key}" points to missing ${file}`);
  if (exp["./web"] && !web.tiles.includes(`"${name}/web"`)) fail(at, `has screens: register its Tiles in apps/web/components/dashboard/platform-tiles.tsx`);
  const inScraper = scraperRegistry.includes(`../../../platforms/${dir}/`);
  const inServer = web.server.includes(`"${name}/server"`);
  if (inScraper && !inServer) fail(at, `the scraper runs its jobs, but apps/web/lib/server/platforms.ts can't queue them (register its server.ts)`);
  if (inServer && !inScraper && existsSync(join(root, at, "scrape/worker/index.ts")) && !read(`${at}/scrape/worker/index.ts`).includes("isn't built yet"))
    fail(at, `the web app queues its jobs, but apps/scraper/src/platforms.ts doesn't run them`);

  // Worker code ships alone inside the scraper download: only its own folder, ../../fields, node: built-ins and type-only imports.
  const workerDir = join(root, at, "scrape/worker");
  if (existsSync(workerDir)) {
    for (const f of readdirSync(workerDir).filter((f) => /\.(ts|js)$/.test(f))) {
      const src = readFileSync(join(workerDir, f), "utf8");
      for (const m of src.matchAll(/^\s*import\s+(type\s+)?[^;]*?from\s+"([^"]+)"/gm)) {
        const [, isType, spec] = m;
        if (isType || spec.startsWith("node:") || spec.startsWith("./") || spec === "../../fields") continue;
        fail(`${at}/scrape/worker/${f}`, `imports "${spec}" at runtime; worker code may only import ./, ../../fields, node: or use \`import type\``);
      }
    }
  }
}

// Every platform the apps mention must have a folder.
for (const m of web.registry.matchAll(/"@street-wolf\/([^/"]+)\/platform"/g)) if (!dirs.includes(m[1])) fail("apps/web/lib/platforms.ts", `imports @street-wolf/${m[1]} but platforms/${m[1]} doesn't exist`);
for (const m of scraperRegistry.matchAll(/from "\.\.\/\.\.\/\.\.\/platforms\/([^/"]+)\//g)) if (!dirs.includes(m[1])) fail("apps/scraper/src/platforms.ts", `points at platforms/${m[1]} which doesn't exist`);

if (problems.length) {
  console.error(`✖ ${problems.length} platform wiring problem${problems.length > 1 ? "s" : ""}:\n  - ${problems.join("\n  - ")}`);
  process.exit(1);
}
console.log(`✓ ${dirs.length} platforms wired correctly: ${dirs.join(", ")}`);
