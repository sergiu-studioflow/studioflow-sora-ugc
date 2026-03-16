import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authResult = await requireAuth();
    if (isAuthError(authResult)) return authResult;

    const generations = await db
      .select({
        id: schema.generations.id,
        creativeDirection: schema.generations.creativeDirection,
        status: schema.generations.status,
        aspectRatio: schema.generations.aspectRatio,
        duration: schema.generations.duration,
        videoUrl: schema.generations.videoUrl,
        thumbnailUrl: schema.generations.thumbnailUrl,
        estimatedCost: schema.generations.estimatedCost,
        createdAt: schema.generations.createdAt,
      })
      .from(schema.generations)
      .where(eq(schema.generations.userId, authResult.portalUser.id))
      .orderBy(desc(schema.generations.createdAt))
      .limit(50);

    return NextResponse.json(generations);
  } catch (err) {
    console.error("[history]", err);
    return NextResponse.json([], { status: 500 });
  }
}
