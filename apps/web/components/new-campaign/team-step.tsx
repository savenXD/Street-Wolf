import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkspace } from "@/lib/workspace";
import { Heading } from "./heading";

export function TeamStep({ team, setTeam }: { team: string[]; setTeam: (t: string[]) => void }) {
  const { invites } = useWorkspace();
  const [email, setEmail] = useState("");

  function addEmail() {
    const e = email.trim().toLowerCase();
    if (e && /\S+@\S+\.\S+/.test(e) && !team.includes(e)) setTeam([...team, e]);
    setEmail("");
  }

  return (
    <>
      <Heading title="Add your friends" hint="Invite teammates by email. You can skip this and add them later." />
      <form
        className="mt-10 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          addEmail();
        }}
      >
        <Input autoFocus type="email" placeholder="friend@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-14 rounded-2xl text-lg" />
        <Button type="submit" variant="outline" className="h-14">Add</Button>
      </form>
      {invites.some((i) => !team.includes(i.email)) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
          From your friends:
          {invites
            .filter((i) => !team.includes(i.email))
            .map((i) => (
              <button key={i.email} onClick={() => setTeam([...team, i.email])} className="rounded-full border border-neutral-300 px-3 py-1 hover:border-neutral-950">
                + {i.email}
              </button>
            ))}
        </div>
      )}
      <ul className="mt-6 space-y-2">
        {team.map((t) => (
          <li key={t} className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3 text-sm">
            {t}
            <button onClick={() => setTeam(team.filter((x) => x !== t))} aria-label={`Remove ${t}`} className="text-neutral-400 hover:text-neutral-950">
              <X className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
