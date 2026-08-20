import { AdminPlaceholder, PageShell } from "@/components/admin/placeholder";

export const metadata = { title: "站点设置" };

export default function AdminSettingsPage() {
  return (
    <PageShell>
      <AdminPlaceholder title="站点设置" milestone="M8" />
    </PageShell>
  );
}
