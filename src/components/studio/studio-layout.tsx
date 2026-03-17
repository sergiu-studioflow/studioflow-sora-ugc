"use client";

import { useReducer, useState, useCallback } from "react";
import { LeftPanel } from "./left-panel";
import { MiddlePanel } from "./middle-panel";
import { RightPanel } from "./right-panel";
import type { GenerationStatus } from "@/lib/types";

export type Scene = {
  id: string;
  duration: number;
  type: string;
  direction: string;
};

export type StudioState = {
  // Form inputs
  creativeDirection: string;
  archetypeId: string;
  ageRange: string;
  gender: string;
  profile: string;
  makeup: string;
  expression: string;
  hair: string;
  clothing: string;
  emotionalTone: string;
  characterMode: "sora-character" | "persona" | "custom";
  soraCharacterId: string;
  soraCharacterName: string;
  productImageUrl: string;
  productImagePreview: string;
  aspectRatio: string;
  duration: number;
  // Storyboard
  storyboardMode: boolean;
  scenes: Scene[];
  // Generation state
  generationId: string | null;
  status: GenerationStatus;
  fullPrompt: string;
  estimatedCost: string;
  videoUrl: string;
  errorMessage: string;
  progress: number;
};

export type Action =
  | { type: "SET_FIELD"; field: keyof StudioState; value: string | number | boolean }
  | { type: "SET_ARCHETYPE"; payload: Partial<StudioState> }
  | { type: "SET_GENERATION"; payload: Partial<StudioState> }
  | { type: "TOGGLE_STORYBOARD"; enabled: boolean }
  | { type: "ADD_SCENE" }
  | { type: "UPDATE_SCENE"; sceneId: string; field: keyof Scene; value: string | number }
  | { type: "REMOVE_SCENE"; sceneId: string }
  | { type: "RESET" };

const initialState: StudioState = {
  creativeDirection: "",
  archetypeId: "",
  ageRange: "",
  gender: "",
  profile: "",
  makeup: "",
  expression: "",
  hair: "",
  clothing: "",
  emotionalTone: "",
  characterMode: "custom",
  soraCharacterId: "",
  soraCharacterName: "",
  productImageUrl: "",
  productImagePreview: "",
  aspectRatio: "9:16",
  duration: 8,
  storyboardMode: false,
  scenes: [],
  generationId: null,
  status: "draft",
  fullPrompt: "",
  estimatedCost: "",
  videoUrl: "",
  errorMessage: "",
  progress: 0,
};

function getAllocatedDuration(scenes: Scene[]): number {
  return scenes.reduce((sum, s) => sum + s.duration, 0);
}

function reducer(state: StudioState, action: Action): StudioState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "SET_ARCHETYPE":
      return { ...state, ...action.payload };
    case "SET_GENERATION":
      return { ...state, ...action.payload };
    case "TOGGLE_STORYBOARD":
      return {
        ...state,
        storyboardMode: action.enabled,
        scenes: action.enabled ? state.scenes : [],
      };
    case "ADD_SCENE": {
      const allocated = getAllocatedDuration(state.scenes);
      const remaining = state.duration - allocated;
      if (remaining < 3) return state;
      const newScene: Scene = {
        id: crypto.randomUUID(),
        duration: Math.min(remaining, 4),
        type: "talking-head",
        direction: "",
      };
      return { ...state, scenes: [...state.scenes, newScene] };
    }
    case "UPDATE_SCENE":
      return {
        ...state,
        scenes: state.scenes.map((s) =>
          s.id === action.sceneId ? { ...s, [action.field]: action.value } : s
        ),
      };
    case "REMOVE_SCENE":
      return {
        ...state,
        scenes: state.scenes.filter((s) => s.id !== action.sceneId),
      };
    case "RESET":
      return { ...initialState };
    default:
      return state;
  }
}

