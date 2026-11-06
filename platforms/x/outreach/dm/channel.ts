import type { OutreachChannel } from "@street-wolf/platform-sdk";

/** X outreach (skeleton). Sending code, its UI (ui/) and any API logic (server/) go in this folder. */
export const dmChannel: OutreachChannel = {
  feature: "x:dm",
  name: "X DM",
  needs: ["username"],
  runsIn: "local-worker",
  status: "planned",
};
