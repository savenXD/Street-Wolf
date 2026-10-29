import type { Metadata } from "next";
import { Shell } from "@/components/dashboard/shell";
import { WorkspaceProvider } from "@/lib/workspace";

export const metadata: Metadata = { title: "Dashboard · Street Wolf" };

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <WorkspaceProvider>
      <Shell>{children}</Shell>
    </WorkspaceProvider>
  );
}
