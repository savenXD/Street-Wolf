"use client";

import { useState } from "react";
import { useShellActions } from "@/components/dashboard/shell-actions";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScraperTokens } from "@/components/dashboard/scraper-tokens";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace";

const tabs = ["Profile", "Team", "Integrations", "Billing"] as const;

function Row({ title, hint, children }: { title: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-neutral-100 py-4 last:border-0">
      <div>
        <p className="text-sm font-medium">{title}</p>
        {hint && <p className="text-sm text-neutral-500">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Profile");
  const { name, email, role, avatarUrl, invites, removeInvite, signOut } = useWorkspace();
  const { editProfile } = useShellActions();

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-neutral-200">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm",
              tab === t ? "border-neutral-950 font-medium" : "border-transparent text-neutral-500 hover:text-neutral-950",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-neutral-200 bg-white px-5">
        {tab === "Profile" && (
          <>
            <Row title={name || "You"} hint={email ?? ""}>
              <Avatar name={name || "You"} src={avatarUrl} className="size-12 text-base ring-0" />
            </Row>
            <Row title="Name" hint={name || "Not set"}>
              <Button variant="outline" size="sm" onClick={editProfile}>Edit</Button>
            </Row>
            <Row title="Role" hint={role || "Not set"}>
              <Button variant="outline" size="sm" onClick={editProfile}>Edit</Button>
            </Row>
            <Row title="Account" hint={`Signed in as ${email}. Your work is saved to your account.`}>
              <Button variant="outline" size="sm" onClick={signOut}>Sign out</Button>
            </Row>
          </>
        )}
        {tab === "Team" && (
          <>
            <Row title={name || "You"} hint={email ?? ""}>
              <span className="text-sm text-neutral-400">Owner</span>
            </Row>
            {invites.map((i) => (
              <Row key={i.email} title={i.email} hint="Invite pending">
                <Button variant="outline" size="sm" onClick={() => removeInvite(i.email)}>Revoke</Button>
              </Row>
            ))}
            <p className="py-4 text-sm text-neutral-500">Invite people from the + button in the top bar.</p>
          </>
        )}
        {tab === "Integrations" && (
          <>
            <Row title="Google Maps" hint="Lead source for campaigns.">
              <span className="rounded-full border border-neutral-300 px-2.5 py-0.5 text-xs">Built in</span>
            </Row>
            <ScraperTokens />
          </>
        )}
        {tab === "Billing" && (
          <Row title="Free plan" hint="Free forever. No card required." />
        )}
      </div>
    </div>
  );
}
