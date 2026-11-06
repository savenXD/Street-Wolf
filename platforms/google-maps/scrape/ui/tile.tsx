"use client";

import { type Campaign } from "@/kit/store";
import { Fade, LiveTile } from "@/kit/ui";

/** Opens the campaign's niches and cities. */
export function ScrapeTile({ campaign }: { campaign: Campaign }) {
  const places = campaign.domains.reduce((n, d) => n + d.cities.length, 0);
  return (
    <LiveTile
      href={`/dashboard/maps/${campaign.id}`}
      title="Google Maps"
      brand="googlemaps"
      sub={`${campaign.domains.length} ${campaign.domains.length === 1 ? "domain" : "domains"} · ${places} places`}
      art={
        <svg aria-hidden viewBox="0 0 160 160" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 -z-0 h-full w-full">
          <rect width="160" height="160" fill="#f2efe9" />
          <rect x="-10" y="92" width="86" height="78" rx="10" fill="#cfe8c4" />
          <path d="M104 -10 C 96 40, 130 70, 112 110 S 120 150, 128 172 L 172 172 L 172 -10 Z" fill="#b9d9f2" />
          <g fill="none" strokeLinecap="round">
            <path d="M-10 60 L 170 40" stroke="#fff" strokeWidth="9" />
            <path d="M40 -10 L 58 170" stroke="#fff" strokeWidth="9" />
            <path d="M-10 120 L 100 150" stroke="#fff" strokeWidth="6" />
            <path d="M-10 20 C 40 30, 70 10, 110 24" stroke="#fff" strokeWidth="5" />
            <path d="M-10 84 L 170 98" stroke="#fbd986" strokeWidth="7" />
            <path d="M-10 84 L 170 98" stroke="#f4c04e" strokeWidth="1" />
          </g>
          <rect x="64" y="52" width="22" height="16" rx="3" fill="#e4dfd5" />
          <rect x="10" y="30" width="18" height="14" rx="3" fill="#e4dfd5" />
          <rect x="72" y="118" width="20" height="14" rx="3" fill="#e4dfd5" />
          <Fade id="maps-fade" />
        </svg>
      }
    />
  );
}
