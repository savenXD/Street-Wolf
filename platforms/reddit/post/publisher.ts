import type { Publisher } from "@street-wolf/platform-sdk";

/** Reddit posting (skeleton). Scheduling UI, the posting code and its API logic go in this folder. */
export const redditPublisher: Publisher = {
  feature: "reddit:post",
  name: "Reddit posting",
  formats: ["text", "link", "image"],
  runsIn: "undecided",
  status: "planned",
};
