#!/bin/sh
# Street Wolf scraper installer for Linux. Safe to run again.
#   From the downloaded folder:   sh install.sh
#   Or in one go:                 curl -fsSL <releases>/install.sh | sh
# It needs no admin rights: if Node.js 20+ isn't installed it puts a private copy inside the scraper folder.
set -eu

NODE_VERSION="v22.11.0"
RELEASES="${SW_RELEASES:-https://github.com/savenXD/Street-Wolf/releases/latest/download}"
TARGET="${SW_HOME:-$HOME/street-wolf-scraper}"

say() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
die() { printf '\n\033[31mError: %s\033[0m\n' "$*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }
fetch() { if have curl; then curl -fsSL "$1" -o "$2"; elif have wget; then wget -q "$1" -O "$2"; else die "Install curl or wget first (for example: sudo apt install curl)"; fi; }

[ "$(uname -s)" = "Linux" ] || die "This installer is for Linux. On Windows use install.ps1."

# 1. Where is the app? Next to this script when run from the folder, otherwise download it.
HERE=$(cd "$(dirname "$0")" 2>/dev/null && pwd || true)
if [ -n "$HERE" ] && [ -f "$HERE/package.json" ] && grep -q '"@street-wolf/scraper"' "$HERE/package.json"; then
  APP="$HERE"
else
  say "Downloading the scraper to $TARGET"
  have tar || die "Install tar first (for example: sudo apt install tar)"
  mkdir -p "$TARGET"
  TMP=$(mktemp)
  fetch "$RELEASES/street-wolf-scraper.tar.gz" "$TMP"
  tar -xzf "$TMP" -C "$TARGET" --strip-components=1
  rm -f "$TMP"
  APP="$TARGET"
fi
cd "$APP"

# 2. Node.js 20 or newer.
have_node() { have node && [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 20 ]; }
if [ -x "$APP/.node/bin/node" ]; then PATH="$APP/.node/bin:$PATH"; export PATH; fi
if have_node; then
  say "Using Node.js $(node -v)"
else
  say "Installing a private copy of Node.js $NODE_VERSION (no admin rights needed)"
  case "$(uname -m)" in x86_64|amd64) ARCH=x64 ;; aarch64|arm64) ARCH=arm64 ;; *) die "Unsupported CPU: $(uname -m)" ;; esac
  have xz || die "Install xz first (for example: sudo apt install xz-utils), or install Node.js 20+ yourself from https://nodejs.org"
  TMP=$(mktemp)
  fetch "https://nodejs.org/dist/$NODE_VERSION/node-$NODE_VERSION-linux-$ARCH.tar.xz" "$TMP"
  mkdir -p "$APP/.node"
  tar -xJf "$TMP" -C "$APP/.node" --strip-components=1
  rm -f "$TMP"
  PATH="$APP/.node/bin:$PATH"; export PATH
fi

# 3. Libraries and the browser.
say "Installing dependencies"
npm install --no-audit --no-fund --loglevel=error
say "Downloading the browser (about 150 MB, one time)"
npx patchright install chromium

# 4. Launchers: background (no window) and window (you watch it work).
cat > "$APP/street-wolf-scraper" <<'LAUNCH'
#!/bin/sh
# Usage: street-wolf-scraper start | start --headed | setup | doctor | scrape "dentists" --location "Austin"
DIR=$(cd "$(dirname "$(readlink -f "$0")")" && pwd)
[ -x "$DIR/.node/bin/node" ] && PATH="$DIR/.node/bin:$PATH" && export PATH
cd "$DIR"
exec "$DIR/node_modules/.bin/tsx" "$DIR/src/cli.ts" "$@"
LAUNCH
printf '#!/bin/sh\nexec "$(dirname "$(readlink -f "$0")")/street-wolf-scraper" start\n' > "$APP/start.sh"
printf '#!/bin/sh\nexec "$(dirname "$(readlink -f "$0")")/street-wolf-scraper" start --headed\n' > "$APP/start-window.sh"
chmod +x "$APP/street-wolf-scraper" "$APP/start.sh" "$APP/start-window.sh"
if [ -d "$HOME/.local/bin" ]; then ln -sf "$APP/street-wolf-scraper" "$HOME/.local/bin/street-wolf-scraper"; fi

# 5. Check it works, then connect it to your account.
say "Checking the install"
"$APP/street-wolf-scraper" doctor || true

if [ -z "${SW_SKIP_SETUP:-}" ]; then
  say "Connect to your Street Wolf account"
  if [ -r /dev/tty ]; then "$APP/street-wolf-scraper" setup < /dev/tty || true; else echo "Run:  $APP/street-wolf-scraper setup"; fi
fi

say "Done"
echo "Start in the background (no window):  $APP/start.sh"
echo "Start with a visible window:          $APP/start-window.sh"
echo "Leave it running while you scrape from the dashboard."
