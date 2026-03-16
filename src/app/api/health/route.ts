import { NextResponse } from "next/server";

export async function GET() {
  const brand = process.env.SEED_BRAND_NAME || "unknown";

  return NextResponse.json({
    brand,
    status: "ok",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
  });
}
