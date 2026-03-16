"use client";

import { Check, Loader2, Circle, Play, Download, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STEP_MAP, type GenerationStatus } from "@/lib/types";

type Props = {
  state: any;
};

const STEPS = [
  { label: "Generating Hook...", key: 0 },
  { label: "Generating Prompt...", key: 1 },
  { label: "Prompt Created", key: 2 },
  { label: "Creating Video...", key: 3 },
  { label: "Video Ready", key: 4 },
];

export function RightPanel({ state }: Props) {
  const currentStep = STEP_MAP[state.status as GenerationStatus] ?? 0;
  const isCreatingVideo = state.status === "creating_video";
  const isVideoReady = state.status === "video_ready";
  const isError = state.status === "error";

  return (
    <div className="flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Output</h2>
      </div>

      <div className="flex-1 p-4 space-y-6">
        {/* Progress Stepper */}
        <div className="space-y-1">
          {STEPS.map((step, i) => {
            const isComplete = currentStep > step.key;
            const isActive = currentStep === step.key && state.status !== "draft";
            const isFuture = currentStep < step.key;

            return (
              <div key={step.key} className="flex items-center gap-3 py-2">
                {/* Step indicator */}
                <div className="flex items-center justify-center w-6 h-6">
                  {isComplete ? (
                    <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  ) : isActive ? (
                    <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <Loader2 className="h-3 w-3 text-white animate-spin" />
                    </div>
                  ) : (
                    <Circle className={cn("h-4 w-4", isFuture ? "text-border" : "text-muted-foreground")} />
                  )}
                </div>

                {/* Step label */}
                <span
                  className={cn(
                    "text-sm",
                    isComplete ? "text-foreground font-medium" : isActive ? "text-blue-400 font-medium" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>

                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="hidden" />
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar during video creation */}
        {isCreatingVideo && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">
              Sora is creating your video... {state.progress > 0 ? `${state.progress}%` : ""}
            </p>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-1000",
                  state.progress === 0 && "animate-pulse"
                )}
                style={{ width: state.progress > 0 ? `${state.progress}%` : "15%" }}
              />
            </div>
          </div>
        )}

        {/* Video player */}
        {isVideoReady && state.videoUrl && (
          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden border border-border bg-black">
              <video
                src={state.videoUrl}
                controls
                className="w-full"
                autoPlay
                muted
              />
            </div>
            <a
              href={state.videoUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="w-full">
                <Download className="h-3.5 w-3.5 mr-2" />
                Download Video
              </Button>
            </a>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Generation Failed</p>
              <p className="text-xs text-destructive/80 mt-1">{state.errorMessage}</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {state.status === "draft" && (
          <div className="text-center text-sm text-muted-foreground pt-8">
            <Play className="h-8 w-8 mx-auto mb-3 text-border" />
            <p>Your generated video will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}
