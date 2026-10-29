"use client";

import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace";

export function ProfileMenu({ onEditProfile }: { onEditProfile: () => void }) {
  const { name, email, avatarUrl, signOut } = useWorkspace();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const item = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100";
  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-neutral-200 py-1 pl-1 pr-3 transition-colors hover:bg-neutral-50"
      >
        <Avatar name={name || "You"} src={avatarUrl} className="size-8 ring-0" />
        {name && <span className="max-w-32 truncate text-sm font-medium">{name}</span>}
        <ChevronDown className={cn("size-4 text-neutral-500 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-64 rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium">{name || "You"}</p>
            <p className="truncate text-xs text-neutral-500">{email}</p>
          </div>
          <button className={item} onClick={() => { setOpen(false); onEditProfile(); }}>
            <User className="size-4" /> Edit profile
          </button>
          <Link href="/dashboard/settings" className={item} onClick={() => setOpen(false)}>
            <Settings className="size-4" /> Settings
          </Link>
          <button className={item} onClick={signOut}>
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
