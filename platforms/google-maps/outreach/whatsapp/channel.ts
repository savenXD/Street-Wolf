import type { OutreachChannel } from "@street-wolf/platform-sdk";

/** Today: click-to-chat and pamphlets from the phone page. How automated sending works is not decided yet. */
export const whatsappChannel: OutreachChannel = {
  feature: "googlemaps:whatsapp",
  name: "WhatsApp",
  needs: ["phone"],
  runsIn: "undecided",
  status: "building",
};
