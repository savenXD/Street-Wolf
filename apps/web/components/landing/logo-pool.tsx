import type { ReactNode } from "react";
import { siClaude, siGooglegemini, siGooglemaps, siInstagram, siReddit, siWhatsapp, siX } from "simple-icons";

// simple-icons dropped OpenAI for trademark reasons, so the mark is inlined here.
const OPENAI_PATH =
  "M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z";

function Mono({ path, fill = "#fff", className }: { path: string; fill?: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d={path} fill={fill} />
    </svg>
  );
}

function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  );
}

function Gemini({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id="gemini-grad" x1="4" y1="20" x2="20" y2="4" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4285F4" />
          <stop offset=".5" stopColor="#9B72CB" />
          <stop offset="1" stopColor="#D96570" />
        </linearGradient>
      </defs>
      <path d={siGooglegemini.path} fill="url(#gemini-grad)" />
    </svg>
  );
}

export type PoolLogo = { id: string; label: string; bg: string; glyph: (className: string) => ReactNode };

/** Logos that rotate through the hero headline. Each sits on its own brand-colored tile. */
export const LOGO_POOL: PoolLogo[] = [
  { id: "claude", label: "Claude", bg: "#D97757", glyph: (c) => <Mono path={siClaude.path} className={c} /> },
  { id: "instagram", label: "Instagram", bg: "linear-gradient(45deg,#feda75 0%,#fa7e1e 25%,#d62976 55%,#962fbf 78%,#4f5bd5 100%)", glyph: (c) => <Mono path={siInstagram.path} className={c} /> },
  { id: "google", label: "Google", bg: "#fff", glyph: (c) => <GoogleG className={c} /> },
  { id: "chatgpt", label: "ChatGPT", bg: "#10a37f", glyph: (c) => <Mono path={OPENAI_PATH} className={c} /> },
  { id: "whatsapp", label: "WhatsApp", bg: "#25D366", glyph: (c) => <Mono path={siWhatsapp.path} className={c} /> },
  { id: "reddit", label: "Reddit", bg: "#ff4500", glyph: (c) => <Mono path={siReddit.path} className={c} /> },
  { id: "gemini", label: "Gemini", bg: "#fff", glyph: (c) => <Gemini className={c} /> },
  { id: "x", label: "X", bg: "#000", glyph: (c) => <Mono path={siX.path} className={c} /> },
  { id: "googlemaps", label: "Google Maps", bg: "#fff", glyph: (c) => <Mono path={siGooglemaps.path} fill="#EA4335" className={c} /> },
];

export const logoById = Object.fromEntries(LOGO_POOL.map((l) => [l.id, l])) as Record<string, PoolLogo>;
