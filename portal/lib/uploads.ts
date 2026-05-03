import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per file
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
]);

export async function saveFeedbackAttachment(
  feedbackId: string,
  orgId: string,
  file: File,
): Promise<{ storagePath: string; filename: string; mimeType: string; sizeBytes: number }> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`File "${file.name}" exceeds 10 MB limit`);
  }
  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.has(mimeType)) {
    throw new Error(`File type "${mimeType}" is not allowed`);
  }

  const dir = path.join(UPLOAD_DIR, "feedback", orgId, feedbackId);
  await fs.mkdir(dir, { recursive: true });

  const ext = path.extname(file.name).toLowerCase() || "";
  const slug = crypto.randomBytes(8).toString("hex");
  const storageName = `${slug}${ext}`;
  const storagePath = path.join(dir, storageName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(storagePath, buffer);

  return { storagePath, filename: file.name, mimeType, sizeBytes: file.size };
}

export async function readAttachment(
  storagePath: string,
): Promise<Buffer> {
  return fs.readFile(storagePath);
}

export async function deleteAttachment(storagePath: string): Promise<void> {
  await fs.unlink(storagePath).catch(() => {});
}
