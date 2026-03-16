import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { generateSoraPrompt } from "@/lib/claude";
import { estimateCost } from "@/lib/sora";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (isAuthError(authResult)) return authResult;

    const body = await req.json();
    const {
      creativeDirection,
      ageRange,
      gender,
      profile,
      makeup,
      expression,
      hair,
      clothing,
      productImageUrl,
      aspectRatio = "9:16",
      duration = 8,
      archetypeId,
    } = body;

    if (!creativeDirection?.trim()) {
      return NextResponse.json({ error: "Creative direction is required" }, { status: 400 });
    }

    // Create generation record
    const [generation] = await db
      .insert(schema.generations)
      .values({
        userId: authResult.portalUser.id,
        creativeDirection,
        ageRange,
        gender,
        characterDescription: profile,
        makeup,
        expression,
        hair,
        clothing,
        productImageUrl,
        aspectRatio,
        duration,
        archetypeId: archetypeId || null,
        status: "generating_prompt",
      })
      .returning();

    // Call Claude to generate prompt
    const promptResult = await generateSoraPrompt({
      creativeDirection,
      ageRange,
      gender,
      profile,
      makeup,
      expression,
      hair,
      clothing,
      duration,
      aspectRatio,
    });

    // Assemble full prompt for Sora
    const fullPrompt = [
      promptResult.sceneDescription,
      `\n\nDialogue (voiceover):\n${promptResult.dialogue}`,
      `\n\nVisual constraints:\n${promptResult.negativePrompt}`,
    ].join("");

    const cost = estimateCost(duration);

    // Update generation with Claude output
    const [updated] = await db
      .update(schema.generations)
      .set({
        sceneDescription: promptResult.sceneDescription,
        dialogue: promptResult.dialogue,
        complianceNotes: promptResult.complianceNotes,
        negativePrompt: promptResult.negativePrompt,
        fullPrompt,
        estimatedCost: cost,
        status: "prompt_ready",
        updatedAt: new Date(),
      })
      .where(eq(schema.generations.id, generation.id))
      .returning();

    return NextResponse.json({
      id: updated.id,
      sceneDescription: updated.sceneDescription,
      dialogue: updated.dialogue,
      complianceNotes: updated.complianceNotes,
      negativePrompt: updated.negativePrompt,
      fullPrompt: updated.fullPrompt,
      estimatedCost: updated.estimatedCost,
      status: updated.status,
    });
  } catch (err) {
    console.error("[generate]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
