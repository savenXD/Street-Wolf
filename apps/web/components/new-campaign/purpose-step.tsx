import { cn } from "@/lib/utils";
import { Heading } from "./heading";

const purposes = ["Find new customers", "Book meetings", "Promote a product", "Recruit talent", "Research a market"];

export function PurposeStep({ purpose, setPurpose }: { purpose: string; setPurpose: (v: string) => void }) {
  return (
    <>
      <Heading title="What's the purpose?" hint="In a sentence, what do you want out of this campaign?" />
      <textarea
        autoFocus
        rows={3}
        placeholder="Book demos with local dental clinics"
        value={purpose}
        onChange={(e) => setPurpose(e.target.value)}
        className="mt-10 w-full resize-none rounded-2xl border border-neutral-300 p-4 text-lg outline-none placeholder:text-neutral-400 focus:border-neutral-950"
      />
      <div className="mt-4 flex flex-wrap gap-2">
        {purposes.map((p) => (
          <button
            key={p}
            onClick={() => setPurpose(p)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              purpose === p ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300 text-neutral-600 hover:border-neutral-950",
            )}
          >
            {p}
          </button>
        ))}
      </div>
    </>
  );
}
