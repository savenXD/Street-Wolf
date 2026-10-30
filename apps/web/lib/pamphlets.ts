// Pamphlets: the things a customer asks for after a call ("send me the details on WhatsApp"). A few ready-made messages and an
// image whose business name, offer and prices can be changed, drawn on a canvas so it can be shared as a picture.
// Stored in this browser for now; the shape is what a settings screen will edit later.

export type Message = { id: string; title: string; text: string };
export type PamphletItem = { name: string; price: string };
export type Pamphlet = {
  business: string;
  headline: string;
  items: PamphletItem[];
  contact: string;
  /** Accent colour of the image. */
  color: string;
};
export type PamphletKit = { messages: Message[]; pamphlet: Pamphlet };

export const PAMPHLET_COLORS = ["#0a0a0a", "#2a6ff0", "#10b981", "#ef4444", "#8b5cf6", "#f97316"];

/** `{name}` is the lead, `{business}` is you. */
export const defaultKit: PamphletKit = {
  messages: [
    { id: "details", title: "Send details", text: "Hi {name}, as we discussed on the call, here are the details from {business}. Happy to answer anything you'd like to know." },
    { id: "pricing", title: "Pricing", text: "Hi {name}, thanks for your time today. I'm sharing our pricing below. Let me know which option suits you and I'll set it up." },
    { id: "callback", title: "Call back", text: "Hi {name}, this is {business}. Sorry I missed you. When is a good time for a quick call?" },
    { id: "thanks", title: "Thank you", text: "Thank you {name}! Great speaking with you. Message me here anytime and I'll help right away." },
  ],
  pamphlet: {
    business: "Your Business",
    headline: "Our offer for you",
    items: [
      { name: "Starter", price: "₹999" },
      { name: "Standard", price: "₹2,499" },
      { name: "Premium", price: "₹4,999" },
    ],
    contact: "+91 98765 43210",
    color: "#0a0a0a",
  },
};

export const fill = (text: string, vars: { name?: string; business?: string }) =>
  text.replace(/\{name\}/g, vars.name?.trim() || "there").replace(/\{business\}/g, vars.business?.trim() || "our team");

const key = (campaignId: string) => `sw-pamphlets:${campaignId}`;

export function loadKit(campaignId: string): PamphletKit {
  try {
    const raw = localStorage.getItem(key(campaignId));
    if (raw) {
      const k = JSON.parse(raw) as Partial<PamphletKit>;
      return { messages: k.messages?.length ? k.messages : defaultKit.messages, pamphlet: { ...defaultKit.pamphlet, ...k.pamphlet } };
    }
  } catch {}
  return defaultKit;
}

export function saveKit(campaignId: string, kit: PamphletKit) {
  try {
    localStorage.setItem(key(campaignId), JSON.stringify(kit));
  } catch {}
}

export const PAMPHLET_SIZE = 1080;

/** Shrinks the text until it fits `max` pixels wide. */
function fit(ctx: CanvasRenderingContext2D, text: string, weight: number, start: number, max: number, min = 28) {
  let size = start;
  do {
    ctx.font = `${weight} ${size}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    size -= 2;
  } while (ctx.measureText(text).width > max && size > min);
}

function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draws the pamphlet at 1080 x 1080. Call again with new values to update it. */
export function drawPamphlet(canvas: HTMLCanvasElement, p: Pamphlet) {
  const S = PAMPHLET_SIZE;
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const pad = 80;

  ctx.fillStyle = p.color;
  ctx.fillRect(0, 0, S, S);
  // Soft circle in the corner so a flat colour doesn't look empty.
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.arc(S - 120, 120, 330, 0, Math.PI * 2);
  ctx.fill();

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  fit(ctx, p.headline.toUpperCase(), 600, 34, S - pad * 2);
  ctx.fillText(p.headline.toUpperCase(), pad, 160);

  ctx.fillStyle = "#fff";
  fit(ctx, p.business, 800, 104, S - pad * 2, 48);
  ctx.fillText(p.business, pad, 285);

  const items = p.items.filter((i) => i.name.trim() || i.price.trim()).slice(0, 5);
  const rowH = 128;
  const gap = 22;
  const top = 360;
  items.forEach((it, i) => {
    const y = top + i * (rowH + gap);
    ctx.fillStyle = "#fff";
    round(ctx, pad, y, S - pad * 2, rowH, 30);
    ctx.fill();
    ctx.fillStyle = "#0a0a0a";
    fit(ctx, it.name, 600, 46, 520);
    ctx.textAlign = "left";
    ctx.fillText(it.name, pad + 44, y + rowH / 2 + 16);
    ctx.fillStyle = p.color;
    fit(ctx, it.price, 800, 58, 330);
    ctx.textAlign = "right";
    ctx.fillText(it.price, S - pad - 44, y + rowH / 2 + 20);
    ctx.textAlign = "left";
  });

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  fit(ctx, p.contact ? `Call or WhatsApp  ${p.contact}` : "", 600, 38, S - pad * 2);
  if (p.contact) ctx.fillText(`Call or WhatsApp  ${p.contact}`, pad, S - 78);
}

export const canvasToFile = (canvas: HTMLCanvasElement, name: string) =>
  new Promise<File>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(new File([b], `${name.replace(/[^\w-]+/g, "-").toLowerCase() || "pamphlet"}.png`, { type: "image/png" })) : reject(new Error("Couldn't make the image"))), "image/png"),
  );
