export type AppConfig = {
  id: string;
  brandName: string;
  brandColor: string | null;
  logoUrl: string | null;
  portalTitle: string | null;
  features: Record<string, boolean>;
  workflows: Record<string, { webhook_path: string; n8n_base_url?: string }>;
};

export type Archetype = {
  id: string;
  name: string;
  ageRange: string;
  gender: string;
  profile: string;
  defaultMakeup: string | null;
  defaultExpression: string | null;
  defaultHair: string | null;
  defaultClothing: string | null;
};

export type Generation = {
  id: string;
  creativeDirection: string | null;
  characterDescription: string | null;
  ageRange: string | null;
  gender: string | null;
  makeup: string | null;
  expression: string | null;
  hair: string | null;
  clothing: string | null;
  productImageUrl: string | null;
  aspectRatio: string;
  duration: number;
  sceneDescription: string | null;
  dialogue: string | null;
  complianceNotes: string | null;
  negativePrompt: string | null;
  fullPrompt: string | null;
  soraJobId: string | null;
  soraModel: string | null;
  status: string;
  videoUrl: string | null;
  estimatedCost: string | null;
  errorMessage: string | null;
  createdAt: Date;
};

export type GenerationStatus =
  | "draft"
  | "generating_prompt"
  | "prompt_ready"
  | "creating_video"
  | "video_ready"
  | "error";

export const STATUS_LABELS: Record<GenerationStatus, string> = {
  draft: "Draft",
  generating_prompt: "Generating Prompt...",
  prompt_ready: "Prompt Created",
  creating_video: "Creating Video...",
  video_ready: "Video Ready",
  error: "Error",
};

export const STEP_MAP: Record<GenerationStatus, number> = {
  draft: 0,
  generating_prompt: 1,
  prompt_ready: 2,
  creating_video: 3,
  video_ready: 4,
  error: -1,
};
