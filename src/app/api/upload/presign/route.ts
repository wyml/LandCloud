import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { badRequest, guardUploadAccess, parseJsonBody } from "@/lib/api";
import {
  ACCEPTED_MIME,
  MAX_BATCH_SIZE,
  MAX_FILE_SIZE,
  PRESIGN_EXPIRES_SECONDS,
  imagePrefix,
  isAcceptedMime,
} from "@/lib/images/variants";
import { createPresignedPutUrl } from "@/lib/s3";

interface PresignFile {
  name: string;
  mime: string;
  size: number;
}

export async function POST(request: Request) {
  const access = await guardUploadAccess(request);
  if (!access.ok) return access.response;

  const body = await parseJsonBody<{ files?: PresignFile[] }>(request);
  const files = body?.files;
  if (!Array.isArray(files) || files.length === 0) {
    return badRequest("files 不能为空");
  }
  if (files.length > MAX_BATCH_SIZE) {
    return badRequest(`单次最多上传 ${MAX_BATCH_SIZE} 个文件`);
  }

  const results: Array<{ name: string; key: string; url: string }> = [];
  for (const file of files) {
    if (typeof file.name !== "string" || file.name.length === 0) {
      return badRequest("文件名无效");
    }
    if (!isAcceptedMime(file.mime)) {
      return badRequest(`不支持的文件类型: ${file.mime}`);
    }
    if (typeof file.size !== "number" || file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return badRequest(`文件大小无效（单文件上限 ${MAX_FILE_SIZE / 1024 / 1024}MB）`);
    }

    const imageId = crypto.randomUUID();
    const ext = ACCEPTED_MIME[file.mime];
    const key = `${imagePrefix(imageId)}/original.${ext}`;
    const url = await createPresignedPutUrl(key, file.mime, file.size, PRESIGN_EXPIRES_SECONDS);
    results.push({ name: file.name, key, url });
  }

  return NextResponse.json({ files: results });
}
