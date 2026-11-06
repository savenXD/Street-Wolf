import type { Publisher } from "@street-wolf/platform-sdk";

/** X posting (skeleton). Scheduling UI, the posting code and its API logic go in this folder. */
export const xPublisher: Publisher = {
  feature: "x:post",
  name: "X posting",
  formats: ["text", "image", "link"],
  runsIn: "undecided",
  status: "planned",
};
