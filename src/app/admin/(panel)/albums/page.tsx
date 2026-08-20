import { getS3PublicBase, getSiteUrl } from "@/lib/env";
import { AlbumsManager } from "@/components/admin/albums/albums-manager";
import { listAlbums } from "@/server/queries/albums";

export const metadata = { title: "相册管理" };

export default async function AdminAlbumsPage() {
  const albums = await listAlbums();
  return <AlbumsManager albums={albums} siteUrl={getSiteUrl()} s3PublicBase={getS3PublicBase()} />;
}
