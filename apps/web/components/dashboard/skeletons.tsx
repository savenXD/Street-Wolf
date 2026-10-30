import { Skeleton } from "@/components/ui/skeleton";

/** Dashboard home while the workspace loads: greeting, metrics and the team card. */
export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="w-full px-6">
      <div className="py-8">
        <Skeleton className="h-12 w-72 max-w-full rounded-xl sm:h-16 sm:w-[28rem]" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6 rounded-3xl border border-neutral-200 p-6">
          <Skeleton className="h-20 w-64 rounded-2xl" />
          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
          <Skeleton className="h-48 rounded-2xl" />
        </div>
        <div className="space-y-4 rounded-3xl border border-neutral-200 p-6">
          <Skeleton className="h-5 w-16" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Any other dashboard page while the workspace loads. */
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="w-full space-y-4 px-6 py-8">
      <Skeleton className="h-10 w-64 rounded-xl" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-3xl" />)}
      </div>
    </div>
  );
}

const LETTERS = "ABCDEFGH".split("");

/** The spreadsheet frame (column headers and rows) with pulsing cells, shown while a sheet's leads are fetched. */
export function SheetGridSkeleton({ rows = 24 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading leads" className="mt-4 flex-1 overflow-hidden rounded-xl border border-neutral-200">
      <div className="grid grid-cols-[3rem_repeat(8,minmax(7rem,1fr))] border-b border-neutral-200 bg-neutral-50">
        <div className="h-8 border-r border-neutral-200" />
        {LETTERS.map((l) => <div key={l} className="flex h-8 items-center justify-center border-r border-neutral-200 text-xs font-medium text-neutral-300">{l}</div>)}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="grid grid-cols-[3rem_repeat(8,minmax(7rem,1fr))] border-b border-neutral-100">
          <div className="flex h-9 items-center justify-center border-r border-neutral-100 text-[10px] text-neutral-300">{r + 1}</div>
          {LETTERS.map((l, c) => (
            <div key={l} className="flex h-9 items-center border-r border-neutral-100 px-2.5">
              <Skeleton className={["w-4/5", "w-3/5", "w-2/3", "w-1/2", "w-11/12"][(r + c) % 5] + " h-3 rounded"} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
