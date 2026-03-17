const OPENAI_API_BASE = "https://api.openai.com/v1";

function getApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  return key;
}

// Maps our aspect ratio labels to Sora's accepted size values
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
  progress?: number;
  error?: string;
};

// Clamp user-selected duration to Sora's allowed values: 4, 8, 12
function clampDuration(d: number): string {
  if (d <= 4) return "4";
  if (d <= 8) return "8";
  return "12";
}

export async function submitSoraJob(params: {
  prompt: string;
  duration: number;
  aspectRatio: string;
  referenceImageUrl?: string;
  model?: string;
}): Promise<SoraJobResult> {
  const body: Record<string, unknown> = {
    model: params.model || "sora-2-pro",
    prompt: params.prompt,
    size: sizeMap[params.aspectRatio] || "720x1280",
    seconds: clampDuration(params.duration),
  };

  if (params.referenceImageUrl) {
    body.input_reference = { image_url: params.referenceImageUrl };
  }

  const response = await fetch(`${OPENAI_API_BASE}/videos`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
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
    const response = await fetch(`${OPENAI_API_BASE}/videos/${jobId}`, {
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
      // Video content is downloadable via /v1/videos/{id}/content
      const videoUrl = `${OPENAI_API_BASE}/videos/${jobId}/content`;
      return { status: "completed", videoUrl, progress: 100 };
    }

    if (data.status === "failed") {
      return {
        status: "failed",
        error: data.error?.message || "Video generation failed",
      };
    }

    if (data.status === "in_progress") {
      return { status: "processing", progress: data.progress || 0 };
    }

    // "queued"
    return { status: "pending", progress: data.progress || 0 };
  } catch (err) {
    return {
      status: "failed",
      error: err instanceof Error ? err.message : "Failed to poll Sora job",
    };
  }
}

export function estimateCost(duration: number, model: string = "sora-2-pro"): string {
  // Pricing per second by resolution tier (using 720p default rates)
  const rates: Record<string, number> = {
    "sora-2": 0.30,
    "sora-2-pro": 0.50,
  };
  const seconds = Number(clampDuration(duration));
  const rate = rates[model] || 0.30;
  const cost = seconds * rate;
  return `$${cost.toFixed(2)}`;
}
