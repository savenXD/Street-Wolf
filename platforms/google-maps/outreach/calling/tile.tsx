"use client";

import { BrandIcon, Fade, SoftTile } from "@/kit/ui";

// ElevenLabs voice agent. Swap SoftTile for LiveTile once AI calling ships.
export function CallTile() {
  return (
    <SoftTile
      title="ElevenLabs"
      brand="elevenlabs"
      sub="AI calling · coming soon"
      icon={<BrandIcon name="elevenlabs" className="size-8" />}
      art={
        <svg aria-hidden viewBox="0 0 160 160" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
          <rect width="160" height="160" fill="#f5f5f4" />
          {/* Voice orb: ripple rings that spread on hover */}
          <g fill="none" stroke="#0a0a0a">
            {[16, 30, 46, 64, 84].map((r, k) => (
              <circle
                key={r}
                cx="80"
                cy="54"
                r={r}
                strokeWidth={k === 0 ? 0 : 1.2}
                opacity={0.5 - k * 0.08}
                strokeDasharray={k % 2 ? "2 5" : undefined}
                className="origin-[80px_54px] transition-transform duration-700 ease-out group-hover:scale-[1.12]"
                style={{ transitionDelay: `${k * 40}ms` }}
              />
            ))}
            <circle cx="80" cy="54" r="16" fill="#e5e5e5" stroke="none" />
          </g>
          <g fill="#0a0a0a">
            <circle cx="26" cy="30" r="3" opacity=".5" />
            <circle cx="138" cy="40" r="2.5" opacity=".4" />
            <circle cx="122" cy="76" r="2" opacity=".3" />
            <circle cx="34" cy="74" r="2" opacity=".3" />
          </g>
          <Fade id="el-fade" />
        </svg>
      }
    />
  );
}
