import { BrandIcon, type BrandName } from "@/components/brand-icon";

/** Google Business Profile has no simple-icons entry, so this is a hand-drawn storefront. */
export function GbpGlyph({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-label="Google Business Profile" role="img">
      {/* Awning: alternating scallops, then the shopfront with a door and window. */}
      <path d="M2.5 8.6 4.3 3.5h15.4l1.8 5.1z" fill="#fff" />
      <path d="M2.5 8.6h19a3.17 3.17 0 0 1-6.33 0 3.17 3.17 0 0 1-6.34 0 3.17 3.17 0 0 1-6.33 0z" fill="#fff" opacity=".78" />
      <path d="M4.2 12.4v8.1h15.6v-8.1" fill="#fff" />
      <rect x="9.6" y="14.4" width="4.8" height="6.1" rx=".7" fill="#2a6ff0" />
      <rect x="6" y="14.4" width="2.4" height="2.4" rx=".4" fill="#2a6ff0" opacity=".45" />
      <rect x="15.6" y="14.4" width="2.4" height="2.4" rx=".4" fill="#2a6ff0" opacity=".45" />
    </svg>
  );
}

export const tileStyles = {
  gbp: "linear-gradient(145deg,#5a9bff,#2a6ff0)",
  instagram: "linear-gradient(45deg,#feda75 0%,#fa7e1e 25%,#d62976 55%,#962fbf 78%,#4f5bd5 100%)",
  reddit: "linear-gradient(145deg,#ff6a33,#ff4500)",
  x: "linear-gradient(145deg,#2b2b2b,#000)",
  voice: "linear-gradient(145deg,#3a3a3a,#0a0a0a)",
} as const;

export function BrandGlyph({ kind, className = "size-5" }: { kind: keyof typeof tileStyles; className?: string }) {
  if (kind === "gbp") return <GbpGlyph className={className} />;
  const map: Record<string, BrandName> = { instagram: "instagram", reddit: "reddit", x: "x", voice: "elevenlabs" };
  return <BrandIcon name={map[kind]} className={`${className} text-white`} />;
}
