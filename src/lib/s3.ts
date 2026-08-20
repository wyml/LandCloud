import "server-only";

import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3Config } from "@/lib/env";

let cachedClient: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!cachedClient) {
    const config = getS3Config();
    cachedClient = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  return cachedClient;
}

export function getS3Bucket(): string {
  return getS3Config().bucket;
}

export async function createPresignedPutUrl(
  key: string,
  contentType: string,
  maxSizeBytes: number,
  expiresIn = 600,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getS3Bucket(),
    Key: key,
    ContentType: contentType,
    ContentLength: maxSizeBytes,
  });
  return getSignedUrl(getS3Client(), command, { expiresIn });
}

export async function objectExists(
  key: string,
): Promise<{ size: number; contentType?: string } | null> {
  try {
    const result = await getS3Client().send(
      new HeadObjectCommand({ Bucket: getS3Bucket(), Key: key }),
    );
    return {
      size: result.ContentLength ?? 0,
      contentType: result.ContentType,
    };
  } catch (error) {
    if ((error as { name?: string })?.name === "NotFound") return null;
    throw error;
  }
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const result = await getS3Client().send(
    new GetObjectCommand({ Bucket: getS3Bucket(), Key: key }),
  );
  if (!result.Body) throw new Error(`Empty object: ${key}`);
  const bytes = await result.Body.transformToByteArray();
  return Buffer.from(bytes);
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
  cacheControl?: string,
): Promise<void> {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: getS3Bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl ?? "public, max-age=31536000, immutable",
    }),
  );
}

export async function deleteObjectByPrefix(prefix: string): Promise<void> {
  const client = getS3Client();
  const bucket = getS3Bucket();
  let continuationToken: string | undefined;

  do {
    const listed = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    const objects = (listed.Contents ?? []).map((o) => ({ Key: o.Key }));
    if (objects.length > 0) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: objects },
        }),
      );
    }
    continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
  } while (continuationToken);
}

export async function deleteObject(key: string): Promise<void> {
  await deleteObjectByPrefix(key);
}
