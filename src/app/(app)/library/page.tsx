"use client";

import { useEffect, useState, useCallback } from "react";
import { Film } from "lucide-react";
import { VideoCard } from "@/components/library/video-card";
import { VideoDetailDialog } from "@/components/library/video-detail-dialog";
import { cn } from "@/lib/utils";

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

const FILTERS = [
  { value: "all", label: "All" },
  { value: "video_ready", label: "Ready" },
  { value: "creating_video", label: "Generating" },
  { value: "prompt_ready", label: "Prompt Only" },
  { value: "error", label: "Error" },
];

export default function LibraryPage() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [filter, setFilter] = useState("all");
  const [selectedGen, setSelectedGen] = useState<Generation | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchGenerations = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === "all" ? "/api/history" : `/api/history?status=${filter}`;
      const res = await fetch(url);
      if (res.ok) setGenerations(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchGenerations(); }, [fetchGenerations]);

  const handleCardClick = (gen: Generation) => {
    setSelectedGen(gen);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/history/${id}`, { method: "DELETE" });
    setGenerations((prev) => prev.filter((g) => g.id !== id));
  };

  const readyCount = generations.filter((g) => g.status === "video_ready").length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Video Library</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {generations.length} generation{generations.length !== 1 ? "s" : ""}
            {readyCount > 0 && ` · ${readyCount} video${readyCount !== 1 ? "s" : ""} ready`}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-1.5 px-6 py-3 border-b border-border">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={cn(
              "rounded-md border px-3 py-1 text-xs font-medium transition-all",
              filter === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-foreground/30"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : generations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Film className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              {filter === "all" ? "No videos yet." : `No ${FILTERS.find((f) => f.value === filter)?.label.toLowerCase()} generations.`}
            </p>
            {filter === "all" && (
              <p className="text-xs text-muted-foreground mt-1">
                Head to the Studio to generate your first video.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {generations.map((gen) => (
              <VideoCard
                key={gen.id}
                generation={gen}
                onClick={() => handleCardClick(gen)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <VideoDetailDialog
        generation={selectedGen}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onDelete={handleDelete}
      />
    </div>
  );
}
