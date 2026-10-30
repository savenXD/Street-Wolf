import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { WorkspaceProvider } from "@/lib/workspace";

export const metadata: Metadata = { title: "New campaign · Street Wolf", robots: { index: false, follow: false } };

export default function NewCampaignLayout({ children }: LayoutProps<"/new">) {
  return (
    <WorkspaceProvider>
      <div className="flex min-h-screen flex-col bg-white">
        <header className="flex h-16 items-center justify-center">
          <Logo href="/dashboard" />
        </header>
        {children}
      </div>
    </WorkspaceProvider>
  );
}
