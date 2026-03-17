import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { generateSoraPrompt } from "@/lib/claude";
import { estimateCost } from "@/lib/sora";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // 2 minutes for Claude prompt generation

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
      emotionalTone,
      productImageUrl,
      aspectRatio = "9:16",
      duration = 8,
      archetypeId,
      storyboardMode = false,
      scenes,
    } = body;

    if (!storyboardMode && !creativeDirection?.trim()) {
      return NextResponse.json({ error: "Creative direction is required" }, { status: 400 });
    }

    if (storyboardMode && (!scenes || scenes.length === 0)) {
      return NextResponse.json({ error: "At least one scene is required in storyboard mode" }, { status: 400 });
    }

    // Create generation record
    const [generation] = await db
      .insert(schema.generations)
      .values({
        userId: authResult.portalUser.id,
        creativeDirection: storyboardMode ? `[Storyboard: ${scenes.length} scenes]` : creativeDirection,
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

    // Look up archetype name if selected
    let archetypeName: string | undefined;
    if (archetypeId) {
      const [arch] = await db
        .select({ name: schema.archetypes.name })
        .from(schema.archetypes)
        .where(eq(schema.archetypes.id, archetypeId))
        .limit(1);
      if (arch) archetypeName = arch.name;
    }

    // Call Claude to generate structured prompt
    const promptResult = await generateSoraPrompt({
      creativeDirection: creativeDirection || "",
      ageRange,
      gender,
      profile,
      makeup,
      expression,
      hair,
      clothing,
      emotionalTone,
      archetypeName,
      storyboardMode,
      scenes,
      duration,
      aspectRatio,
    });

    const cost = estimateCost(duration);

    // Update generation with Claude output
    const [updated] = await db
      .update(schema.generations)
      .set({
        fullPrompt: promptResult.fullPrompt,
        estimatedCost: cost,
        status: "prompt_ready",
        updatedAt: new Date(),
      })
      .where(eq(schema.generations.id, generation.id))
      .returning();

    return NextResponse.json({
      id: updated.id,
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
