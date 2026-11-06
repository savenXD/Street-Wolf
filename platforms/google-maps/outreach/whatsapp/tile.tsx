"use client";

import { Fade, SoftTile } from "@/kit/ui";

// Swap SoftTile for LiveTile (href to the WhatsApp page) once WhatsApp outreach ships.
export function WhatsAppTile() {
  return (
    <SoftTile
      title="WhatsApp"
      brand="whatsapp"
      sub="Outreach · coming soon"
      art={
        <svg aria-hidden viewBox="0 0 160 160" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
          <rect width="160" height="160" fill="#e7f5ea" />
          <g fill="#cfe9d5">
            {Array.from({ length: 6 }, (_, r) => Array.from({ length: 6 }, (_, c) => <circle key={`${r}-${c}`} cx={14 + c * 28 + (r % 2) * 14} cy={10 + r * 24} r="3" />))}
          </g>
          <rect x="16" y="22" width="70" height="26" rx="10" fill="#fff" />
          <rect x="26" y="31" width="40" height="4" rx="2" fill="#d4d4d4" />
          <rect x="26" y="38" width="26" height="4" rx="2" fill="#e5e5e5" />
          <rect x="70" y="58" width="74" height="26" rx="10" fill="#d9fdd3" />
          <rect x="80" y="67" width="44" height="4" rx="2" fill="#a7d9a0" />
          <rect x="80" y="74" width="28" height="4" rx="2" fill="#bfe6b9" />
          <rect x="16" y="92" width="56" height="22" rx="10" fill="#fff" />
          <rect x="26" y="100" width="34" height="4" rx="2" fill="#d4d4d4" />
          <Fade id="wa-fade" />
        </svg>
      }
    />
  );
}
