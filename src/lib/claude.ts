import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "./prompts/system-prompt";

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

export type PromptResult = {
  fullPrompt: string;
  frameDescription: string;
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

const METADATA_DELIMITER = "===FRAME_METADATA===";

function parsePromptResponse(text: string): PromptResult {
  const delimiterIndex = text.indexOf(METADATA_DELIMITER);

  if (delimiterIndex !== -1) {
    const fullPrompt = text.slice(0, delimiterIndex).trim();
    const metadataText = text.slice(delimiterIndex + METADATA_DELIMITER.length).trim();

    let frameDescription = "";
    try {
      const metadata = JSON.parse(metadataText);
      frameDescription = metadata.frameDescription || "";
    } catch {
      // Try to extract JSON object from the metadata section
      const jsonMatch = metadataText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const metadata = JSON.parse(jsonMatch[0]);
          frameDescription = metadata.frameDescription || "";
        } catch {
          // Fall through to extraction
        }
      }
    }

    // Fallback: extract from the prompt text itself
    if (!frameDescription) {
      frameDescription = extractFrameDescription(fullPrompt);
    }

    return { fullPrompt, frameDescription };
  }

  // No delimiter found — use entire text as prompt, extract frame description
  const fullPrompt = text.trim();
  const frameDescription = extractFrameDescription(fullPrompt);

  return { fullPrompt, frameDescription };
}

/**
 * Extracts a frame description from the structured prompt text
 * by finding the Environment and Character sections.
 */
function extractFrameDescription(promptText: string): string {
  const parts: string[] = [];

  // Extract Character line (first line after "Character" heading)
  const charMatch = promptText.match(/^Character\n+(.+)/m);
  if (charMatch) parts.push(charMatch[1].trim());

  // Extract Environment line (first line after "Environment" heading)
  const envMatch = promptText.match(/^Environment\n+(.+)/m);
  if (envMatch) parts.push(envMatch[1].trim());

  if (parts.length > 0) {
    return parts.join(". ") + ".";
  }

  // Last resort: use first 200 chars
  return promptText.slice(0, 200);
}
