import { put } from "@vercel/blob";
import sharp from "sharp";

const sizeMap: Record<string, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
  "720p": { width: 1280, height: 720 },
};

/**
 * Downloads an image, resizes it to match the exact Sora dimensions
 * for the given aspect ratio, and uploads the resized version to Vercel Blob.
 * Returns the URL of the resized image.
 */
export async function resizeForSora(
  imageUrl: string,
  aspectRatio: string,
  generationId: string
): Promise<string> {
  const target = sizeMap[aspectRatio] || sizeMap["9:16"];

  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error("Failed to download product image for resize");

  const rawBuffer = Buffer.from(await res.arrayBuffer());

  const resizedBuffer = await sharp(rawBuffer)
    .resize(target.width, target.height, { fit: "cover" })
    .png()
    .toBuffer();

  const blob = await put(
    `resized/${generationId}.png`,
    resizedBuffer,
    { access: "public", contentType: "image/png" }
  );

  return blob.url;
}
