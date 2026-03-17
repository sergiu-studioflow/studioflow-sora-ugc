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

    const characters = await db
      .select()
      .from(schema.soraCharacters)
      .where(and(
        eq(schema.soraCharacters.userId, authResult.portalUser.id),
        eq(schema.soraCharacters.isActive, true)
      ))
      .orderBy(schema.soraCharacters.createdAt);

    return NextResponse.json(characters);
  } catch (err) {
    console.error("[sora-characters]", err);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (isAuthError(authResult)) return authResult;

    const body = await req.json();
    const { name, description, thumbnailUrl } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const [character] = await db
      .insert(schema.soraCharacters)
      .values({
        userId: authResult.portalUser.id,
        name: name.trim(),
        description: description || null,
        thumbnailUrl: thumbnailUrl || null,
      })
      .returning();

    return NextResponse.json(character, { status: 201 });
  } catch (err) {
    console.error("[sora-characters]", err);
    return NextResponse.json({ error: "Failed to create character" }, { status: 500 });
  }
}
