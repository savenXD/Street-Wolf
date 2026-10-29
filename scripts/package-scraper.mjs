// Builds the downloadable scraper: dist/street-wolf-scraper.tar.gz (Linux) and dist/street-wolf-scraper.zip (Windows).
// Upload both, plus apps/scraper/install.sh and install.ps1, to a GitHub release. The installers fetch these by name.
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const src = join(root, "apps/scraper");
const dist = join(root, "dist");
const stage = join(dist, "stage");
const dir = join(stage, "street-wolf-scraper");
rmSync(stage, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
cpSync(src, dir, { recursive: true, filter: (p) => !/[\\/](node_modules|data|output|\.node)([\\/]|$)|[\\/](start|start-window)\.(sh|cmd)$|[\\/]street-wolf-scraper(\.cmd)?$/.test(p) });
cpSync(join(src, "README.md"), join(dir, "README.md"));

execFileSync("tar", ["-czf", join(dist, "street-wolf-scraper.tar.gz"), "-C", stage, "street-wolf-scraper"]);
rmSync(join(dist, "street-wolf-scraper.zip"), { force: true });
try {
  execFileSync("zip", ["-qr", join(dist, "street-wolf-scraper.zip"), "street-wolf-scraper"], { cwd: stage });
} catch {
  execFileSync("python3", ["-c", "import shutil,sys; shutil.make_archive(sys.argv[1], 'zip', sys.argv[2], 'street-wolf-scraper')", join(dist, "street-wolf-scraper"), stage]);
}
rmSync(stage, { recursive: true, force: true });
for (const f of ["install.sh", "install.ps1"]) cpSync(join(src, f), join(dist, f));
console.log(`Built ${dist}: street-wolf-scraper.tar.gz, street-wolf-scraper.zip, install.sh, install.ps1`);
if (!existsSync(join(src, "README.md"))) console.warn("README.md is missing");
