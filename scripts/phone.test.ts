import { parsePhone } from "../apps/web/lib/phone";
let pass = 0, fail = 0;
const t = (n: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "  ok " : "  FAIL"} ${n}${c ? "" : "  " + x}`); };

const M = "+919876543210";
const W = "919876543210";
// Every way of writing the same Indian mobile number reaches the same call number and WhatsApp chat.
for (const raw of [
  "+91 98765 43210", "+91-98765-43210", "+919876543210", "91 98765 43210", "919876543210", "0091 98765 43210", "00919876543210",
  "098765 43210", "09876543210", "98765 43210", "9876543210", "98765-43210", "(+91) 98765 43210", "+91 (0) 98765 43210",
  "+91 098765 43210", "091 98765 43210", "0919876543210", "91-0-98765-43210", " +91 98765 43210 ", "98765 43210 ext 12", "tel: 98765 43210".replace("tel: ", ""),
]) {
  const p = parsePhone(raw);
  t(`mobile  ${raw}`, p.tel === M && p.wa === W && p.mobile, JSON.stringify(p));
}
// Several numbers in one cell: prefer the one WhatsApp can open.
t("two mobiles takes first", parsePhone("98765 43210 / 98123 45678").tel === M);
t("landline then mobile takes the mobile", parsePhone("020 2612 3456, 98765 43210").wa === W);
t("mobile 'or' mobile", parsePhone("98765 43210 or 98123 45678").tel === M);
// Landlines: dial, but no WhatsApp.
for (const [raw, tel] of [["020 2612 3456", "+912026123456"], ["+91 20 2612 3456", "+912026123456"], ["022-2345-6789", "+912223456789"], ["011 2345 6789", "+911123456789"], ["(020) 26123456", "+912026123456"]] as const) {
  const p = parsePhone(raw);
  t(`landline ${raw}`, p.tel === tel && p.wa === null && !p.mobile, JSON.stringify(p));
}
t("landline without city code dials as is", parsePhone("2612 3456").tel === "26123456" && parsePhone("2612 3456").wa === null);
t("toll free has no whatsapp", parsePhone("1800 123 4567").wa === null && parsePhone("1800 123 4567").tel === "18001234567");
// Other countries and rubbish.
t("US number with +", parsePhone("+1 415 555 2671").tel === "+14155552671");
t("UK 0044", parsePhone("0044 20 7946 0958").tel === "+442079460958");
t("masked is not dialable", parsePhone("+91 98••• 41820").tel === null);
t("empty", parsePhone("").tel === null && parsePhone("   ").tel === null);
t("too short", parsePhone("12345").tel === null);
t("not a number", parsePhone("call after 5").tel === null);
t("5xxxx indian mobile prefix is not mobile", !parsePhone("5876543210").mobile);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
