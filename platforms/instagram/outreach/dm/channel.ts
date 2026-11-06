import type { OutreachChannel } from "@street-wolf/platform-sdk";

/** Instagram DMs (skeleton). Sending code, its UI (ui/) and any API logic (server/) go in this folder. */
export const dmChannel: OutreachChannel = {
  feature: "instagram:dm",
  name: "Instagram DM",
  needs: ["username"],
  runsIn: "local-worker",
  status: "planned",
};
