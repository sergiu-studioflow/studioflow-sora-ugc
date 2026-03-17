import { put } from "@vercel/blob";
import sharp from "sharp";

const KIE_API_BASE = "https://api.kie.ai/api/v1/jobs";

// Sora requires exact pixel dimensions for reference images
const soraResolutionMap: Record<string, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
  "720p": { width: 1280, height: 720 },
};

function getKieKey(): string {
  const key = process.env.KIE_API_KEY;
  if (!key) throw new Error("KIE_API_KEY is not set");
  return key;
}

// Maps aspect ratio to Kie AI supported aspect ratios
const kieAspectMap: Record<string, string> = {
  "9:16": "9:16",
  "16:9": "16:9",
  "720p": "16:9",
};

/**
 * Generates a composed first frame using Kie AI's Nano Banana Pro.
 * Takes the product image as visual reference and the scene description
 * to create a realistic first frame showing the character holding the product.
 * Returns the Vercel Blob URL of the generated frame.
 */
export async function generateFirstFrame(params: {
  productImageUrl: string;
  sceneDescription: string;
  aspectRatio: string;
  characterDetails: {
    ageRange?: string;
    gender?: string;
    profile?: string;
    makeup?: string;
    expression?: string;
    hair?: string;
    clothing?: string;
  };
  generationId: string;
}): Promise<string> {
  const framePrompt = buildFramePrompt(params);
  const aspectRatio = kieAspectMap[params.aspectRatio] || "9:16";

  // Step 1: Create the task
  const createResponse = await fetch(`${KIE_API_BASE}/createTask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getKieKey()}`,
    },
    body: JSON.stringify({
      model: "nano-banana-pro",
      input: {
        prompt: framePrompt,
        image_input: [params.productImageUrl],
        aspect_ratio: aspectRatio,
        resolution: "2K",
        output_format: "png",
      },
    }),
  });

  if (!createResponse.ok) {
    const err = await createResponse.json().catch(() => ({}));
    throw new Error(
      err?.msg || `Kie AI task creation failed: ${createResponse.status}`
    );
  }

  const createData = await createResponse.json();
  if (createData.code !== 200 || !createData.data?.taskId) {
    throw new Error(createData.msg || "Kie AI did not return a task ID");
  }

  const taskId = createData.data.taskId;
  console.log("[image-gen] Kie AI task created:", taskId);

  // Step 2: Poll for completion (max 90 seconds)
  const maxPolls = 30;
  const pollInterval = 3000;

  for (let i = 0; i < maxPolls; i++) {
    await new Promise((r) => setTimeout(r, pollInterval));

    const statusResponse = await fetch(
      `${KIE_API_BASE}/recordInfo?taskId=${encodeURIComponent(taskId)}`,
      {
        headers: {
          Authorization: `Bearer ${getKieKey()}`,
        },
      }
    );

    if (!statusResponse.ok) continue;

    const statusData = await statusResponse.json();
    const state = statusData.data?.state;

    if (state === "success") {
      // Parse resultJson to get the image URL
      let resultUrls: string[] = [];
      try {
        const resultJson = JSON.parse(statusData.data.resultJson);
        resultUrls = resultJson.resultUrls || [];
      } catch {
        throw new Error("Failed to parse Kie AI result JSON");
      }

      if (resultUrls.length === 0) {
        throw new Error("No image URLs in Kie AI result");
      }

      const sourceImageUrl = resultUrls[0];
      console.log("[image-gen] Kie AI image ready:", sourceImageUrl);

      // Download, resize to exact Sora dimensions, and persist to Vercel Blob
      const imageRes = await fetch(sourceImageUrl);
      if (!imageRes.ok) {
        throw new Error("Failed to download generated frame from Kie AI");
      }

      const rawBuffer = Buffer.from(await imageRes.arrayBuffer());
      const targetSize = soraResolutionMap[params.aspectRatio] || soraResolutionMap["9:16"];

      // Resize to exact Sora dimensions (720x1280 or 1280x720)
      const resizedBuffer = await sharp(rawBuffer)
        .resize(targetSize.width, targetSize.height, { fit: "cover" })
        .png()
        .toBuffer();

      console.log("[image-gen] Resized frame to", targetSize.width, "x", targetSize.height);

      const blob = await put(
        `frames/${params.generationId}.png`,
        resizedBuffer,
        { access: "public", contentType: "image/png" }
      );

      console.log("[image-gen] Frame persisted to Vercel Blob:", blob.url);
      return blob.url;
    }

    if (state === "fail") {
      throw new Error(
        statusData.data?.failMsg || "Kie AI image generation failed"
      );
    }

    // Still waiting/queuing/generating — continue polling
    console.log("[image-gen] Kie AI task state:", state);
  }

  throw new Error("Kie AI image generation timed out after 90 seconds");
}

function buildFramePrompt(params: {
  sceneDescription: string;
  characterDetails: {
    ageRange?: string;
    gender?: string;
    profile?: string;
    makeup?: string;
    expression?: string;
    hair?: string;
    clothing?: string;
  };
}): string {
  const c = params.characterDetails;
  const parts: string[] = [];

  parts.push(
    "Generate a photorealistic photograph that looks like it was taken on an iPhone front camera (selfie mode)."
  );
  parts.push(
    "The person in the photo is holding and showing the product from the reference image towards the camera."
  );

  // Character description
  const charParts: string[] = [];
  if (c.gender) charParts.push(c.gender);
  if (c.ageRange) charParts.push(`aged ${c.ageRange}`);
  if (c.profile) charParts.push(c.profile);
  if (charParts.length > 0) {
    parts.push(`Character: ${charParts.join(", ")}.`);
  }

  // Appearance
  if (c.hair) parts.push(`Hair: ${c.hair}.`);
  if (c.makeup) parts.push(`Makeup: ${c.makeup}.`);
  if (c.expression) parts.push(`Expression: ${c.expression}.`);
  if (c.clothing) parts.push(`Clothing: ${c.clothing}.`);

  // Extract environment cues from scene description
  const envSnippet = params.sceneDescription.slice(0, 300);
  parts.push(`Scene context: ${envSnippet}`);

  parts.push("CRITICAL RULES:");
  parts.push(
    "- The product must appear EXACTLY as shown in the reference image — same packaging, colors, branding, labels."
  );
  parts.push(
    "- The person is holding the product naturally in one hand, showing it to the camera."
  );
  parts.push(
    "- iPhone front camera perspective — slightly above eye level, arm's length distance."
  );
  parts.push(
    "- Natural skin texture with visible pores, no AI smoothing or beauty filters."
  );
  parts.push(
    "- Natural indoor or outdoor lighting, no studio lighting or professional color grading."
  );
  parts.push(
    "- The photo should look like a real person's selfie, not a stock photo or ad."
  );

  return parts.join("\n");
}
