"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { SoraCharacter } from "@/lib/types";

export default function CharactersPage() {
  const [characters, setCharacters] = useState<SoraCharacter[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const fetchCharacters = async () => {
    const res = await fetch("/api/sora-characters");
    if (res.ok) setCharacters(await res.json());
  };

  useEffect(() => { fetchCharacters(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", description: "" });
    setIsDialogOpen(true);
  };

  const openEdit = (char: SoraCharacter) => {
    setEditingId(char.id);
    setForm({ name: char.name, description: char.description || "" });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;

    if (editingId) {
      await fetch(`/api/sora-characters/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/sora-characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }

    setIsDialogOpen(false);
    fetchCharacters();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this character?")) return;
    await fetch(`/api/sora-characters/${id}`, { method: "DELETE" });
    fetchCharacters();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Sora Characters</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Saved characters from Sora. Select one in the Studio to reference it as @name in the prompt.
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Character
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {characters.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No Sora characters saved yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add characters you&apos;ve saved in Sora to reuse them across video generations.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {characters.map((char) => (
              <div
                key={char.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">@{char.name}</span>
                  </div>
                  {char.description && (
                    <p className="text-xs text-muted-foreground mt-1">{char.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(char)} className="p-1.5 rounded hover:bg-accent">
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => handleDelete(char.id)} className="p-1.5 rounded hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Character" : "Add Sora Character"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Character Name (as saved in Sora)
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Sarah Kitchen"
                className="mt-1"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                This will be referenced as @{form.name || "name"} in the video prompt.
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Description (optional)
              </label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Notes about this character..."
                className="mt-1 min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>
              {editingId ? "Save" : "Add Character"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
