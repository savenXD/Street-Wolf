"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { useWorkspace } from "@/lib/workspace";
import { NotificationBell } from "./notification-bell";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadBar } from "@/components/ui/load-bar";
import { ProfileDialog } from "./profile-dialog";
import { ProfileMenu } from "./profile-menu";
import { ScraperStatus } from "./scraper-status";
import { ShellActions } from "./shell-actions";

export function Shell({ children }: { children: React.ReactNode }) {
  const { ready, welcomed, signedIn, error, clearError } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const router = useRouter();
  const path = usePathname();
  const onScrapePage = path.startsWith("/dashboard/maps");
  const newCampaign = () => router.push("/new");

  // Real accounts only: anyone who isn't signed in goes to the sign-in page and comes back here afterwards.
  useEffect(() => {
    if (ready && !signedIn) router.replace(`/signup?next=${encodeURIComponent(window.location.pathname)}`);
  }, [ready, signedIn, router]);

  return (
    <ShellActions.Provider value={{ newCampaign, editProfile: () => setEditing(true) }}>
      <div className="flex min-h-screen flex-col bg-white">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-6">
          <Logo href="/dashboard" className="text-3xl" />
          <div className="flex items-center gap-3">
            {!ready && (
              <>
                <Skeleton className="size-9 rounded-full" />
                <Skeleton className="size-9 rounded-full" />
              </>
            )}
            {ready && signedIn && (
              <>
                {onScrapePage && <ScraperStatus />}
                <NotificationBell />
                <ProfileMenu onEditProfile={() => setEditing(true)} />
              </>
            )}
          </div>
        </header>
        <main className="flex flex-1 flex-col">{!ready ? <LoadBar /> : signedIn ? children : null}</main>
      </div>
      {error && (
        <div role="alert" className="fixed bottom-5 left-1/2 z-[60] flex max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl bg-neutral-950 px-4 py-3 text-sm text-white shadow-xl">
          <span>{error}</span>
          <button onClick={clearError} className="text-neutral-400 hover:text-white" aria-label="Dismiss">✕</button>
        </div>
      )}
      <ProfileDialog open={ready && !welcomed} onClose={() => {}} welcome />
      <ProfileDialog key={String(editing)} open={editing} onClose={() => setEditing(false)} />
    </ShellActions.Provider>
  );
}
