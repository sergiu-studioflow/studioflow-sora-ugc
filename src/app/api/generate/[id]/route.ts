import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

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
      .where(eq(schema.generations.id, id))
      .limit(1);

    if (!generation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
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
