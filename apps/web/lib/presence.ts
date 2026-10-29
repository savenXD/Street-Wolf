"use client";

import { useSyncExternalStore } from "react";

/** Outreach done today by `${campaignId}:${userId}`, for the caller's own saves (so their number moves instantly). */
let today: Record<string, number> = {};
const listeners = new Set<() => void>();

const emit = () => {
  today = { ...today };
  listeners.forEach((l) => l());
};

export function setToday(campaignId: string, userId: string, n: number) {
  today[`${campaignId}:${userId}`] = n;
  emit();
}
/** The server's numbers take over again (after a refresh, and across midnight). */
export function clearToday() {
  today = {};
  emit();
}

const subscribe = (l: () => void) => (listeners.add(l), () => void listeners.delete(l));
export const useToday = () => useSyncExternalStore(subscribe, () => today, () => today);
