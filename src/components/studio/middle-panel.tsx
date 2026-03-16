"use client";

import { type Dispatch } from "react";
import { Eye, Send, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Props = {
  state: any;
  dispatch: Dispatch<any>;
  onSendToSora: () => void;
  isSending: boolean;
};

export function MiddlePanel({ state, dispatch, onSendToSora, isSending }: Props) {
  const hasPrompt = state.status !== "draft" && state.status !== "generating_prompt";
  const isEditable = state.status === "prompt_ready";

  const setField = (field: string, value: string) => {
    dispatch({ type: "SET_FIELD", field, value });
  };

  if (state.status === "generating_prompt") {
    return (
      <div className="flex flex-col border-r border-border">
        <div className="flex items-center gap-2 p-4 border-b border-border">
          <Eye className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Prompt Preview</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Generating your prompt...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasPrompt) {
    return (
      <div className="flex flex-col border-r border-border">
        <div className="flex items-center gap-2 p-4 border-b border-border">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Prompt Preview</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2 px-8">
            <p className="text-sm text-muted-foreground">
              Fill in the input form and click &quot;Generate Script&quot; to see the AI-crafted prompt here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const sections = [
    { key: "sceneDescription", label: "Scene Description", icon: "camera" },
    { key: "dialogue", label: "Dialogue (voiceover)", icon: "mic" },
    { key: "complianceNotes", label: "Messaging Compliance", icon: "shield" },
    { key: "negativePrompt", label: "Negative Prompt", icon: "x" },
  ];

  return (
    <div className="flex flex-col border-r border-border overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Prompt Preview</h2>
        </div>
        {state.status === "prompt_ready" && (
          <button
            onClick={() => dispatch({ type: "SET_GENERATION", payload: { status: "draft", generationId: null, sceneDescription: "", dialogue: "", complianceNotes: "", negativePrompt: "" } })}
            className="p-1 rounded hover:bg-accent"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Summary bar */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Duration: {state.duration} seconds</span>
          <span className="text-border">|</span>
          <span>Aspect ratio: {state.aspectRatio} vertical</span>
          <span className="text-border">|</span>
          <span>Style: authentic UGC phone video</span>
        </div>

        {/* Prompt sections (hidden when error) */}
        {state.status !== "error" && sections.map(({ key, label }) => {
          const value = (state as any)[key] || "";
          return (
            <div key={key} className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">{label}</label>
              {isEditable ? (
                <Textarea
                  value={value}
                  onChange={(e) => setField(key, e.target.value)}
                  className="text-sm min-h-[100px] resize-none"
                />
              ) : (
                <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {value || "\u2014"}
                </div>
              )}
            </div>
          );
        })}

        {/* Error display */}
        {state.status === "error" && state.errorMessage && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{state.errorMessage}</p>
          </div>
        )}
      </div>

      {/* Bottom action */}
      {state.status === "prompt_ready" && (
        <div className="border-t border-border p-4 space-y-2">
          {state.estimatedCost && (
            <p className="text-xs text-muted-foreground text-center">
              Estimated cost: {state.estimatedCost}
            </p>
          )}
          <Button
            onClick={onSendToSora}
            disabled={isSending}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSending ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Sending...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="h-3.5 w-3.5" />
                Direct to Sora
              </span>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
