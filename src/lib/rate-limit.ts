import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const admin = createAdminClient();
  const now = new Date();
  const { data } = await admin
    .from("rate_limits")
    .select("count, window_start")
    .eq("key", key)
    .maybeSingle();

  let count = 1;
  let windowStart = now.toISOString();

  if (data) {
    const elapsed = now.getTime() - new Date(data.window_start as string).getTime();
    if (elapsed < windowSeconds * 1000) {
      count = (data.count as number) + 1;
      windowStart = data.window_start as string;
    }
  }

  await admin
    .from("rate_limits")
    .upsert({ key, count, window_start: windowStart }, { onConflict: "key" });

  return count <= limit;
}
