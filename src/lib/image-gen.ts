import { put } from "@vercel/blob";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

function getGeminiKey(): string {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("GOOGLE_API_KEY is not set");
  return key;
}

// Maps aspect ratio to Gemini-supported aspect ratios
const geminiAspectMap: Record<string, string> = {
  "9:16": "9:16",
  "16:9": "16:9",
  "720p": "16:9",
};

/**
 * Generates a composed first frame using Gemini Nano Banana 2 Pro
 * (gemini-3.1-flash-image-preview).
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
  const aspectRatio = geminiAspectMap[params.aspectRatio] || "9:16";

  // Download the product image and convert to base64
  const productRes = await fetch(params.productImageUrl);
  if (!productRes.ok) {
    throw new Error("Failed to download product image for frame generation");
  }
  const productBuffer = Buffer.from(await productRes.arrayBuffer());
  const productBase64 = productBuffer.toString("base64");
  const mimeType = productRes.headers.get("content-type") || "image/png";

  // Call Gemini Nano Banana 2 (gemini-3.1-flash-image-preview)
  const model = "gemini-3.1-flash-image-preview";
  const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${getGeminiKey()}`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: framePrompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: productBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["IMAGE"],
      imageConfig: {
        aspectRatio,
        imageSize: "1K",
      },
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const errMsg =
      err?.error?.message ||
      `Gemini image generation error: ${response.status}`;
    throw new Error(errMsg);
  }

  const data = await response.json();

  // Extract inline image data from response
  const candidate = data.candidates?.[0];
  if (!candidate) {
    throw new Error("No candidates returned from Gemini image generation");
  }

  let imageBase64: string | null = null;
  let imageMime = "image/png";

  for (const part of candidate.content?.parts || []) {
    if (part.inline_data?.data) {
      imageBase64 = part.inline_data.data;
      imageMime = part.inline_data.mime_type || "image/png";
      break;
    }
  }

  if (!imageBase64) {
    throw new Error("No image data in Gemini response");
  }

  const imageBuffer = Buffer.from(imageBase64, "base64");
  const ext = imageMime.includes("jpeg") ? "jpg" : "png";

  // Upload to Vercel Blob
  const blob = await put(
    `frames/${params.generationId}.${ext}`,
    imageBuffer,
    { access: "public", contentType: imageMime }
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
