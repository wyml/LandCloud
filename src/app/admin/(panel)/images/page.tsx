import { AdminPlaceholder, PageShell } from "@/components/admin/placeholder";

export const metadata = { title: "图片管理" };

export default function AdminImagesPage() {
  return (
    <PageShell>
      <AdminPlaceholder title="图片管理" milestone="M2/M3" />
    </PageShell>
  );
}
