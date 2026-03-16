import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "./prompts/system-prompt";

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

export type PromptResult = {
  sceneDescription: string;
  dialogue: string;
  complianceNotes: string;
  negativePrompt: string;
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
  productDescription?: string;
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

  return parsePromptResponse(text);
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
  productDescription?: string;
  duration: number;
  aspectRatio: string;
}): string {
  const parts: string[] = [];

  parts.push(`## Creative Direction\n${input.creativeDirection}`);

  if (input.ageRange || input.gender || input.profile) {
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

function parsePromptResponse(text: string): PromptResult {
  // Try direct JSON parse first
  try {
    const parsed = JSON.parse(text);
    return validatePromptResult(parsed);
  } catch {
    // Strip markdown wrapping if present
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim());
        return validatePromptResult(parsed);
      } catch {
        // Fall through
      }
    }

    // Try to find JSON object in text
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        const parsed = JSON.parse(objectMatch[0]);
        return validatePromptResult(parsed);
      } catch {
        // Fall through
      }
    }

    throw new Error("Failed to parse Claude response as JSON");
  }
}

function validatePromptResult(obj: Record<string, unknown>): PromptResult {
  return {
    sceneDescription: String(obj.sceneDescription || ""),
    dialogue: String(obj.dialogue || ""),
    complianceNotes: String(obj.complianceNotes || ""),
    negativePrompt: String(obj.negativePrompt || ""),
  };
}
