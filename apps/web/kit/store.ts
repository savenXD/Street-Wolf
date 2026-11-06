// The kit, store: the app's client-side state (campaigns, domains, cities, sheets) and its shapes. Platforms read and
// change data only through useWorkspace(), never by calling the API directly, so optimistic updates and sync stay in one place.
export * from "@/lib/workspace";
export * from "@/lib/stats";
export { useToday } from "@/lib/presence";
