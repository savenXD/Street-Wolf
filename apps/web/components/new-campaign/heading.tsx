export function Heading({ title, hint }: { title: string; hint?: string }) {
  return (
    <>
      <h1 className="font-brand text-4xl font-bold tracking-[-0.04em] sm:text-5xl">{title}</h1>
      {hint && <p className="mt-3 text-neutral-500">{hint}</p>}
    </>
  );
}
