import type { Metadata, Viewport } from "next";
import { WorkspaceProvider } from "@/lib/workspace";

export const metadata: Metadata = { title: "Mobile outreach · Street Wolf", robots: { index: false, follow: false } };
// Phone screens: no pinch-zoom surprises on tap, and the page can reach under the notch.
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#ffffff" };

export default function MobileLayout({ children }: LayoutProps<"/m/[id]/[domain]/[city]">) {
  return <WorkspaceProvider>{children}</WorkspaceProvider>;
}
