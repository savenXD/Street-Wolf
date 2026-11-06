"use client";

import { type Campaign } from "@/kit/store";
import { CallTile } from "./outreach/calling/tile";
import { WhatsAppTile } from "./outreach/whatsapp/tile";
import { ScrapeTile } from "./scrape/ui/tile";

/** Google Maps' tiles on the campaign page, one per feature the campaign switched on. */
export function Tiles({ campaign }: { campaign: Campaign }) {
  const on = (id: string) => campaign.features.includes(id);
  return (
    <>
      {on("googlemaps:scrape") && <ScrapeTile campaign={campaign} />}
      {on("googlemaps:whatsapp") && <WhatsAppTile />}
      {on("googlemaps:call") && <CallTile />}
    </>
  );
}