export function StudioLayout() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [isSendingToSora, setIsSendingToSora] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleGenerateScript = useCallback(async () => {
    if (isUploading) return;

    // Validate based on mode
    if (state.storyboardMode) {
      if (state.scenes.length === 0) return;
      const allocated = getAllocatedDuration(state.scenes);
      if (allocated !== state.duration) return;
      if (state.scenes.some((s) => !s.direction.trim())) return;
    } else {
      if (!state.creativeDirection.trim()) return;
    }

    setIsGeneratingPrompt(true);
    dispatch({ type: "SET_GENERATION", payload: { status: "generating_prompt", errorMessage: "" } });

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creativeDirection: state.creativeDirection,
          ageRange: state.ageRange,
          gender: state.gender,
          profile: state.profile,
          makeup: state.makeup,
          expression: state.expression,
          hair: state.hair,
          clothing: state.clothing,
          emotionalTone: state.emotionalTone,
          characterMode: state.characterMode,
          soraCharacterName: state.soraCharacterName || undefined,
          productImageUrl: state.productImageUrl,
          aspectRatio: state.aspectRatio,
          duration: state.duration,
          archetypeId: state.archetypeId || undefined,
          storyboardMode: state.storyboardMode,
          scenes: state.storyboardMode
            ? state.scenes.map((s) => ({ duration: s.duration, type: s.type, direction: s.direction }))
            : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate prompt");
      }

      dispatch({
        type: "SET_GENERATION",
        payload: {
          generationId: data.id,
          status: "prompt_ready",
          fullPrompt: data.fullPrompt || "",
          estimatedCost: data.estimatedCost || "",
        },
      });
    } catch (err) {
      dispatch({
        type: "SET_GENERATION",
        payload: {
          status: "error",
          errorMessage: err instanceof Error ? err.message : "Unknown error",
        },
      });
    } finally {
      setIsGeneratingPrompt(false);
    }
  }, [state, isUploading]);

  const handleSendToSora = useCallback(async () => {
    if (!state.generationId) return;

    setIsSendingToSora(true);
    dispatch({ type: "SET_GENERATION", payload: { status: "creating_video", errorMessage: "" } });

    try {
      const res = await fetch(`/api/generate/${state.generationId}/send-to-sora`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullPrompt: state.fullPrompt,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send to Sora");
      }

      pollForCompletion(state.generationId);
    } catch (err) {
      dispatch({
        type: "SET_GENERATION",
        payload: {
          status: "error",
          errorMessage: err instanceof Error ? err.message : "Unknown error",
        },
      });
    } finally {
      setIsSendingToSora(false);
    }
  }, [state.generationId, state.fullPrompt]);

  const pollForCompletion = useCallback(async (genId: string) => {
    const maxPolls = 300; // 300 polls × 3s = 15 minutes (Sora Pro 1080p can be slow)
    for (let i = 0; i < maxPolls; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const res = await fetch(`/api/generate/${genId}`);
        const data = await res.json();

        if (data.status === "video_ready") {
          dispatch({
            type: "SET_GENERATION",
            payload: { status: "video_ready", videoUrl: data.videoUrl || "" },
          });
          return;
        }

        if (data.status === "error") {
          dispatch({
            type: "SET_GENERATION",
            payload: { status: "error", errorMessage: data.errorMessage || "Video generation failed" },
          });
          return;
        }

        if (data.progress !== undefined) {
          dispatch({ type: "SET_FIELD", field: "progress", value: data.progress });
        }
      } catch {
        // Continue polling on network errors
      }
    }
    dispatch({
      type: "SET_GENERATION",
      payload: { status: "error", errorMessage: "Generation timed out" },
    });
  }, []);

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="grid flex-1 grid-cols-[320px_1fr_380px] overflow-hidden">
        <LeftPanel
          state={state}
          dispatch={dispatch}
          onGenerate={handleGenerateScript}
          isGenerating={isGeneratingPrompt}
          onUploadingChange={setIsUploading}
        />
        <MiddlePanel
          state={state}
          dispatch={dispatch}
          onSendToSora={handleSendToSora}
          isSending={isSendingToSora}
        />
        <RightPanel state={state} />
      </div>
    </div>
  );
}
