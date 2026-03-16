"use client";

import { useReducer, useState, useCallback } from "react";
import { LeftPanel } from "./left-panel";
import { MiddlePanel } from "./middle-panel";
import { RightPanel } from "./right-panel";
import type { GenerationStatus } from "@/lib/types";

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
  productImageUrl: string;
  productImagePreview: string;
  aspectRatio: string;
  duration: number;
  // Generation state
  generationId: string | null;
  status: GenerationStatus;
  sceneDescription: string;
  dialogue: string;
  complianceNotes: string;
  negativePrompt: string;
  fullPrompt: string;
  estimatedCost: string;
  videoUrl: string;
  errorMessage: string;
  progress: number;
  referenceFrameUrl: string;
  frameError: string;
};

export type Action =
  | { type: "SET_FIELD"; field: keyof StudioState; value: string | number }
  | { type: "SET_ARCHETYPE"; payload: Partial<StudioState> }
  | { type: "SET_GENERATION"; payload: Partial<StudioState> }
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
  productImageUrl: "",
  productImagePreview: "",
  aspectRatio: "9:16",
  duration: 8,
  generationId: null,
  status: "draft",
  sceneDescription: "",
  dialogue: "",
  complianceNotes: "",
  negativePrompt: "",
  fullPrompt: "",
  estimatedCost: "",
  videoUrl: "",
  errorMessage: "",
  progress: 0,
  referenceFrameUrl: "",
  frameError: "",
};

function reducer(state: StudioState, action: Action): StudioState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "SET_ARCHETYPE":
      return { ...state, ...action.payload };
    case "SET_GENERATION":
      return { ...state, ...action.payload };
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
    if (!state.creativeDirection.trim() || isUploading) return;

    console.log("[studio] Generating with productImageUrl:", state.productImageUrl || "(empty)");
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
          productImageUrl: state.productImageUrl,
          aspectRatio: state.aspectRatio,
          duration: state.duration,
          archetypeId: state.archetypeId || undefined,
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
          sceneDescription: data.sceneDescription || "",
          dialogue: data.dialogue || "",
          complianceNotes: data.complianceNotes || "",
          negativePrompt: data.negativePrompt || "",
          fullPrompt: data.fullPrompt || "",
          estimatedCost: data.estimatedCost || "",
          referenceFrameUrl: data.referenceFrameUrl || "",
          frameError: data.frameError || "",
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
          sceneDescription: state.sceneDescription,
          dialogue: state.dialogue,
          complianceNotes: state.complianceNotes,
          negativePrompt: state.negativePrompt,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send to Sora");
      }

      // Start polling for status updates
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
  }, [state.generationId, state.sceneDescription, state.dialogue, state.complianceNotes, state.negativePrompt]);

  const pollForCompletion = useCallback(async (genId: string) => {
    const maxPolls = 120;
    for (let i = 0; i < maxPolls; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const res = await fetch(`/api/generate/${genId}`);
        const data = await res.json();

        if (data.status === "video_ready") {
          dispatch({
            type: "SET_GENERATION",
            payload: {
              status: "video_ready",
              videoUrl: data.videoUrl || "",
            },
          });
          return;
        }

        if (data.status === "error") {
          dispatch({
            type: "SET_GENERATION",
            payload: {
              status: "error",
              errorMessage: data.errorMessage || "Video generation failed",
            },
          });
          return;
        }

        // Update progress if available
        if (data.progress !== undefined) {
          dispatch({
            type: "SET_FIELD",
            field: "progress" as keyof StudioState,
            value: data.progress,
          });
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
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-xs font-bold text-primary-foreground">S</span>
          </div>
          <span className="text-sm font-semibold text-foreground">Sora UGC Studio</span>
        </div>
        <div className="text-xs text-muted-foreground">
          AI-Powered Video Generation
        </div>
      </header>

      {/* 3-Panel Grid */}
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
