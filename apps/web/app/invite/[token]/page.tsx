import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { InviteCard } from "./invite-card";

async function Body({ params }: Pick<PageProps<"/invite/[token]">, "params">) {
  const { token } = await params;
  return <InviteCard token={token} />;
}

export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  return (
    <main className="flex min-h-screen flex-col bg-white">
      <div className="px-4 py-5 sm:px-6">
        <Logo />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-24">
        <div className="w-full max-w-sm">
          <Suspense>
            <Body params={params} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
