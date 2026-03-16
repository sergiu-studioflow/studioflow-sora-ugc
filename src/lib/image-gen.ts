import { put } from "@vercel/blob";

const OPENAI_API_BASE = "https://api.openai.com/v1";

function getApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  return key;
}

// Maps aspect ratio to the closest gpt-image-1 supported size
const imageSizeMap: Record<string, string> = {
  "9:16": "1024x1536",
  "16:9": "1536x1024",
  "720p": "1536x1024",
};

/**
 * Generates a composed first frame using gpt-image-1.
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
  // Build the image generation prompt
  const framePrompt = buildFramePrompt(params);
  const size = imageSizeMap[params.aspectRatio] || "1024x1536";

  // Download the product image to send as reference
  const productRes = await fetch(params.productImageUrl);
  if (!productRes.ok) {
    throw new Error("Failed to download product image for frame generation");
  }
  const productBlob = await productRes.blob();

  // Call gpt-image-1 with the product image as reference
  const formData = new FormData();
  formData.append("model", "gpt-image-1");
  formData.append("prompt", framePrompt);
  formData.append("size", size);
  formData.append("quality", "high");
  formData.append("image[]", productBlob, "product.png");

  const response = await fetch(`${OPENAI_API_BASE}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      err?.error?.message || `Image generation error: ${response.status}`
    );
  }

  const data = await response.json();

  // gpt-image-1 returns base64 data
  const imageData = data.data?.[0];
  if (!imageData) {
    throw new Error("No image returned from generation");
  }

  // Handle both base64 and URL responses
  let imageBuffer: Buffer;
  if (imageData.b64_json) {
    imageBuffer = Buffer.from(imageData.b64_json, "base64");
  } else if (imageData.url) {
    const imgRes = await fetch(imageData.url);
    imageBuffer = Buffer.from(await imgRes.arrayBuffer());
  } else {
    throw new Error("Unexpected image response format");
  }

  // Upload to Vercel Blob
  const blob = await put(
    `frames/${params.generationId}.png`,
    imageBuffer,
    { access: "public", contentType: "image/png" }
  );

  return blob.url;
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

  parts.push("Generate a photorealistic photograph that looks like it was taken on an iPhone front camera (selfie mode).");
  parts.push("The person in the photo is holding and showing the product from the reference image towards the camera.");

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

  // Extract environment cues from scene description (first 200 chars for context)
  const envSnippet = params.sceneDescription.slice(0, 300);
  parts.push(`Scene context: ${envSnippet}`);

  parts.push("CRITICAL RULES:");
  parts.push("- The product must appear EXACTLY as shown in the reference image — same packaging, colors, branding, labels.");
  parts.push("- The person is holding the product naturally in one hand, showing it to the camera.");
  parts.push("- iPhone front camera perspective — slightly above eye level, arm's length distance.");
  parts.push("- Natural skin texture with visible pores, no AI smoothing or beauty filters.");
  parts.push("- Natural indoor or outdoor lighting, no studio lighting or professional color grading.");
  parts.push("- The photo should look like a real person's selfie, not a stock photo or ad.");

  return parts.join("\n");
}
