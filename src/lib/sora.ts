const OPENAI_API_BASE = "https://api.openai.com/v1";

function getApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  return key;
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    "Content-Type": "application/json",
  };
}

const sizeMap: Record<string, string> = {
  "9:16": "1080x1920",
  "16:9": "1920x1080",
  "720p": "1280x720",
};

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
  const response = await fetch(`${OPENAI_API_BASE}/videos/generations`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      model: params.model || "sora",
      prompt: params.prompt,
      size: sizeMap[params.aspectRatio] || "1080x1920",
      duration: params.duration,
      n: 1,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      err?.error?.message || `Sora API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return { jobId: data.id };
}

export async function pollSoraJob(jobId: string): Promise<SoraPollResult> {
  try {
    const response = await fetch(`${OPENAI_API_BASE}/videos/generations/${jobId}`, {
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return {
        status: "failed",
        error: err?.error?.message || `Poll error: ${response.status}`,
      };
    }

    const data = await response.json();

    if (data.status === "completed") {
      const videoUrl = data.data?.[0]?.url;
      if (videoUrl) {
        return { status: "completed", videoUrl };
      }
      return { status: "completed", error: "Video completed but no URL returned" };
    }

    if (data.status === "failed") {
      return {
        status: "failed",
        error: data.error?.message || "Video generation failed",
      };
    }

    if (data.status === "in_progress") {
      return { status: "processing" };
    }

    return { status: "pending" };
  } catch (err) {
    return {
      status: "failed",
      error: err instanceof Error ? err.message : "Failed to poll Sora job",
    };
  }
}

export function estimateCost(duration: number, model: string = "sora"): string {
  const rates: Record<string, number> = {
    sora: 0.10,
    "sora-2": 0.10,
    "sora-2-pro": 0.50,
  };
  const rate = rates[model] || 0.10;
  const cost = duration * rate;
  return `$${cost.toFixed(2)}`;
}
