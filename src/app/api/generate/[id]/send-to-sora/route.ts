import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { submitSoraJob } from "@/lib/sora";
import { resizeForSora } from "@/lib/resize-image";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (isAuthError(authResult)) return authResult;

    const { id } = await params;
    const body = await req.json();

    // Get existing generation
    const [generation] = await db
      .select()
      .from(schema.generations)
      .where(and(eq(schema.generations.id, id), eq(schema.generations.userId, authResult.portalUser.id)))
      .limit(1);

    if (!generation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (generation.status !== "prompt_ready") {
      return NextResponse.json({ error: "Generation is not ready for Sora" }, { status: 400 });
    }

    // Use the (possibly edited) fullPrompt directly
    const fullPrompt = body.fullPrompt || generation.fullPrompt;

    // Update status to creating_video
    await db
      .update(schema.generations)
      .set({
        fullPrompt,
        status: "creating_video",
        updatedAt: new Date(),
      })
      .where(eq(schema.generations.id, id));

    // Submit to Sora
    try {
      // Resize product image to exact Sora dimensions before submitting
      let referenceImageUrl: string | undefined;
      if (generation.productImageUrl) {
        try {
          referenceImageUrl = await resizeForSora(
            generation.productImageUrl,
            generation.aspectRatio,
            id
          );
          console.log("[send-to-sora] Resized reference image:", referenceImageUrl);
        } catch (resizeErr) {
          console.error("[send-to-sora] Resize failed, sending without reference:", resizeErr);
        }
      }

      const { jobId } = await submitSoraJob({
        prompt: fullPrompt,
        duration: generation.duration,
        aspectRatio: generation.aspectRatio,
        referenceImageUrl,
      });

      await db
        .update(schema.generations)
        .set({ soraJobId: jobId, updatedAt: new Date() })
        .where(eq(schema.generations.id, id));

      // Client-side polling via GET /api/generate/[id] handles status updates
      return NextResponse.json({ ok: true, jobId });
    } catch (soraErr) {
      await db
        .update(schema.generations)
        .set({
          status: "error",
          errorMessage: soraErr instanceof Error ? soraErr.message : "Failed to submit to Sora",
          updatedAt: new Date(),
        })
        .where(eq(schema.generations.id, id));

      return NextResponse.json(
        { error: soraErr instanceof Error ? soraErr.message : "Sora submission failed" },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("[send-to-sora]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
