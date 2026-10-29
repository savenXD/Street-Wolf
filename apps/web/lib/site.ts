export const site = {
  name: "Street Wolf",
  tagline: "Hunt leads like a pack.",
  // TODO: point at the real repo once it's created on GitHub.
  githubRepo: process.env.NEXT_PUBLIC_GITHUB_REPO ?? "savenXD/Street-Wolf",
  selfHosted: process.env.NEXT_PUBLIC_SELF_HOSTED === "true",
};

export const githubUrl = `https://github.com/${site.githubRepo}`;
