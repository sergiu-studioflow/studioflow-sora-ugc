import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/auth";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authResult = await requireAuth();
    if (isAuthError(authResult)) return authResult;

    const personas = await db
      .select()
      .from(schema.archetypes)
      .where(eq(schema.archetypes.isActive, true))
      .orderBy(schema.archetypes.name);

    return NextResponse.json(personas);
  } catch (err) {
    console.error("[personas]", err);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (isAuthError(authResult)) return authResult;

    const body = await req.json();
    const { name, ageRange, gender, profile, defaultMakeup, defaultExpression, defaultHair, defaultClothing } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const [persona] = await db
      .insert(schema.archetypes)
      .values({
        name: name.trim(),
        ageRange: ageRange || "",
        gender: gender || "",
        profile: profile || "",
        defaultMakeup: defaultMakeup || null,
        defaultExpression: defaultExpression || null,
        defaultHair: defaultHair || null,
        defaultClothing: defaultClothing || null,
      })
      .returning();

    return NextResponse.json(persona, { status: 201 });
  } catch (err) {
    console.error("[personas]", err);
    return NextResponse.json({ error: "Failed to create persona" }, { status: 500 });
  }
}
