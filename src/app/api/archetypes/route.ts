import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const archetypes = await db
      .select({
        id: schema.archetypes.id,
        name: schema.archetypes.name,
        ageRange: schema.archetypes.ageRange,
        gender: schema.archetypes.gender,
        profile: schema.archetypes.profile,
        defaultMakeup: schema.archetypes.defaultMakeup,
        defaultExpression: schema.archetypes.defaultExpression,
        defaultHair: schema.archetypes.defaultHair,
        defaultClothing: schema.archetypes.defaultClothing,
      })
      .from(schema.archetypes)
      .where(eq(schema.archetypes.isActive, true));

    return NextResponse.json(archetypes);
  } catch (err) {
    console.error("[archetypes]", err);
    return NextResponse.json([], { status: 500 });
  }
}
