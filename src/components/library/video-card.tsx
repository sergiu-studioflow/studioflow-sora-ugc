"use client";

import { Play, Clock, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type VideoGeneration = {
  id: string;
  creativeDirection: string | null;
  status: string;
  aspectRatio: string;
  duration: number;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  productImageUrl: string | null;
  estimatedCost: string | null;
  createdAt: string;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const statusConfig: Record<string, { label: string; color: string; icon?: React.ElementType }> = {
  video_ready: { label: "Ready", color: "bg-green-500/10 text-green-500 border-green-500/20" },
  creating_video: { label: "Generating", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: Loader2 },
  prompt_ready: { label: "Prompt Ready", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  generating_prompt: { label: "Processing", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: Loader2 },
  error: { label: "Error", color: "bg-red-500/10 text-red-500 border-red-500/20", icon: AlertCircle },
  draft: { label: "Draft", color: "bg-gray-500/10 text-gray-500 border-gray-500/20" },
};

export function VideoCard({
  generation,
  onClick,
}: {
  generation: VideoGeneration;
  onClick: () => void;
}) {
  const thumb = generation.thumbnailUrl || generation.productImageUrl;
  const status = statusConfig[generation.status] || statusConfig.draft;
  const StatusIcon = status.icon;
  const isReady = generation.status === "video_ready";

  return (
    <button
      onClick={onClick}
      className="group rounded-lg border border-border bg-card overflow-hidden text-left transition-all hover:border-foreground/20 hover:shadow-md w-full"
    >
      {/* Thumbnail */}
      <div className="relative h-40 bg-black/50">
        {thumb ? (
          <img src={thumb} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Clock className="h-8 w-8 text-muted-foreground/20" />
          </div>
        )}

        {/* Play overlay for ready videos */}
        {isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
            <div className="h-10 w-10 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="h-4 w-4 text-black ml-0.5" />
            </div>
          </div>
        )}

        {/* Status badge */}
        <div className={cn("absolute top-2 left-2 rounded-md border px-1.5 py-0.5 text-[10px] font-medium flex items-center gap-1", status.color)}>
          {StatusIcon && <StatusIcon className={cn("h-2.5 w-2.5", status.icon === Loader2 && "animate-spin")} />}
          {status.label}
        </div>

        {/* Duration + aspect */}
        <div className="absolute bottom-2 right-2 flex gap-1">
          <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white font-medium">
            {generation.duration}s
          </span>
          <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white font-medium">
            {generation.aspectRatio}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-1">
        <p className="text-xs text-foreground font-medium line-clamp-2 leading-relaxed">
          {generation.creativeDirection || "Untitled generation"}
        </p>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{timeAgo(generation.createdAt)}</span>
          {generation.estimatedCost && <span>{generation.estimatedCost}</span>}
        </div>
      </div>
    </button>
  );
}
