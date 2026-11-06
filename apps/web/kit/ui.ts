// The kit: the only part of apps/web a platform (platforms/<name>) may import. Lint rejects any other `@/…` import from a
// platform. Keep each file small and stable; adding an export here is a deliberate API decision (see apps/web/README.md).
//
// ui: the design system. Monochrome, Tailwind. Pure presentation, no data access.
export { Avatar } from "@/components/ui/avatar";
export { BottomSheet } from "@/components/ui/bottom-sheet";
export { BrandIcon, brandIcon, type BrandName } from "@/components/brand-icon";
export * from "@/components/ui/button";
export * from "@/components/ui/confirm-delete";
export * from "@/components/ui/dialog";
export * from "@/components/ui/input";
export * from "@/components/ui/load-bar";
export * from "@/components/ui/skeleton";
export * from "@/components/ui/spinner";
export { Fade, LiveTile, SoftTile } from "@/components/dashboard/feature-tile";
export { cn } from "@/lib/utils";
