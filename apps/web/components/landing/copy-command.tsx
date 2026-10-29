"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked (insecure origin); the command is still selectable.
    }
  }

  return (
    <button
      onClick={copy}
      className="group inline-flex max-w-full items-center gap-3 rounded-full border border-neutral-200 bg-neutral-50 py-2 pr-3 pl-4 font-mono text-xs text-neutral-600 hover:border-neutral-400"
    >
      <span className="text-neutral-400">$</span>
      <span className="truncate">{command}</span>
      {copied ? <Check className="size-3.5 text-neutral-950" /> : <Copy className="size-3.5 group-hover:text-neutral-950" />}
    </button>
  );
}
