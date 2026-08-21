import { requireAdmin } from "@/lib/auth";
import { getAdminEmail } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { AccountForm } from "@/components/admin/settings/account-form";

export const metadata = { title: "账户设置" };

export default async function AdminAccountPage() {
  const user = await requireAdmin();
  const adminEmail = await getAdminEmail();
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">账户设置</h1>
      <p className="text-sm opacity-60">管理管理员账户信息、邮箱和密码。</p>
      <AccountForm
        currentEmail={adminEmail}
        profile={{
          displayName: profile?.display_name ?? "",
          avatarUrl: profile?.avatar_url ?? "",
        }}
        metadata={{
          createdAt: user.created_at,
          lastSignIn: user.last_sign_in_at ?? null,
          emailConfirmed: !!user.email_confirmed_at,
        }}
      />
    </div>
  );
}
