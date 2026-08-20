import type { Metadata } from "next";
import { MobileUploadPanel } from "@/components/site/mobile-upload-panel";
import { readUploadTokenExpiry, verifyUploadToken } from "@/lib/security";

export const metadata: Metadata = { title: "手机上传" };

export default async function UploadPage({ searchParams }: PageProps<"/upload">) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  if (!verifyUploadToken(token)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 px-4 text-center">
        <h1 className="text-xl font-semibold">链接无效或已过期</h1>
        <p className="text-sm opacity-60">请在电脑端后台重新生成手机上传二维码。</p>
      </div>
    );
  }
  return <MobileUploadPanel token={token} expiresAt={readUploadTokenExpiry(token)} />;
}
