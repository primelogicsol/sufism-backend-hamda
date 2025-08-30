import fs from "fs/promises";
import path from "path";
import { s3Put } from "../services/storage/s3.storage.js";

const CMS_CONTENT_BASE = process.env.CMS_CONTENT_BASE || path.resolve(process.cwd(), "content");
const ENV = process.env.CONTENT_ENV || "prod";
const PREFIX = process.env.S3_PREFIX || ENV;

async function walk(dir: string): Promise<string[]> {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    dirents.map((d) => {
      const res = path.resolve(dir, d.name);
      return d.isDirectory() ? walk(res) : Promise.resolve([res]);
    })
  );
  return files.flat();
}

async function main() {
  if (!process.env.S3_BUCKET || !process.env.S3_REGION) {
    console.error("S3 env vars missing. Set S3_BUCKET and S3_REGION.");
    process.exit(1);
  }
  const root = path.join(CMS_CONTENT_BASE, ENV);
  const allFiles = (await walk(root)).filter((f) => f.endsWith(".json"));
  for (const file of allFiles) {
    const rel = path.relative(root, file);
    const key = `${PREFIX}/${rel}`.replace(/\\/g, "/");
    const body = await fs.readFile(file, "utf-8");
    await s3Put(key, body);
    console.log("Uploaded:", key);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
