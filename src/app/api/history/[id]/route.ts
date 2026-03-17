import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (isAuthError(authResult)) return authResult;

    const { id } = await params;

    await db
      .delete(schema.generations)
      .where(and(
        eq(schema.generations.id, id),
        eq(schema.generations.userId, authResult.portalUser.id)
      ));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[history/id]", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
