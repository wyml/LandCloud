import { TagsManager } from "@/components/admin/tags/tags-manager";
import { getTagsWithCount } from "@/server/queries/images";

export const metadata = { title: "标签管理" };

export default async function AdminTagsPage() {
  const tags = await getTagsWithCount();
  return <TagsManager tags={tags} />;
}
