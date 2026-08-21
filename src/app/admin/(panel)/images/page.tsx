import { getS3PublicBase, getSiteUrl } from "@/lib/env";
import type { TagWithCount } from "@/lib/types";
import { getAlbumOptions, getTagsWithCount, listImages } from "@/server/queries/images";
import { getExternalLinkSettings, getSiteSettings } from "@/server/queries/settings";
import { ImagesBrowser } from "@/components/admin/images/images-browser";

export const metadata = { title: "图片管理" };

const PAGE_SIZE = 24;

export default async function AdminImagesPage({ searchParams }: PageProps<"/admin/images">) {
  const sp = await searchParams;

  const page = Math.max(1, Number(sp.page) || 1);
  const sort = sp.sort === "taken_at" || sp.sort === "view_count" ? sp.sort : "created_at";
  const dir = sp.dir === "asc" ? "asc" : "desc";

  const { images, total } = await listImages({
    page,
    pageSize: PAGE_SIZE,
    albumId: typeof sp.album === "string" ? sp.album : undefined,
    tagId: typeof sp.tag === "string" ? sp.tag : undefined,
    visibility: typeof sp.visibility === "string" ? sp.visibility : undefined,
    status: typeof sp.status === "string" ? sp.status : undefined,
    q: typeof sp.q === "string" ? sp.q : undefined,
    sort,
    dir,
  });

  const [albums, tags, externalLink, siteSettings] = await Promise.all([
    getAlbumOptions(),
    getTagsWithCount(),
    getExternalLinkSettings(),
    getSiteSettings(),
  ]);

  return (
    <ImagesBrowser
      images={images}
      total={total}
      page={page}
      filters={{
        albumId: typeof sp.album === "string" ? sp.album : null,
        tagId: typeof sp.tag === "string" ? sp.tag : null,
        visibility: typeof sp.visibility === "string" ? sp.visibility : null,
        status: typeof sp.status === "string" ? sp.status : null,
        q: typeof sp.q === "string" ? sp.q : null,
        sort,
        dir,
      }}
      albums={albums}
      tags={tags as TagWithCount[]}
      siteUrl={getSiteUrl()}
      s3PublicBase={externalLink.directBase || getS3PublicBase()}
      preferDirect={externalLink.defaultType === "direct"}
      defaultPublic={siteSettings.defaultPublic}
    />
  );
}
