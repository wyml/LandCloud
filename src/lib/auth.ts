import "server-only";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getAdminEmail } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function getSessionUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function isAdminUser(user: User | null): Promise<boolean> {
  if (!user?.email) return false;
  return user.email.toLowerCase() === (await getAdminEmail()).toLowerCase();
}

export async function requireAdmin(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (!(await isAdminUser(user))) redirect("/admin/forbidden");
  return user;
}
