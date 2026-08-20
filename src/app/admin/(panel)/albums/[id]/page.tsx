import { notFound } from "next/navigation";
import { getS3PublicBase, getSiteUrl } from "@/lib/env";
import { AlbumEditor } from "@/components/admin/albums/album-editor";
import { getAlbumDetail } from "@/server/queries/albums";
import { listCandidateImages } from "@/server/queries/images";

export const metadata = { title: "相册编辑" };

export default async function AdminAlbumEditPage({ params }: PageProps<"/admin/albums/[id]">) {
  const { id } = await params;
  const album = await getAlbumDetail(id);
  if (!album) notFound();
  const candidates = await listCandidateImages();

  return (
    <AlbumEditor
      album={album}
      candidates={candidates}
      siteUrl={getSiteUrl()}
      s3PublicBase={getS3PublicBase()}
    />
  );
}
