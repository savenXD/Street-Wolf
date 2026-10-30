"use client";

import { useShellActions } from "@/components/dashboard/shell-actions";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useConfirmDelete } from "@/components/ui/confirm-delete";
import { ScraperTokens } from "@/components/dashboard/scraper-tokens";
import { useWorkspace } from "@/lib/workspace";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h3 className="text-sm font-semibold tracking-tight text-neutral-500">{title}</h3>
      <div className="mt-3 rounded-2xl border border-neutral-200 bg-white px-5">{children}</div>
    </section>
  );
}

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

const DangerButton = (p: React.ComponentProps<typeof Button>) => <Button variant="outline" size="sm" className="shrink-0 border-red-200 text-red-600 hover:bg-red-50" {...p}>Delete</Button>;

/** Every campaign, domain and city the person may delete. Each delete needs the typed phrase `delete <name>`. */
function DataSection() {
  const { campaigns, deleteCampaign, removeDomain, removeCity } = useWorkspace();
  const { ask, dialog } = useConfirmDelete();
  if (!campaigns.length) return <p className="py-4 text-sm text-neutral-500">No campaigns yet.</p>;
  return (
    <>
      {campaigns.map((c) => {
        const owner = c.myRole === "owner";
        const admin = owner || c.myRole === "admin";
        return (
          <div key={c.id} className="border-b border-neutral-100 py-4 last:border-0">
            <Row title={c.name} hint={owner ? "Campaign" : admin ? "Campaign (only the owner can delete it)" : "Campaign (view only)"}>
              {owner && <DangerButton onClick={() => ask({ name: c.name, what: "campaign", detail: "This permanently deletes the campaign with every domain, city, sheet and lead in it, for all members.", run: () => deleteCampaign(c.id) })} />}
            </Row>
            {c.domains.map((d) => (
              <div key={d.id} className="ml-4 border-l border-neutral-200 pl-4">
                <Row title={d.name} hint="Domain">
                  {admin && <DangerButton onClick={() => ask({ name: d.name, what: "domain", detail: `This permanently deletes the domain and all its cities and leads from "${c.name}".`, run: () => removeDomain(c.id, d.id) })} />}
                </Row>
                {d.cities.map((city) => (
                  <div key={city.id} className="ml-4 border-l border-neutral-200 pl-4">
                    <Row title={city.name} hint="City">
                      {admin && <DangerButton onClick={() => ask({ name: city.name, what: "city", detail: `This permanently deletes the sheet and every lead in ${city.name} (${d.name}).`, run: () => removeCity(c.id, d.id, city.id) })} />}
                    </Row>
                  </div>
                ))}
              </div>
            ))}
          </div>
        );
      })}
      {dialog}
    </>
  );
}

export default function SettingsPage() {
  const { name, email, role, avatarUrl, invites, removeInvite, signOut } = useWorkspace();
  const { editProfile } = useShellActions();

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
      <Section title="Profile">
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
      </Section>

      <Section title="Team">
        <Row title={name || "You"} hint={email ?? ""}>
          <span className="text-sm text-neutral-400">Owner</span>
        </Row>
        {invites.map((i) => (
          <Row key={i.email} title={i.email} hint="Invite pending">
            <Button variant="outline" size="sm" onClick={() => removeInvite(i.email)}>Revoke</Button>
          </Row>
        ))}
        <p className="py-4 text-sm text-neutral-500">Invite people from the + button in the top bar.</p>
      </Section>

      <Section title="Integrations">
        <Row title="Google Maps" hint="Lead source for campaigns.">
          <span className="rounded-full border border-neutral-300 px-2.5 py-0.5 text-xs">Built in</span>
        </Row>
        <ScraperTokens />
      </Section>

      <Section title="Delete data">
        <DataSection />
      </Section>

      <Section title="Billing">
        <Row title="Free plan" hint="Free forever. No card required." />
      </Section>
    </div>
  );
}
