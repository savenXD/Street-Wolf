import { Plus } from "lucide-react";
import { faqs } from "@/lib/seo";

/** Native <details> keeps every answer in the HTML (crawlable) while still collapsing for readers; no JS needed. */
export function Faq() {
  return (
    <div className="mx-auto mt-10 max-w-2xl divide-y divide-neutral-200 rounded-3xl border border-neutral-200">
      {faqs.map((it, i) => (
        <details key={it.q} open={i === 0} className="group">
          <summary className="flex w-full cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-left font-medium [&::-webkit-details-marker]:hidden">
            <h3 className="font-medium">{it.q}</h3>
            <Plus className="size-5 shrink-0 transition-transform group-open:rotate-45" />
          </summary>
          <p className="px-6 pb-5 leading-relaxed text-neutral-600">{it.a}</p>
        </details>
      ))}
    </div>
  );
}
