import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (event: string, data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      let lastStatus = "";
      let pollCount = 0;
      const MAX_POLLS = 200;

      const interval = setInterval(async () => {
        pollCount++;
        if (pollCount > MAX_POLLS) {
          clearInterval(interval);
          send("error", { message: "SSE timeout" });
          controller.close();
          return;
        }

        try {
          const [gen] = await db
            .select()
            .from(schema.generations)
            .where(eq(schema.generations.id, id))
            .limit(1);

          if (!gen) {
            clearInterval(interval);
            send("error", { message: "Generation not found" });
            controller.close();
            return;
          }

          if (gen.status !== lastStatus) {
            lastStatus = gen.status;
            send("status", {
              status: gen.status,
              videoUrl: gen.videoUrl,
              errorMessage: gen.errorMessage,
            });

            if (gen.status === "video_ready" || gen.status === "error") {
              clearInterval(interval);
              controller.close();
              return;
            }
          }

          // Heartbeat
          send("heartbeat", { ts: Date.now() });
        } catch {
          // Ignore transient DB errors
        }
      }, 2000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
