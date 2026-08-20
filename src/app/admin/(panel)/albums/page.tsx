import { AdminPlaceholder, PageShell } from "@/components/admin/placeholder";

export const metadata = { title: "相册管理" };

export default function AdminAlbumsPage() {
  return (
    <PageShell>
      <AdminPlaceholder title="相册管理" milestone="M4" />
    </PageShell>
  );
}
