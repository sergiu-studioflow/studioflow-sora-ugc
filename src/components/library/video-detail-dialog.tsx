"use client";

import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type Generation = {
  id: string;
  creativeDirection: string | null;
  status: string;
  aspectRatio: string;
  duration: number;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  productImageUrl: string | null;
  fullPrompt: string | null;
  ageRange: string | null;
  gender: string | null;
  estimatedCost: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export function VideoDetailDialog({
  generation,
  open,
  onOpenChange,
  onDelete,
}: {
  generation: Generation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => void;
}) {
  if (!generation) return null;

  const isReady = generation.status === "video_ready" && generation.videoUrl;
  const date = new Date(generation.createdAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const handleDelete = () => {
    if (!confirm("Delete this generation? This cannot be undone.")) return;
    onDelete(generation.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            {generation.creativeDirection || "Untitled generation"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Video player */}
          {isReady && (
            <div className="rounded-lg overflow-hidden border border-border bg-black">
              <video
                src={generation.videoUrl!}
                controls
                autoPlay
                muted
                className="w-full max-h-[400px]"
              />
            </div>
          )}

          {/* Error message */}
          {generation.status === "error" && generation.errorMessage && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm text-destructive">{generation.errorMessage}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>{generation.duration}s</span>
            <span>{generation.aspectRatio}</span>
            {generation.estimatedCost && <span>{generation.estimatedCost}</span>}
            {generation.ageRange && <span>{generation.ageRange} {generation.gender}</span>}
            <span>{date}</span>
          </div>

          {/* Full prompt */}
          {generation.fullPrompt && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Prompt</label>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto">
                {generation.fullPrompt}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {isReady && (
              <Button size="sm" asChild>
                <a href={generation.videoUrl!} download>
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Download
                </a>
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
