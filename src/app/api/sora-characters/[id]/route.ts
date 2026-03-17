import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (isAuthError(authResult)) return authResult;

    const { id } = await params;
    const body = await req.json();

    const [updated] = await db
      .update(schema.soraCharacters)
      .set({ ...body, updatedAt: new Date() })
      .where(and(
        eq(schema.soraCharacters.id, id),
        eq(schema.soraCharacters.userId, authResult.portalUser.id)
      ))
      .returning();

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[sora-characters/id]", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (isAuthError(authResult)) return authResult;

    const { id } = await params;

    await db
      .delete(schema.soraCharacters)
      .where(and(
        eq(schema.soraCharacters.id, id),
        eq(schema.soraCharacters.userId, authResult.portalUser.id)
      ));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[sora-characters/id]", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
