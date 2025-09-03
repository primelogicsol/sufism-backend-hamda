import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
  type GetObjectCommandOutput,
  type ListObjectsV2CommandOutput
} from "@aws-sdk/client-s3";
import type { Readable } from "stream";

const s3 = new S3Client({ region: process.env.S3_REGION });
const BUCKET = process.env.S3_BUCKET!;

async function streamToString(stream: Readable): Promise<string> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf-8");
}

export async function s3Get(key: string): Promise<string> {
  const res: GetObjectCommandOutput = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));

  if (!res.Body) {
    throw new Error(`No body found for key: ${key}`);
  }

  const body = res.Body as Readable;
  return await streamToString(body);
}

export async function s3Put(key: string, body: string, contentType = "application/json"): Promise<void> {
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }));
}

export async function s3List(prefix: string): Promise<Array<{ Key?: string; Size?: number; LastModified?: Date; ETag?: string }>> {
  const res: ListObjectsV2CommandOutput = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix }));
  return res.Contents || [];
}
