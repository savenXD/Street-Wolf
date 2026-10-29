"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { useWorkspace } from "@/lib/workspace";

const roles = ["Founder", "Sales", "Marketing", "Agency", "Other"];

/** Used for both first-run welcome (not dismissible) and "Edit profile". */
export function ProfileDialog({ open, onClose, welcome }: { open: boolean; onClose: () => void; welcome?: boolean }) {
  const { name, role, updateProfile } = useWorkspace();
  const [draftName, setDraftName] = useState(name);
  const [draftRole, setDraftRole] = useState(role);

  function save(e: React.FormEvent) {
    e.preventDefault();
    updateProfile({ name: draftName.trim(), role: draftRole, welcomed: true });
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={welcome ? () => updateProfile({ welcomed: true }) : onClose}
      title={welcome ? "Welcome to Street Wolf" : "Edit profile"}
      description={welcome ? "What should we call you? You can change this any time." : undefined}
    >
      <form onSubmit={save} className="space-y-4">
        <div>
          <Label htmlFor="pname">Your name</Label>
          <Input id="pname" autoFocus placeholder="Devansh" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
        </div>
        <div>
          <Label>What do you do?</Label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {roles.map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => setDraftRole(r === draftRole ? "" : r)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  draftRole === r ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300 text-neutral-600 hover:border-neutral-950"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <Button type="submit" className="w-full">{welcome ? "Continue" : "Save"}</Button>
      </form>
    </Dialog>
  );
}
