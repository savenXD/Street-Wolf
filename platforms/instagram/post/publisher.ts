import type { Publisher } from "@street-wolf/platform-sdk";

/** Instagram posting (skeleton). Scheduling UI, the posting code and its API logic go in this folder. */
export const instagramPublisher: Publisher = {
  feature: "instagram:post",
  name: "Instagram posting",
  formats: ["image", "video", "text"],
  runsIn: "undecided",
  status: "planned",
};
