import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { Confirm } from "./confirm";

async function Body({ searchParams }: Pick<PageProps<"/auth/confirm">, "searchParams">) {
  const { token } = await searchParams;
  return <Confirm token={typeof token === "string" ? token : ""} />;
}

export default function ConfirmPage({ searchParams }: PageProps<"/auth/confirm">) {
  return (
    <main className="flex min-h-screen flex-col bg-white">
      <div className="px-4 py-5 sm:px-6">
        <Logo />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-24">
        <div className="w-full max-w-sm">
          <Suspense>
            <Body searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
