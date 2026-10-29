import { githubUrl } from "@/lib/site";

// Everything the UI says about the local scraper app (port, file names, install commands) lives here so it can be
// corrected in one place. The files are built by `node scripts/package-scraper.mjs` and uploaded to a GitHub release.
export const SCRAPER_PORT = 4317;
export const SCRAPER_HEALTH_URL = `http://127.0.0.1:${SCRAPER_PORT}/health`;

export const RELEASES = `${githubUrl}/releases/latest/download`;

export type Os = "windows" | "linux";

export type Target = {
  os: Os;
  label: string;
  /** The archive to download for people who prefer to click. */
  file: string;
  /** One line that downloads and installs everything. */
  oneLiner: { shell: string; cmd: string };
  /** The same thing, step by step. */
  manual: { shell: string; lines: string[] };
  steps: string[];
  /** Commands for day-to-day use, relative to the install folder. */
  run: { background: string; window: string; setup: string; folder: string };
};

export const targets: Target[] = [
  {
    os: "windows",
    label: "Windows",
    file: "street-wolf-scraper.zip",
    oneLiner: { shell: "PowerShell", cmd: `irm ${RELEASES}/install.ps1 | iex` },
    manual: {
      shell: "PowerShell",
      lines: [
        `Invoke-WebRequest ${RELEASES}/street-wolf-scraper.zip -OutFile street-wolf-scraper.zip`,
        "Expand-Archive street-wolf-scraper.zip -DestinationPath .",
        "cd street-wolf-scraper",
        "powershell -ExecutionPolicy Bypass -File install.ps1",
      ],
    },
    steps: [
      "Open PowerShell (press the Windows key, type PowerShell, press Enter). You don't need to be an administrator.",
      "Paste the one-line command on the right and press Enter. It installs Node.js privately if you don't have it, then the scraper and its browser. This takes a few minutes the first time.",
      "When it asks, paste your access token (see Connect your account below). It checks the token on the spot.",
      "Done. Double-click start.cmd in the street-wolf-scraper folder whenever you want to scrape.",
    ],
    run: { background: "start.cmd", window: "start-window.cmd", setup: "street-wolf-scraper.cmd setup", folder: "%LOCALAPPDATA%\\street-wolf-scraper" },
  },
  {
    os: "linux",
    label: "Linux",
    file: "street-wolf-scraper.tar.gz",
    oneLiner: { shell: "Terminal", cmd: `curl -fsSL ${RELEASES}/install.sh | sh` },
    manual: {
      shell: "Terminal",
      lines: [
        `curl -LO ${RELEASES}/street-wolf-scraper.tar.gz`,
        "tar -xzf street-wolf-scraper.tar.gz",
        "cd street-wolf-scraper",
        "sh install.sh",
      ],
    },
    steps: [
      "Open a terminal. You don't need root.",
      "Paste the one-line command on the right and press Enter. It installs Node.js privately if you don't have it, then the scraper and its browser. This takes a few minutes the first time.",
      "When it asks, paste your access token (see Connect your account below). It checks the token on the spot.",
      "Done. Run ./start.sh in the street-wolf-scraper folder whenever you want to scrape.",
    ],
    run: { background: "./start.sh", window: "./start-window.sh", setup: "./street-wolf-scraper setup", folder: "~/street-wolf-scraper" },
  },
];

export function detectOs(): Os {
  return navigator.userAgent.toLowerCase().includes("win") ? "windows" : "linux";
}
