import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { SignupForm } from "./signup-form";

async function SignupBody({ searchParams }: Pick<PageProps<"/signup">, "searchParams">) {
  const { next, error } = await searchParams;
  return (
    <>
      {error && (
        <p className="mt-6 rounded-xl border border-neutral-300 bg-neutral-50 px-3.5 py-2.5 text-sm">
          Sign-in failed. Try again.
        </p>
      )}
      <SignupForm next={typeof next === "string" && next.startsWith("/") ? next : "/onboarding"} />
    </>
  );
}

export default function SignupPage({ searchParams }: PageProps<"/signup">) {
  return (
    <main className="flex min-h-screen flex-col bg-white">
      <div className="px-4 py-5 sm:px-6">
        <Logo />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-24">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-semibold tracking-tight">Join the pack</h1>
          <p className="mt-2 text-neutral-500">Free forever. No card. Sign in or create an account.</p>
          <Suspense>
            <SignupBody searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
