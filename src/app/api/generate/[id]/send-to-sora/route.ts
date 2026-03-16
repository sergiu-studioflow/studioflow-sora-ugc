import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { submitSoraJob, pollSoraJob } from "@/lib/sora";
import { put } from "@vercel/blob";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for Vercel

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

    // Build updated prompt from possibly-edited fields
    const sceneDescription = body.sceneDescription || generation.sceneDescription;
    const dialogue = body.dialogue || generation.dialogue;
    const negativePrompt = body.negativePrompt || generation.negativePrompt;

    const fullPrompt = [
      sceneDescription,
      `\n\nDialogue (voiceover):\n${dialogue}`,
      `\n\nVisual constraints:\n${negativePrompt}`,
    ].join("");

    // Update status to creating_video
    await db
      .update(schema.generations)
      .set({
        sceneDescription,
        dialogue,
        complianceNotes: body.complianceNotes || generation.complianceNotes,
        negativePrompt,
        fullPrompt,
        status: "creating_video",
        updatedAt: new Date(),
      })
      .where(eq(schema.generations.id, id));

    // Submit to Sora
    try {
      const { jobId } = await submitSoraJob({
        prompt: fullPrompt,
        duration: generation.duration,
        aspectRatio: generation.aspectRatio,
        referenceImageUrl: generation.productImageUrl || undefined,
      });

      await db
        .update(schema.generations)
        .set({ soraJobId: jobId, updatedAt: new Date() })
        .where(eq(schema.generations.id, id));

      // Start background polling
      pollInBackground(id, jobId);

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

async function pollInBackground(generationId: string, jobId: string) {
  const MAX_POLLS = 120; // 10 minutes at 5s intervals

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, 5000));

    try {
      const result = await pollSoraJob(jobId);

      if (result.status === "completed" && result.videoUrl) {
        // Download video from OpenAI and persist to Vercel Blob
        let finalVideoUrl = result.videoUrl;
        try {
          const videoRes = await fetch(result.videoUrl, {
            headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
          });
          if (videoRes.ok && videoRes.body) {
            const blob = await put(`videos/${generationId}.mp4`, videoRes.body, {
              access: "public",
              contentType: "video/mp4",
            });
            finalVideoUrl = blob.url;
          }
        } catch {
          // Fall back to direct URL if blob upload fails
        }

        await db
          .update(schema.generations)
          .set({
            status: "video_ready",
            videoUrl: finalVideoUrl,
            updatedAt: new Date(),
          })
          .where(eq(schema.generations.id, generationId));
        return;
      }

      if (result.status === "failed") {
        await db
          .update(schema.generations)
          .set({
            status: "error",
            errorMessage: result.error || "Video generation failed",
            updatedAt: new Date(),
          })
          .where(eq(schema.generations.id, generationId));
        return;
      }
    } catch {
      // Continue polling on transient errors
    }
  }

  // Timeout
  await db
    .update(schema.generations)
    .set({
      status: "error",
      errorMessage: "Generation timed out after 10 minutes",
      updatedAt: new Date(),
    })
    .where(eq(schema.generations.id, generationId));
}
