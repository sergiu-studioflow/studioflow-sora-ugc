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
      .update(schema.products)
      .set({ ...body, updatedAt: new Date() })
      .where(and(
        eq(schema.products.id, id),
        eq(schema.products.userId, authResult.portalUser.id)
      ))
      .returning();

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[products/id]", err);
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
      .delete(schema.products)
      .where(and(
        eq(schema.products.id, id),
        eq(schema.products.userId, authResult.portalUser.id)
      ));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[products/id]", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
