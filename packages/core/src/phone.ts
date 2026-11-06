// Reads a phone number the way people actually type Indian numbers, and says what to dial and what WhatsApp can open.
// One cell gives both: the call link and the WhatsApp chat come from the same number, nothing extra to enter.
//
//   "+91 98765 43210"  "098765 43210"  "98765-43210"  "91 98765 43210"  "0091 9876543210"  "(+91) 98765 43210"
//   "+91 (0) 98765 43210"  "020 2612 3456" (landline with city code)  "1800 123 4567" (toll free)
//   "98765 43210 / 98765 43211"  "98765 43210, 020 2612 3456"  "98765 43210 ext 12"

export type Phone = {
  /** What goes after `tel:`: "+" and the country code where there is one, plain digits for numbers that only work locally. Null when there is nothing dialable. */
  tel: string | null;
  /** Digits for `wa.me/…`. Null for landlines and toll-free numbers, which WhatsApp can't open. */
  wa: string | null;
  mobile: boolean;
};

const intlPhone = (digits: string, wa: boolean): Phone => ({ tel: `+${digits}`, wa: wa ? digits : null, mobile: wa });
const NONE: Phone = { tel: null, wa: null, mobile: false };
const IN = "91";
const isIndianMobile = (n: string) => /^[6-9]\d{9}$/.test(n);

/** One number, no separators between numbers. */
function parseOne(raw: string): Phone {
  const cleaned = raw
    .replace(/\(\s*0\s*\)/g, "") // "+91 (0) 98765…": the (0) is the trunk digit people write by habit
    .replace(/\b(?:ext|extn|extension|x)\b\.?\s*\d+\s*$/i, "")
    .trim();
  if (/[•*xX]{3,}/.test(cleaned)) return NONE; // masked, like "+91 98••• 41820"
  const plus = /^\s*\(?\s*\+/.test(cleaned);
  let d = cleaned.replace(/\D/g, "");
  if (d.length < 7) return NONE;

  let intl = plus;
  if (!plus && d.startsWith("00")) {
    d = d.slice(2);
    intl = true;
  }

  // Written with a country code: +91…, 0091…
  if (intl) {
    if (d.startsWith(IN)) {
      const n = d.slice(2).replace(/^0+/, ""); // "+91 098765…" has a stray trunk 0
      return indian(n);
    }
    if (d.length < 8 || d.length > 15) return NONE;
    return intlPhone(d, true); // another country: dial it as written, WhatsApp is worth a try
  }

  // No "+": the leading 0 is the Indian trunk prefix, 91 may be a country code someone wrote without "+".
  if (d.startsWith("091") && d.length >= 13) d = d.slice(1); // 0 91 98765 43210
  if (d.startsWith(IN) && d.length === 12 && /^[2-9]/.test(d[2])) return indian(d.slice(2)); // 91 98765 43210
  if (d.startsWith(IN) && d.length === 13 && d[2] === "0") return indian(d.slice(3)); // 91 0 98765 43210
  return indian(d.replace(/^0+/, ""));
}

/** An Indian number without country code or trunk 0. */
function indian(n: string): Phone {
  if (isIndianMobile(n)) return intlPhone(IN + n, true);
  if (/^1(800|860)\d{6,7}$/.test(n)) return { tel: n, wa: null, mobile: false }; // toll free works only inside India
  if (/^[1-5]\d{9}$/.test(n)) return intlPhone(IN + n, false); // landline with its city code (STD)
  if (n.length >= 6 && n.length <= 8) return { tel: n, wa: null, mobile: false }; // landline without a city code: dial as is
  return NONE;
}

/**
 * The number to use from a cell. A cell with several numbers ("a / b", "a, b") gives the first mobile one, else the first that
 * can be dialled, so the WhatsApp button appears whenever any of the numbers can take WhatsApp.
 */
export function parsePhone(cell: string): Phone {
  const found = cell
    .split(/\s*(?:[/,;|\n]|\bor\b|\band\b|&)\s*/i)
    .map(parseOne)
    .filter((p) => p.tel);
  return found.find((p) => p.mobile && p.wa) ?? found[0] ?? NONE;
}
