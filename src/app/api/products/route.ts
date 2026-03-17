import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authResult = await requireAuth();
    if (isAuthError(authResult)) return authResult;

    const products = await db
      .select()
      .from(schema.products)
      .where(and(
        eq(schema.products.userId, authResult.portalUser.id),
        eq(schema.products.isActive, true)
      ))
      .orderBy(schema.products.createdAt);

    return NextResponse.json(products);
  } catch (err) {
    console.error("[products]", err);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (isAuthError(authResult)) return authResult;

    const body = await req.json();
    const { name, description, imageUrl } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const [product] = await db
      .insert(schema.products)
      .values({
        userId: authResult.portalUser.id,
        name: name.trim(),
        description: description || null,
        imageUrl: imageUrl || null,
      })
      .returning();

    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    console.error("[products]", err);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
