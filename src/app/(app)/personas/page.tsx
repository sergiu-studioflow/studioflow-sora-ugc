"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Archetype } from "@/lib/types";

type PersonaForm = {
  name: string;
  ageRange: string;
  gender: string;
  profile: string;
  defaultMakeup: string;
  defaultExpression: string;
  defaultHair: string;
  defaultClothing: string;
};

const emptyForm: PersonaForm = {
  name: "", ageRange: "", gender: "", profile: "",
  defaultMakeup: "", defaultExpression: "", defaultHair: "", defaultClothing: "",
};

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Archetype[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PersonaForm>(emptyForm);

  const fetchPersonas = async () => {
    const res = await fetch("/api/personas");
    if (res.ok) setPersonas(await res.json());
  };

  useEffect(() => { fetchPersonas(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsDialogOpen(true);
  };

  const openEdit = (p: Archetype) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      ageRange: p.ageRange,
      gender: p.gender,
      profile: p.profile,
      defaultMakeup: p.defaultMakeup || "",
      defaultExpression: p.defaultExpression || "",
      defaultHair: p.defaultHair || "",
      defaultClothing: p.defaultClothing || "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;

    if (editingId) {
      await fetch(`/api/personas/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }

    setIsDialogOpen(false);
    fetchPersonas();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this persona?")) return;
    await fetch(`/api/personas/${id}`, { method: "DELETE" });
    fetchPersonas();
  };

  const setField = (field: keyof PersonaForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Personas</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Character presets that auto-fill the Studio form. Edit existing ones or create new personas.
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Persona
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {personas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <UserCircle className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No personas yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {personas.map((p) => (
              <div
                key={p.id}
                className="rounded-lg border border-border bg-card p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{p.name}</span>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => openEdit(p)} className="p-1 rounded hover:bg-accent">
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-1 rounded hover:bg-destructive/10">
                      <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {p.ageRange && <div>{p.ageRange} / {p.gender}</div>}
                  {p.profile && <div className="line-clamp-2">{p.profile}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Persona" : "Create Persona"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <Input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="e.g. Wellness Mom" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Age Range</label>
                <Input value={form.ageRange} onChange={(e) => setField("ageRange", e.target.value)} placeholder="25-34" className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Gender</label>
                <Input value={form.gender} onChange={(e) => setField("gender", e.target.value)} placeholder="Female" className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Profile</label>
              <Input value={form.profile} onChange={(e) => setField("profile", e.target.value)} placeholder="busy mum of young kids" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Default Makeup</label>
              <Input value={form.defaultMakeup} onChange={(e) => setField("defaultMakeup", e.target.value)} placeholder="natural makeup" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Default Expression</label>
              <Input value={form.defaultExpression} onChange={(e) => setField("defaultExpression", e.target.value)} placeholder="warm, genuine smile" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Default Hair</label>
              <Input value={form.defaultHair} onChange={(e) => setField("defaultHair", e.target.value)} placeholder="hair tied up casually" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Default Clothing</label>
              <Input value={form.defaultClothing} onChange={(e) => setField("defaultClothing", e.target.value)} placeholder="comfortable home clothing" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>
              {editingId ? "Save" : "Create Persona"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
