import type { OutreachChannel } from "@street-wolf/platform-sdk";

/** Reddit outreach (skeleton). Sending code, its UI (ui/) and any API logic (server/) go in this folder. */
export const dmChannel: OutreachChannel = {
  feature: "reddit:dm",
  name: "Reddit DM",
  needs: ["username"],
  runsIn: "local-worker",
  status: "planned",
};
