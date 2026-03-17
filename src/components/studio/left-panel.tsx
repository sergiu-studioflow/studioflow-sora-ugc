"use client";

import { useEffect, useState, type Dispatch } from "react";
import { upload } from "@vercel/blob/client";
import { Upload as UploadIcon, Sparkles, Shuffle, X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Archetype, SoraCharacter, Product } from "@/lib/types";
import type { Scene } from "./studio-layout";
import { cn } from "@/lib/utils";

type Props = {
  state: any;
  dispatch: Dispatch<any>;
  onGenerate: () => void;
  isGenerating: boolean;
  onUploadingChange?: (uploading: boolean) => void;
};

const ASPECT_RATIOS = ["9:16", "16:9", "720p"];
const DURATIONS = [4, 8, 12, 16, 20];

const SCENE_TYPES = [
  { value: "talking-head", label: "Talking Head" },
  { value: "b-roll", label: "B-Roll" },
  { value: "product-closeup", label: "Product Close-up" },
  { value: "transition", label: "Transition" },
];

export function LeftPanel({ state, dispatch, onGenerate, isGenerating, onUploadingChange }: Props) {
  const [archetypes, setArchetypes] = useState<Archetype[]>([]);
  const [soraChars, setSoraChars] = useState<SoraCharacter[]>([]);
  const [savedProducts, setSavedProducts] = useState<Product[]>([]);
  const [productMode, setProductMode] = useState<"saved" | "upload">("saved");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    fetch("/api/archetypes").then((r) => r.json()).then(setArchetypes).catch(() => {});
    fetch("/api/sora-characters").then((r) => r.json()).then(setSoraChars).catch(() => {});
    fetch("/api/products").then((r) => r.json()).then(setSavedProducts).catch(() => {});
  }, []);

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    onUploadingChange?.(true);

    const preview = URL.createObjectURL(file);
    dispatch({ type: "SET_FIELD", field: "productImagePreview", value: preview });

    try {
      const blob = await upload(`references/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });
      dispatch({ type: "SET_FIELD", field: "productImageUrl", value: blob.url });
    } catch (err) {
      console.error("[upload] Upload failed:", err);
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
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

  const setField = (field: string, value: string | number | boolean) => {
    dispatch({ type: "SET_FIELD", field, value });
  };

  // Storyboard helpers
  const scenes: Scene[] = state.scenes || [];
  const allocatedDuration = scenes.reduce((sum: number, s: Scene) => sum + s.duration, 0);
  const remainingDuration = state.duration - allocatedDuration;
  const canAddScene = remainingDuration >= 3;
  const scenesValid = state.storyboardMode
    ? scenes.length > 0 && allocatedDuration === state.duration && scenes.every((s: Scene) => s.direction.trim())
    : state.creativeDirection.trim();

  return (
    <div className="flex flex-col border-r border-border overflow-y-auto">
      <div className="p-4 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Input</h2>
        </div>

        {/* Mode Toggle */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Mode
          </label>
          <div className="flex gap-2">
            {[
              { value: false, label: "Simple" },
              { value: true, label: "Storyboard" },
            ].map(({ value, label }) => (
              <button
                key={label}
                onClick={() => dispatch({ type: "TOGGLE_STORYBOARD", enabled: value })}
                className={cn(
                  "flex-1 rounded-lg border py-1.5 text-xs font-medium transition-all",
                  state.storyboardMode === value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-foreground/30"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Creative Direction OR Storyboard */}
        {!state.storyboardMode ? (
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
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Storyboard
              </label>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-muted-foreground">
                  {allocatedDuration}s / {state.duration}s
                </span>
                {remainingDuration > 0 && (
                  <span className="text-yellow-500">{remainingDuration}s remaining</span>
                )}
                {remainingDuration === 0 && allocatedDuration === state.duration && (
                  <span className="text-green-500">Complete</span>
                )}
              </div>
            </div>

            {/* Scene Cards */}
            <div className="space-y-3">
              {scenes.map((scene: Scene, index: number) => (
                <div key={scene.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Scene {index + 1}</span>
                    <button
                      onClick={() => dispatch({ type: "REMOVE_SCENE", sceneId: scene.id })}
                      className="p-0.5 rounded hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>

                  {/* Duration */}
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-muted-foreground w-14 shrink-0">Duration</label>
                    <select
                      value={scene.duration}
                      onChange={(e) =>
                        dispatch({ type: "UPDATE_SCENE", sceneId: scene.id, field: "duration", value: Number(e.target.value) })
                      }
                      className="text-xs bg-background border border-border rounded-md px-2 py-1 text-foreground flex-1"
                    >
                      {Array.from({ length: 18 }, (_, i) => i + 3)
                        .filter((d) => d <= scene.duration + remainingDuration)
                        .map((d) => (
                          <option key={d} value={d}>{d}s</option>
                        ))}
                    </select>
                  </div>

                  {/* Type */}
                  <div className="flex flex-wrap gap-1">
                    {SCENE_TYPES.map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() =>
                          dispatch({ type: "UPDATE_SCENE", sceneId: scene.id, field: "type", value })
                        }
                        className={cn(
                          "rounded-md border px-2 py-0.5 text-[10px] font-medium transition-all",
                          scene.type === value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-foreground/30"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Direction */}
                  <Textarea
                    placeholder={`What happens in scene ${index + 1}?`}
                    value={scene.direction}
                    onChange={(e) =>
                      dispatch({ type: "UPDATE_SCENE", sceneId: scene.id, field: "direction", value: e.target.value })
                    }
                    className="text-xs min-h-[60px] resize-none"
                  />
                </div>
              ))}
            </div>

            {/* Add Scene Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => dispatch({ type: "ADD_SCENE" })}
              disabled={!canAddScene}
              className="w-full text-xs"
            >
              <Plus className="h-3 w-3 mr-1.5" />
              Add Scene {!canAddScene && remainingDuration > 0 ? `(need ${3 - remainingDuration}s more)` : ""}
            </Button>
          </div>
        )}

        {/* Character Section */}
        <div className="space-y-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Character</span>

          {/* 3-mode toggle */}
          <div className="flex gap-1">
            {([
              { value: "sora-character", label: "Sora Character" },
              { value: "persona", label: "Persona" },
              { value: "custom", label: "Custom" },
            ] as const).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setField("characterMode", value)}
                className={cn(
                  "flex-1 rounded-md border py-1 text-[10px] font-medium transition-all",
                  state.characterMode === value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-foreground/30"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Sora Character mode */}
          {state.characterMode === "sora-character" && (
            <div className="space-y-2">
              <select
                value={state.soraCharacterId}
                onChange={(e) => {
                  const char = soraChars.find((c) => c.id === e.target.value);
                  if (char) {
                    dispatch({
                      type: "SET_FIELD",
                      field: "soraCharacterId",
                      value: char.id,
                    });
                    dispatch({
                      type: "SET_FIELD",
                      field: "soraCharacterName",
                      value: char.name,
                    });
                  }
                }}
                className="w-full text-xs bg-card border border-border rounded-md px-2 py-1.5 text-foreground"
              >
                <option value="">Select a Sora character...</option>
                {soraChars.map((c) => (
                  <option key={c.id} value={c.id}>@{c.name}</option>
                ))}
              </select>
              {soraChars.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  No characters saved yet. Go to the Characters page to add one.
                </p>
              )}
              {state.soraCharacterName && (
                <div className="rounded-md bg-primary/5 border border-primary/20 px-3 py-2">
                  <p className="text-xs text-foreground font-medium">@{state.soraCharacterName}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    This character will be referenced by @name in the prompt. Sora handles the appearance.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Persona mode */}
          {state.characterMode === "persona" && (
            <div className="space-y-2">
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
                className="w-full text-xs bg-card border border-border rounded-md px-2 py-1.5 text-foreground"
              >
                <option value="">Select a persona...</option>
                {archetypes.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Character detail fields — shown for Persona and Custom modes */}
          {state.characterMode !== "sora-character" && (
            <>
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
            </>
          )}
        </div>

        {/* Appearance — hidden in Sora Character mode */}
        {state.characterMode !== "sora-character" && (
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
        )}

        {/* Emotional Tone */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Emotional Tone
          </label>
          <Input
            value={state.emotionalTone}
            onChange={(e) => setField("emotionalTone", e.target.value)}
            placeholder="e.g. confident, frustrated, raw, spiritual"
            className="text-xs h-8"
          />
        </div>

        {/* Product Reference */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Product Reference
          </label>

          {/* Product mode toggle */}
          <div className="flex gap-1.5">
            {([
              { value: "saved" as const, label: "Saved Product" },
              { value: "upload" as const, label: "Upload" },
            ]).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setProductMode(value)}
                className={cn(
                  "flex-1 rounded-md border py-1 text-[10px] font-medium transition-all",
                  productMode === value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-foreground/30"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Saved Product selector */}
          {productMode === "saved" && (
            <div className="space-y-2">
              <select
                onChange={(e) => {
                  const prod = savedProducts.find((p) => p.id === e.target.value);
                  if (prod) {
                    dispatch({ type: "SET_FIELD", field: "productImageUrl", value: prod.imageUrl || "" });
                    dispatch({ type: "SET_FIELD", field: "productImagePreview", value: prod.imageUrl || "" });
                  }
                }}
                className="w-full text-xs bg-card border border-border rounded-md px-2 py-1.5 text-foreground"
              >
                <option value="">Select a product...</option>
                {savedProducts.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {savedProducts.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  No products saved yet. Go to the Products page to add one.
                </p>
              )}
              {state.productImagePreview && (
                <div className="relative">
                  <img src={state.productImagePreview} alt="Product" className="w-full h-28 object-contain rounded-lg border border-border bg-card" />
                  <button
                    onClick={() => {
                      dispatch({ type: "SET_FIELD", field: "productImagePreview", value: "" });
                      dispatch({ type: "SET_FIELD", field: "productImageUrl", value: "" });
                    }}
                    className="absolute top-1 right-1 p-1 rounded-full bg-background/80 hover:bg-background"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Upload mode */}
          {productMode === "upload" && (
            <>
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
                  {!uploading && state.productImageUrl && (
                    <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-green-600/80 text-[10px] text-white">
                      Uploaded
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
                  <UploadIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Drop image or click</span>
                </div>
              )}
            </>
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

        {/* Generate Script Button */}
        <Button
          onClick={onGenerate}
          disabled={isGenerating || uploading || !scenesValid}
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
      </div>
    </div>
  );
}
