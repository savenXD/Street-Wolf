// Lint rules shared by every platform: the web app's rules plus the boundaries that keep platforms independent:
//  1. a platform never imports another platform;
//  2. it uses the web app only through apps/web/kit (@/kit/ui, @/kit/store, @/kit/sheet, @/kit/server);
//  3. it never imports an app's files by path.
// Shared logic belongs in packages/core (pure) or apps/web/kit (UI/store). Add new platforms to ALL.
import web from "../apps/web/eslint.config.mjs";

const ALL = ["google-maps", "instagram", "reddit", "x"];

/** `self` is the folder name, e.g. "instagram". */
export function platformConfig(self) {
  const others = ALL.filter((p) => p !== self);
  return [
    ...web,
    {
      settings: { react: { version: "19" } },
      rules: {
        "@next/next/no-html-link-for-pages": "off",
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              ...others.flatMap((p) => [
                { group: [`@street-wolf/${p}`, `@street-wolf/${p}/*`], message: "A platform never imports another platform. Shared code goes in packages/core or apps/web/kit." },
                { group: [`**/platforms/${p}/**`, `../${p}/**`, `../../${p}/**`], message: "A platform never imports another platform." },
              ]),
              {
                regex: "^@/(?!kit/(ui|store|sheet|server)$)",
                message: "Platforms use the web app only through @/kit/ui, @/kit/store, @/kit/sheet or @/kit/server. Need something else? Export it from apps/web/kit on purpose.",
              },
              { group: ["**/apps/web/**", "**/apps/scraper/**"], message: "Platforms never import an app directly (use @/kit/* or packages)." },
            ],
          },
        ],
      },
    },
  ];
}
