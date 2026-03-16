"use client";

import { useEffect, useState, type Dispatch } from "react";
import { Upload, Sparkles, Shuffle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Archetype } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  state: any;
  dispatch: Dispatch<any>;
  onGenerate: () => void;
  isGenerating: boolean;
};

const ASPECT_RATIOS = ["9:16", "16:9", "720p"];
const DURATIONS = [4, 8, 12];

export function LeftPanel({ state, dispatch, onGenerate, isGenerating }: Props) {
  const [archetypes, setArchetypes] = useState<Archetype[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    fetch("/api/archetypes")
      .then((r) => r.json())
      .then(setArchetypes)
      .catch(() => {});
  }, []);

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);

    // Client preview
    const preview = URL.createObjectURL(file);
    dispatch({ type: "SET_FIELD", field: "productImagePreview", value: preview });

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        dispatch({ type: "SET_FIELD", field: "productImageUrl", value: data.url });
      }
    } catch {
      // Keep preview even if upload fails
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  };

  const handleRandomize = () => {
    if (archetypes.length === 0) return;
    const arch = archetypes[Math.floor(Math.random() * archetypes.length)];
    dispatch({
      type: "SET_ARCHETYPE",
      payload: {
        archetypeId: arch.id,
        ageRange: arch.ageRange,
        gender: arch.gender,
        profile: arch.profile,
        makeup: arch.defaultMakeup || "",
        expression: arch.defaultExpression || "",
        hair: arch.defaultHair || "",
        clothing: arch.defaultClothing || "",
      },
    });
  };

  const setField = (field: string, value: string | number) => {
    dispatch({ type: "SET_FIELD", field, value });
  };

  return (
    <div className="flex flex-col border-r border-border overflow-y-auto">
      <div className="p-4 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Input</h2>
        </div>

        {/* Creative Direction */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Creative Direction
          </label>
          <Textarea
            placeholder="Describe the video you want... e.g. 'Busy mum showing teeth whitening product, warm and genuine feeling'"
            value={state.creativeDirection}
            onChange={(e) => setField("creativeDirection", e.target.value)}
            className="min-h-[80px] text-sm resize-none"
          />
        </div>

        {/* Character Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Character</span>
            {archetypes.length > 0 && (
              <select
                value={state.archetypeId}
                onChange={(e) => {
                  const arch = archetypes.find((a) => a.id === e.target.value);
                  if (arch) {
                    dispatch({
                      type: "SET_ARCHETYPE",
                      payload: {
                        archetypeId: arch.id,
                        ageRange: arch.ageRange,
                        gender: arch.gender,
                        profile: arch.profile,
                        makeup: arch.defaultMakeup || "",
                        expression: arch.defaultExpression || "",
                        hair: arch.defaultHair || "",
                        clothing: arch.defaultClothing || "",
                      },
                    });
                  }
                }}
                className="text-xs bg-card border border-border rounded-md px-2 py-1 text-foreground"
              >
                <option value="">Select archetype...</option>
                {archetypes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-muted-foreground">Age Range</label>
              <Input
                value={state.ageRange}
                onChange={(e) => setField("ageRange", e.target.value)}
                placeholder="25-34"
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">Gender</label>
              <Input
                value={state.gender}
                onChange={(e) => setField("gender", e.target.value)}
                placeholder="Female"
                className="text-xs h-8"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-muted-foreground">Profile</label>
            <Input
              value={state.profile}
              onChange={(e) => setField("profile", e.target.value)}
              placeholder="busy mum of young kids"
              className="text-xs h-8"
            />
          </div>
        </div>

        {/* Appearance */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Appearance</span>
          {[
            { key: "makeup", label: "Makeup", placeholder: "natural makeup" },
            { key: "expression", label: "Expression", placeholder: "warm, genuine smile" },
            { key: "hair", label: "Hair", placeholder: "hair tied up casually" },
            { key: "clothing", label: "Clothing", placeholder: "comfortable home clothing" },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-[11px] text-muted-foreground">{label}</label>
              <Input
                value={(state as any)[key]}
                onChange={(e) => setField(key, e.target.value)}
                placeholder={placeholder}
                className="text-xs h-8"
              />
            </div>
          ))}
        </div>

        {/* Generate Script Button */}
        <Button
          onClick={onGenerate}
          disabled={isGenerating || !state.creativeDirection.trim()}
          className="w-full"
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Generating...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              Generate Script
            </span>
          )}
        </Button>

        {/* Product Image Upload */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Product Reference
          </label>
          {state.productImagePreview ? (
            <div className="relative group">
              <img
                src={state.productImagePreview}
                alt="Product"
                className="w-full h-32 object-contain rounded-lg border border-border bg-card"
              />
              <button
                onClick={() => {
                  dispatch({ type: "SET_FIELD", field: "productImagePreview", value: "" });
                  dispatch({ type: "SET_FIELD", field: "productImageUrl", value: "" });
                }}
                className="absolute top-1 right-1 p-1 rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleImageUpload(file);
                };
                input.click();
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors",
                dragOver ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
              )}
            >
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Drop image or click</span>
            </div>
          )}
        </div>

        {/* Aspect Ratio */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Aspect Ratio
          </label>
          <div className="flex gap-2">
            {ASPECT_RATIOS.map((ar) => (
              <button
                key={ar}
                onClick={() => setField("aspectRatio", ar)}
                className={cn(
                  "flex-1 rounded-lg border py-1.5 text-xs font-medium transition-all",
                  state.aspectRatio === ar
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-foreground/30"
                )}
              >
                {ar}
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Duration
          </label>
          <div className="flex gap-1.5">
            {DURATIONS.map((d) => (
              <button
                key={d}
                onClick={() => setField("duration", d)}
                className={cn(
                  "flex-1 rounded-lg border py-1.5 text-xs font-medium transition-all",
                  state.duration === d
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-foreground/30"
                )}
              >
                {d}s
              </button>
            ))}
          </div>
        </div>

        {/* Random Button */}
        <Button
          variant="outline"
          onClick={handleRandomize}
          className="w-full"
          disabled={archetypes.length === 0}
        >
          <Shuffle className="h-3.5 w-3.5 mr-2" />
          Random
        </Button>
      </div>
    </div>
  );
}
