import { AdminPlaceholder, PageShell } from "@/components/admin/placeholder";

export const metadata = { title: "标签管理" };

export default function AdminTagsPage() {
  return (
    <PageShell>
      <AdminPlaceholder title="标签管理" milestone="M3/M4" />
    </PageShell>
  );
}
