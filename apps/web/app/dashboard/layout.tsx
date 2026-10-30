import type { Metadata } from "next";
import { Suspense } from "react";
import { Shell } from "@/components/dashboard/shell";
import { LoadBar } from "@/components/ui/load-bar";
import { WorkspaceProvider } from "@/lib/workspace";

export const metadata: Metadata = { title: "Dashboard · Street Wolf" };

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <WorkspaceProvider>
      <Suspense fallback={<LoadBar fullscreen />}>
        <Shell>{children}</Shell>
      </Suspense>
    </WorkspaceProvider>
  );
}
