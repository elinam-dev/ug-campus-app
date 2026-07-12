import { storage } from "@/src/utils/storage";

const KEY = "ug_scripture_last_seen"; // stores YYYY-MM-DD

export async function getLastSeen(): Promise<string | null> {
  return (await storage.getItem<string>(KEY, "")) || null;
}

export async function markSeenToday(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await storage.setItem(KEY, today);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
