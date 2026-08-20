import { SharesManager } from "@/components/admin/shares/shares-manager";
import { listShares } from "@/server/queries/shares";
import { listAlbums } from "@/server/queries/albums";
import { listCandidateImages } from "@/server/queries/images";
import { currentTimeMillis } from "@/lib/utils";

export const metadata = { title: "分享管理" };

export default async function AdminSharesPage() {
  const [shares, albums, images] = await Promise.all([
    listShares(),
    listAlbums(),
    listCandidateImages(200),
  ]);

  return (
    <SharesManager
      shares={shares}
      albums={albums.map((a) => ({ id: a.id, name: a.name }))}
      images={images.map((i) => ({ id: i.id, name: i.title || i.original_name }))}
      now={currentTimeMillis()}
    />
  );
}
