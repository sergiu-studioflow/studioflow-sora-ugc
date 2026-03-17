import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { generateSoraPrompt } from "@/lib/claude";
import { generateFirstFrame } from "@/lib/image-gen";
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

    console.log("[generate] productImageUrl received:", productImageUrl || "(empty)");

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

    // Call Claude to generate structured prompt
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

    const cost = estimateCost(duration);

    // Generate composed first frame if product image was uploaded
    let referenceFrameUrl: string | null = null;
    let frameError: string | null = null;
    if (productImageUrl) {
      console.log("[generate] Starting Gemini first frame generation for:", generation.id);
      try {
        referenceFrameUrl = await generateFirstFrame({
          productImageUrl,
          sceneDescription: promptResult.frameDescription,
          aspectRatio,
          characterDetails: {
            ageRange,
            gender,
            profile,
            makeup,
            expression,
            hair,
            clothing,
          },
          generationId: generation.id,
        });
        console.log("[generate] First frame generated:", referenceFrameUrl);
      } catch (frameErr) {
        frameError = frameErr instanceof Error ? frameErr.message : "Unknown frame generation error";
        console.error("[generate] First frame generation failed:", frameError);
        // Non-fatal — continue without the composed frame
      }
    } else {
      console.log("[generate] No productImageUrl provided, skipping frame generation");
    }

    // Update generation with Claude output + frame
    const [updated] = await db
      .update(schema.generations)
      .set({
        sceneDescription: promptResult.frameDescription,
        dialogue: "",
        complianceNotes: "",
        negativePrompt: "",
        fullPrompt: promptResult.fullPrompt,
        estimatedCost: cost,
        thumbnailUrl: referenceFrameUrl,
        status: "prompt_ready",
        updatedAt: new Date(),
      })
      .where(eq(schema.generations.id, generation.id))
      .returning();

    return NextResponse.json({
      id: updated.id,
      fullPrompt: updated.fullPrompt,
      estimatedCost: updated.estimatedCost,
      referenceFrameUrl: updated.thumbnailUrl,
      frameError,
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
