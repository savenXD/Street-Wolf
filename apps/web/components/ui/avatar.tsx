import { cn } from "@/lib/utils";

export function Avatar({
  name,
  src,
  className,
  dashed,
  style,
}: {
  name?: string;
  src?: string | null;
  className?: string;
  dashed?: boolean;
  style?: React.CSSProperties;
}) {
  const initial = (name?.trim()[0] ?? "?").toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-950 text-xs font-medium text-white ring-2 ring-white",
        dashed && "bg-white text-neutral-500 ring-0 border border-dashed border-neutral-400",
        className,
      )}
      title={name}
      style={style}
    >
      {src ? (
        // Google avatars need no-referrer, so a plain <img> beats next/image here.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name ?? ""} referrerPolicy="no-referrer" className="size-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );
}
