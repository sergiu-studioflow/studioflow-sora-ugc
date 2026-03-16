import OpenAI from "openai";

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
}

export type SoraJobResult = {
  jobId: string;
};

export type SoraPollResult = {
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  error?: string;
};

export async function submitSoraJob(params: {
  prompt: string;
  duration: number;
  aspectRatio: string;
  referenceImageUrl?: string;
  model?: string;
}): Promise<SoraJobResult> {
  // Map aspect ratios to Sora format
  const aspectMap: Record<string, string> = {
    "9:16": "9:16",
    "16:9": "16:9",
    "720p": "16:9",
  };

  const response = await getClient().responses.create({
    model: params.model || "sora-2",
    input: params.prompt,
    tools: [{
      type: "video_generation" as any,
      // Video generation parameters
      duration: params.duration,
      aspect_ratio: aspectMap[params.aspectRatio] || "9:16",
      ...(params.referenceImageUrl && {
        image: { url: params.referenceImageUrl },
      }),
    }] as any,
  });

  // Extract job/generation ID from response
  const jobId = response.id;
  return { jobId };
}

export async function pollSoraJob(jobId: string): Promise<SoraPollResult> {
  try {
    const response = await getClient().responses.retrieve(jobId);

    // Check output for video generation results
    const output = (response as any).output || [];
    const videoOutput = output.find((o: any) => o.type === "video_generation_call");

    if (response.status === "completed" && videoOutput?.generation_id) {
      // Get the actual video content
      try {
        const videoResponse = await getClient().responses.retrieve(jobId);
        const videoData = ((videoResponse as any).output || []).find(
          (o: any) => o.type === "video_generation_call"
        );

        if (videoData?.video_url) {
          return { status: "completed", videoUrl: videoData.video_url };
        }

        // Try fetching video via generation_id
        return { status: "completed", videoUrl: `https://api.openai.com/v1/video/generations/${videoOutput.generation_id}/content` };
      } catch {
        return { status: "processing" };
      }
    }

    if (response.status === "failed") {
      return { status: "failed", error: (response as any).error?.message || "Video generation failed" };
    }

    if (response.status === "in_progress") {
      return { status: "processing" };
    }

    return { status: "pending" };
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : "Failed to poll Sora job" };
  }
}

export function estimateCost(duration: number, model: string = "sora-2"): string {
  const rates: Record<string, number> = {
    "sora-2": 0.10,
    "sora-2-pro": 0.50,
  };
  const rate = rates[model] || 0.10;
  const cost = duration * rate;
  return `$${cost.toFixed(2)}`;
}
