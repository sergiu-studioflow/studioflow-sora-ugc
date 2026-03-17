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
    parts.push(`## Consumer Archetype\n${input.archetypeName}\nUse this archetype to shape the character's personality, environment, wardrobe, speech patterns, and overall vibe. The archetype should drive the creative direction of the entire prompt.`);
  }

  // Sora Character mode: reference saved character by @name
  if (input.soraCharacterName) {
    parts.push(`## Character\nUsing saved Sora character: @${input.soraCharacterName}\nIMPORTANT: In the Character section of the prompt output, write "@${input.soraCharacterName}" as the character reference. Sora will use this saved character's appearance automatically. Do NOT invent physical appearance details — only describe personality, energy, and emotional tone.`);
  } else if (input.ageRange || input.gender || input.profile) {
    parts.push(`## Character`);
    if (input.ageRange) parts.push(`- Age range: ${input.ageRange}`);
    if (input.gender) parts.push(`- Gender: ${input.gender}`);
    if (input.profile) parts.push(`- Profile: ${input.profile}`);
  }

  if (input.makeup || input.expression || input.hair || input.clothing) {
    parts.push(`## Appearance`);
    if (input.makeup) parts.push(`- Makeup: ${input.makeup}`);
    if (input.expression) parts.push(`- Expression: ${input.expression}`);
    if (input.hair) parts.push(`- Hair: ${input.hair}`);
    if (input.clothing) parts.push(`- Clothing: ${input.clothing}`);
  }

  if (input.productDescription) {
    parts.push(`## Product\n${input.productDescription}`);
  }

  parts.push(`## Video Settings`);
  parts.push(`- Duration: ${input.duration} seconds`);
  parts.push(`- Aspect ratio: ${input.aspectRatio}`);
  parts.push(`- Style: authentic UGC phone video`);

  return parts.join("\n\n");
}
