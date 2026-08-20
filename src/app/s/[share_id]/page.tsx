/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { Gallery } from "@/components/site/gallery";
import { SharePasswordForm } from "@/components/site/share-password-form";
import { hasShareGrant } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { getShareForView, getSharedAlbumContent } from "@/server/queries/shares";

export const metadata: Metadata = { title: "分享" };

export default async function SharePage({ params }: PageProps<"/s/[share_id]">) {
  const { share_id } = await params;
  const share = await getShareForView(share_id);
  if (!share) notFound();

  const cookieStore = await cookies();
  const granted = hasShareGrant(cookieStore.get("share_access")?.value, share_id);

  if (!granted) {
    return (
      <div className="py-12">
        <SharePasswordForm shareId={share_id} requiresPassword={share.has_password} />
      </div>
    );
  }

  const admin = createAdminClient();
  await admin
    .from("shares")
    .update({ view_count: (share.view_count ?? 0) + 1 })
    .eq("id", share_id);

  if (share.target_type === "album") {
    const content = await getSharedAlbumContent(share.target_id);
    if (!content) notFound();
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">{content.albumName}</h1>
        <p className="text-xs opacity-50">{content.images.length} 张图片</p>
        <Gallery
          albumId={share.target_id}
          initialImages={content.images.slice(0, 30)}
          shareId={share_id}
        />
      </div>
    );
  }

  const { data: image } = await admin
    .from("images")
    .select("id, title, original_name, mime, width, height, s3_key")
    .eq("id", share.target_id)
    .maybeSingle();
  if (!image) notFound();

  return (
    <div className="flex flex-col items-center gap-4">
      <h1 className="text-xl font-semibold">{image.title || image.original_name}</h1>
      <img
        src={`/f/${image.id}/display`}
        alt={image.title || image.original_name}
        className="max-h-[80vh] w-full object-contain"
      />
      <a
        href={`/f/${image.id}/original`}
        target="_blank"
        rel="noreferrer"
        className="text-sm opacity-70 hover:underline"
      >
        查看原图
      </a>
    </div>
  );
}
