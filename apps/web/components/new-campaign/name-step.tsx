import { Input } from "@/components/ui/input";
import { Heading } from "./heading";

export function NameStep({ name, setName, onEnter }: { name: string; setName: (v: string) => void; onEnter: () => void }) {
  return (
    <>
      <Heading title="Name your campaign" hint="Something you'll recognise later." />
      <Input
        autoFocus
        placeholder="Dentists in Austin"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter()}
        className="mt-10 h-14 rounded-2xl text-lg"
      />
    </>
  );
}
