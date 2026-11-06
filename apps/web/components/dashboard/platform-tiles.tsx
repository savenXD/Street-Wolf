"use client";

// Each platform's tiles on the campaign page. A platform shows one tile per feature the campaign switched on.
import type { ComponentType } from "react";
import { Tiles as GoogleMapsTiles } from "@street-wolf/google-maps/web";
import type { Campaign } from "@/lib/workspace";

const tiles: Record<string, ComponentType<{ campaign: Campaign }>> = {
  googlemaps: GoogleMapsTiles,
};

export function PlatformTiles({ campaign, platformIds }: { campaign: Campaign; platformIds: string[] }) {
  return platformIds.map((id) => {
    const T = tiles[id];
    return T ? <T key={id} campaign={campaign} /> : null;
  });
}
