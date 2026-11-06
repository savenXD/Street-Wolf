import type { PlatformManifest } from "@street-wolf/platform-sdk";

/** Google Maps: find local businesses, then reach them by WhatsApp or an AI phone call. */
export const googleMaps: PlatformManifest = {
  id: "googlemaps",
  name: "Google Maps",
  brand: "googlemaps",
  desc: "Local businesses and how to reach them.",
  status: "live",
  features: [
    { id: "googlemaps:scrape", category: "scrape", title: "Scraping", desc: "Names, phones, websites and reviews by niche and city.", status: "live" },
    { id: "googlemaps:whatsapp", category: "outreach", title: "WhatsApp outreach", desc: "Personalised WhatsApp messages to each lead.", status: "building", via: { name: "WhatsApp", brand: "whatsapp" } },
    { id: "googlemaps:call", category: "outreach", title: "AI calling", desc: "A natural-sounding voice agent phones every lead.", status: "planned", via: { name: "ElevenLabs", brand: "elevenlabs" } },
  ],
};

/** Feature ids used before outreach moved inside the platform. Read as their new ids; migrated on boot. */
export const legacyFeatureIds: Record<string, string> = {
  "whatsapp:outreach": "googlemaps:whatsapp",
  "elevenlabs:outreach": "googlemaps:call",
};
