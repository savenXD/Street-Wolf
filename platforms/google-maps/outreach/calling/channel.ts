import type { OutreachChannel } from "@street-wolf/platform-sdk";

/** An ElevenLabs voice agent phones each lead. Calls go through ElevenLabs' API, so it will run on the server. */
export const callChannel: OutreachChannel = {
  feature: "googlemaps:call",
  name: "AI calling (ElevenLabs)",
  needs: ["phone"],
  runsIn: "server",
  status: "planned",
};
