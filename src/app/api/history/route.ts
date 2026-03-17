import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (isAuthError(authResult)) return authResult;

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    const conditions = [eq(schema.generations.userId, authResult.portalUser.id)];

    if (statusFilter && statusFilter !== "all") {
      conditions.push(eq(schema.generations.status, statusFilter));
    }

    const generations = await db
      .select({
        id: schema.generations.id,
        creativeDirection: schema.generations.creativeDirection,
        status: schema.generations.status,
        aspectRatio: schema.generations.aspectRatio,
        duration: schema.generations.duration,
        videoUrl: schema.generations.videoUrl,
        thumbnailUrl: schema.generations.thumbnailUrl,
        productImageUrl: schema.generations.productImageUrl,
        fullPrompt: schema.generations.fullPrompt,
        ageRange: schema.generations.ageRange,
        gender: schema.generations.gender,
        estimatedCost: schema.generations.estimatedCost,
        errorMessage: schema.generations.errorMessage,
        createdAt: schema.generations.createdAt,
      })
      .from(schema.generations)
      .where(and(...conditions))
      .orderBy(desc(schema.generations.createdAt))
      .limit(100);

    return NextResponse.json(generations);
  } catch (err) {
    console.error("[history]", err);
    return NextResponse.json([], { status: 500 });
  }
}
