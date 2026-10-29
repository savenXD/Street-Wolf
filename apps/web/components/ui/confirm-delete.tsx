"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/** What a person has to type to confirm, e.g. `delete Austin, TX`. Case and extra spaces don't matter. */
export const deletePhrase = (name: string) => `delete ${name}`;
const same = (a: string, b: string) => a.trim().replace(/\s+/g, " ").toLowerCase() === b.trim().replace(/\s+/g, " ").toLowerCase();

type Ask = { name: string; what: string; detail: string; run: () => void };

/**
 * Typed confirmation for deletes that can't be undone. `ask()` opens it; the button stays disabled until the exact
 * phrase `delete <name>` is typed. Render `dialog` once anywhere in the component.
 */
export function useConfirmDelete() {
  const [pending, setPending] = useState<Ask | null>(null);
  const [typed, setTyped] = useState("");
  const close = () => {
    setPending(null);
    setTyped("");
  };
  const phrase = pending ? deletePhrase(pending.name) : "";
  const dialog = (
    <Dialog open={!!pending} onClose={close} title={pending ? `Delete ${pending.what} "${pending.name}"?` : ""} description={pending?.detail}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (pending && same(typed, phrase)) {
            pending.run();
            close();
          }
        }}
      >
        <label className="block text-sm text-neutral-600">
          To confirm, type <strong className="select-all rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-neutral-950">{phrase}</strong>
        </label>
        <Input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={phrase} autoComplete="off" spellCheck={false} className="mt-2" />
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={close}>Cancel</Button>
          <Button type="submit" size="sm" disabled={!same(typed, phrase)} className="bg-red-600 hover:bg-red-700">Delete permanently</Button>
        </div>
      </form>
    </Dialog>
  );
  return { ask: (a: Ask) => setPending(a), dialog };
}
