import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { pollSoraJob } from "@/lib/sora";
import { put } from "@vercel/blob";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // 2 minutes for video download + blob upload

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (isAuthError(authResult)) return authResult;

    const { id } = await params;

    const [generation] = await db
      .select()
      .from(schema.generations)
      .where(and(eq(schema.generations.id, id), eq(schema.generations.userId, authResult.portalUser.id)))
      .limit(1);

    if (!generation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // If video is being created, poll Sora directly and update DB
    if (generation.status === "creating_video" && generation.soraJobId) {
      const result = await pollSoraJob(generation.soraJobId);

      if (result.status === "completed" && result.videoUrl) {
        // Download video from OpenAI and persist to Vercel Blob
        let finalVideoUrl = result.videoUrl;
        try {
          const videoRes = await fetch(result.videoUrl, {
            headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
          });
          if (videoRes.ok && videoRes.body) {
            const blob = await put(`videos/${id}.mp4`, videoRes.body, {
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
          .set({ status: "video_ready", videoUrl: finalVideoUrl, updatedAt: new Date() })
          .where(eq(schema.generations.id, id));

        return NextResponse.json({
          id: generation.id,
          status: "video_ready",
          videoUrl: finalVideoUrl,
          estimatedCost: generation.estimatedCost,
          createdAt: generation.createdAt,
        });
      }

      if (result.status === "failed") {
        const errorMsg = result.error || "Video generation failed";
        await db
          .update(schema.generations)
          .set({ status: "error", errorMessage: errorMsg, updatedAt: new Date() })
          .where(eq(schema.generations.id, id));

        return NextResponse.json({
          id: generation.id,
          status: "error",
          errorMessage: errorMsg,
          createdAt: generation.createdAt,
        });
      }

      // Still in progress — return current progress
      return NextResponse.json({
        id: generation.id,
        status: generation.status,
        progress: result.progress || 0,
        estimatedCost: generation.estimatedCost,
        createdAt: generation.createdAt,
      });
    }

    return NextResponse.json({
      id: generation.id,
      status: generation.status,
      sceneDescription: generation.sceneDescription,
      dialogue: generation.dialogue,
      complianceNotes: generation.complianceNotes,
      negativePrompt: generation.negativePrompt,
      fullPrompt: generation.fullPrompt,
      videoUrl: generation.videoUrl,
      estimatedCost: generation.estimatedCost,
      errorMessage: generation.errorMessage,
      createdAt: generation.createdAt,
    });
  } catch (err) {
    console.error("[generate/id]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
