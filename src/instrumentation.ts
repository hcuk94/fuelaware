import { ensureAutomaticSyncScheduler } from "@/lib/services/auto-sync";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    ensureAutomaticSyncScheduler();
  }
}
