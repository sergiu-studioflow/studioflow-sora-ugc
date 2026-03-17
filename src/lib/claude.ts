import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "./prompts/system-prompt";

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

export type PromptResult = {
  fullPrompt: string;
};

export type StoryboardScene = {
  duration: number;
  type: string;
  direction: string;
};

export async function generateSoraPrompt(input: {
  creativeDirection: string;
  ageRange?: string;
  gender?: string;
  profile?: string;
  makeup?: string;
  expression?: string;
  hair?: string;
  clothing?: string;
  emotionalTone?: string;
  archetypeName?: string;
  soraCharacterName?: string;
  productName?: string;
  productDescription?: string;
  storyboardMode?: boolean;
  scenes?: StoryboardScene[];
  duration: number;
  aspectRatio: string;
}): Promise<PromptResult> {
  const userMessage = buildUserMessage(input);

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    temperature: 0.7,
    system: buildSystemPrompt(),
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  return { fullPrompt: text.trim() };
}

/**
 * Analyze a product image using Claude Vision to extract visual description.
 * Used when no saved product description is available.
 */
export async function analyzeProductImage(imageUrl: string): Promise<string> {
  const response = await getClient().messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "url", url: imageUrl },
          },
          {
            type: "text",
            text: "Describe this product's physical appearance for an AI video prompt. Be specific about: packaging material and color, lid/cap style and color, label text and design, overall shape and proportions, and size relative to a hand. Return ONLY the description, no commentary.",
          },
        ],
      },
    ],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  return text.trim();
}

function buildUserMessage(input: {
  creativeDirection: string;
  ageRange?: string;
  gender?: string;
  profile?: string;
  makeup?: string;
  expression?: string;
  hair?: string;
  clothing?: string;
  emotionalTone?: string;
  archetypeName?: string;
  soraCharacterName?: string;
  productName?: string;
  productDescription?: string;
  storyboardMode?: boolean;
  scenes?: StoryboardScene[];
  duration: number;
  aspectRatio: string;
}): string {
  const parts: string[] = [];

  // Storyboard mode: structured scene breakdown replaces single creative direction
  if (input.storyboardMode && input.scenes && input.scenes.length > 0) {
    parts.push(`## Storyboard (User-Defined Scene Breakdown)\nThe user has defined the exact scene structure. Follow this breakdown precisely — use the exact durations, types, and creative direction for each scene. Do NOT add, remove, or reorder scenes.`);

    let cumulativeTime = 0;
    input.scenes.forEach((scene, i) => {
      const startTime = cumulativeTime;
      const endTime = cumulativeTime + scene.duration;
      const typeLabel = scene.type.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      parts.push(`### Scene ${i + 1} (${startTime}–${endTime}s) — ${typeLabel}\n${scene.direction}`);
      cumulativeTime = endTime;
    });
  } else {
    parts.push(`## Creative Direction\n${input.creativeDirection}`);
  }

  if (input.emotionalTone) {
    parts.push(`## Emotional Tone\n${input.emotionalTone}`);
  }

  if (input.archetypeName) {
    parts.push(`## Consumer Archetype\n${input.archetypeName}\nUse this archetype to shape the character's personality, environment, wardrobe, speech patterns, and overall vibe.`);
  }

  // Sora Character mode: reference saved character by @name
  if (input.soraCharacterName) {
    parts.push(`## Character\nUsing saved Sora character: @${input.soraCharacterName}\nIn the Character section, reference this character as @${input.soraCharacterName}. Sora handles the appearance. Only describe personality, energy, and emotional tone.`);
  } else if (input.ageRange || input.gender || input.profile) {
    parts.push(`## Character`);
    if (input.ageRange) parts.push(`- Age range: ${input.ageRange}`);
    if (input.gender) parts.push(`- Gender: ${input.gender}`);
    if (input.profile) parts.push(`- Profile: ${input.profile}`);
  }

  if (!input.soraCharacterName && (input.makeup || input.expression || input.hair || input.clothing)) {
    parts.push(`## Appearance`);
    if (input.makeup) parts.push(`- Makeup: ${input.makeup}`);
    if (input.expression) parts.push(`- Expression: ${input.expression}`);
    if (input.hair) parts.push(`- Hair: ${input.hair}`);
    if (input.clothing) parts.push(`- Clothing: ${input.clothing}`);
  }

  // Product info
  if (input.productName || input.productDescription) {
    const productParts: string[] = [];
    if (input.productName) productParts.push(`Product name: ${input.productName}`);
    if (input.productDescription) productParts.push(`Visual description: ${input.productDescription}`);
    parts.push(`## Product\n${productParts.join("\n")}`);
  }

  parts.push(`## Video Settings`);
  parts.push(`- Duration: ${input.duration} seconds`);
  parts.push(`- Aspect ratio: ${input.aspectRatio}`);
  parts.push(`- Style: authentic UGC phone video`);

  return parts.join("\n\n");
}
