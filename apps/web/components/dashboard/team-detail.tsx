"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useConfirmDelete } from "@/components/ui/confirm-delete";
import { useRouter } from "next/navigation";
import { Metric, OutreachChart, useMembers } from "@/components/dashboard/campaign-view";
import { Avatar } from "@/components/ui/avatar";
import { conversionRate, memberOutreachPerDay, memberStats } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { type Campaign, useWorkspace } from "@/lib/workspace";

export function TeamDetail({ id }: { id: string }) {
  const { ready, campaigns } = useWorkspace();
  const campaign = campaigns.find((c) => c.id === id);
  return ready ? campaign ? <Detail campaign={campaign} /> : <Missing /> : null;
}

function Missing() {
  return (
    <div className="px-6 py-10">
      <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-neutral-950">← Back to dashboard</Link>
      <p className="mt-6 text-neutral-500">Campaign not found.</p>
    </div>
  );
}

/** Role and removal controls. What's offered mirrors what the server will allow (it enforces the same rules). */
function MemberControls({ campaign, userId, role, name }: { campaign: Campaign; userId: string; role: string; name: string }) {
  const { userId: me, setMemberRole, removeMember } = useWorkspace();
  const [confirming, setConfirming] = useState(false);
  const mine = campaign.myRole;
  const leaving = userId === me;
  const btn = "h-8 rounded-full border border-neutral-300 px-3 text-xs text-neutral-600 hover:border-neutral-950 hover:text-neutral-950";
  if (role === "Owner") return null;
  const canRemove = leaving || mine === "owner" || (mine === "admin" && role === "Member");
  if (!canRemove) return null;
  const removeBtn = <button className={btn} onClick={() => setConfirming(true)}>{leaving ? "Leave" : "Remove"}</button>;
  return (
    <>
      {mine === "owner" && !leaving ? (
        <div className="flex gap-2">
          <button className={btn} onClick={() => setMemberRole(campaign.id, userId, role === "Admin" ? "member" : "admin")}>{role === "Admin" ? "Make member" : "Make admin"}</button>
          {removeBtn}
        </div>
      ) : (
        removeBtn
      )}
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={leaving ? "Leave this campaign?" : `Remove ${name}?`}
        description={leaving ? "You'll lose access to its leads and sheets." : `${name} will lose access to this campaign's leads and sheets. They can be invited back later.`}
      >
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(false)}>Cancel</Button>
          <Button
            type="button"
            size="sm"
            className="bg-red-600 hover:bg-red-700"
            onClick={() => {
              setConfirming(false);
              removeMember(campaign.id, userId);
            }}
          >
            {leaving ? "Leave" : "Remove"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}

function Detail({ campaign }: { campaign: Campaign }) {
  const members = useMembers(campaign);
  const { deleteCampaign } = useWorkspace();
  const router = useRouter();
  const { ask, dialog } = useConfirmDelete();

  return (
    <div className="w-full px-6 pb-10">
      <Link href="/dashboard" className="mt-6 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-950">
        <ArrowLeft className="size-4" /> {campaign.name}
      </Link>
      <h1 className="mt-4 font-brand text-4xl font-bold tracking-[-0.04em] sm:text-6xl">Team</h1>
      <p className="mt-2 text-neutral-500">{members.length} {members.length === 1 ? "person" : "people"} on this campaign</p>

      <OutreachChart
        title="Everyone"
        series={members.map((m) => ({ id: m.label, label: m.label, color: m.color, data: memberOutreachPerDay(campaign, m.userId) }))}
        className="mt-8"
      />

      <div className="mt-6 space-y-6">
        {members.map((m) => {
          const st = memberStats(campaign, m.userId);
          return (
          <section key={m.label} className="space-y-4 rounded-3xl border border-neutral-200 p-6" style={{ borderTopColor: m.color, borderTopWidth: 4 }}>
            <div className="flex items-center gap-4">
              <span className="relative">
                <Avatar
                  name={m.label}
                  src={m.src}
                  className={cn("size-14 text-lg ring-2", !m.src && "bg-neutral-500")}
                  style={{ "--tw-ring-color": m.color } as React.CSSProperties}
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-brand text-2xl font-bold tracking-[-0.03em]">{m.label}</p>
                <p className="text-sm text-neutral-500">{m.role} · {m.status}</p>
              </div>
              {m.userId && <MemberControls campaign={campaign} userId={m.userId} role={m.role} name={m.label} />}
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Metric label="Total leads" value={st.leads} hint="Found by scrapers" />
              <Metric label="Outreached" value={st.outreached} hint="Calls, DMs and messages sent" />
              <Metric label="Converted" value={st.converted} hint="Replied or booked" />
              <Metric label="Conversion rate" value={conversionRate(st)} hint="Converted / outreached" />
            </div>
            <OutreachChart title="Outreach per day" series={[{ id: m.label, label: m.label, color: m.color, data: memberOutreachPerDay(campaign, m.userId) }]} />
          </section>
          );
        })}
      </div>
      {campaign.myRole === "owner" && (
        <div className="mt-10 flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 p-5">
          <div>
            <p className="text-sm font-medium">Delete this campaign</p>
            <p className="text-sm text-neutral-500">Removes its domains, places and every lead for everyone on the team. This can&apos;t be undone.</p>
          </div>
          <button
            className="h-9 shrink-0 rounded-full border border-neutral-300 px-4 text-sm hover:border-neutral-950"
            onClick={() =>
              ask({
                name: campaign.name,
                what: "campaign",
                detail: "This permanently deletes the campaign with all its domains, cities, leads and scrape jobs, for everyone on the team. It can't be undone.",
                run: () => {
                  deleteCampaign(campaign.id);
                  router.push("/dashboard");
                },
              })
            }
          >
            Delete
          </button>
        </div>
      )}
      {dialog}
    </div>
  );
}
