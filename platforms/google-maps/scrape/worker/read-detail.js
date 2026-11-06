// Runs inside the Google Maps page. Plain JavaScript on purpose: it is sent to the browser as text, so no transpiler
// (tsx/esbuild) may rewrite it. Returns a flat object of strings.
(() => {
  const q = (s) => document.querySelector(s);
  const label = (s, strip) => (q(s)?.getAttribute("aria-label") ?? "").replace(strip, "").trim();
  let site = q('a[data-item-id="authority"]')?.href ?? "";
  try {
    const u = new URL(site);
    [...u.searchParams.keys()].filter((k) => k.startsWith("utm_")).forEach((k) => u.searchParams.delete(k));
    site = u.href;
  } catch {}
  const hours = [...document.querySelectorAll("table tr")]
    .map((r) => r.innerText.replace(/\s+/g, " ").trim())
    .filter((t) => /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i.test(t))
    .map((t) => t.replace(/^(\w{3})\w*day\s*/i, "$1 "))
    .join("; ");
  const attributes = [...document.querySelectorAll('[aria-label^="Has "], [aria-label^="Offers "], [aria-label^="Accepts "], [aria-label^="Good for"], div[role="group"][aria-label] li')]
    .map((e) => (e.getAttribute("aria-label") ?? e.innerText).replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const snippets = [...document.querySelectorAll("div.MyEned span.wiI7pd")].slice(0, 3).map((e) => e.innerText.replace(/\s+/g, " ").trim());
  return {
    name: (q("h1.DUwDvf") ?? [...document.querySelectorAll("h1")].pop())?.innerText ?? "",
    category: q('button[jsaction*="category"]')?.innerText ?? "",
    address: label('button[data-item-id="address"]', /^Address:\s*/i),
    phone: label('button[data-item-id^="phone:tel:"]', /^Phone:\s*/i),
    website: site,
    plusCode: label('button[data-item-id="oloc"]', /^Plus code:\s*/i),
    hours,
    photo: q('meta[property="og:image"]')?.content ?? "",
    priceLevel: label('[aria-label^="Price:"]', /^Price:\s*/i),
    attributes: [...new Set(attributes)].join("; "),
    reviewSnippets: snippets.join(" | "),
    ratingText: q("div.F7nice")?.innerText ?? "",
  };
})()
