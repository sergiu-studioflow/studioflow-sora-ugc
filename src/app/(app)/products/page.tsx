"use client";

import { useEffect, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Plus, Trash2, Pencil, Package, Upload as UploadIcon } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", imageUrl: "" });
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState("");

  const fetchProducts = async () => {
    const res = await fetch("/api/products");
    if (res.ok) setProducts(await res.json());
  };

  useEffect(() => { fetchProducts(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", description: "", imageUrl: "" });
    setImagePreview("");
    setIsDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({ name: p.name, description: p.description || "", imageUrl: p.imageUrl || "" });
    setImagePreview(p.imageUrl || "");
    setIsDialogOpen(true);
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    setImagePreview(URL.createObjectURL(file));
    try {
      const blob = await upload(`products/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });
      setForm((prev) => ({ ...prev, imageUrl: blob.url }));
    } catch (err) {
      console.error("[upload]", err);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;

    if (editingId) {
      await fetch(`/api/products/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }

    setIsDialogOpen(false);
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    fetchProducts();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Products</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Save products with reference images. Select one in the Studio to auto-load the product image.
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Product
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Package className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No products saved yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add products with reference images to speed up your video generation workflow.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => (
              <div
                key={p.id}
                className="rounded-lg border border-border bg-card overflow-hidden"
              >
                {p.imageUrl ? (
                  <div className="h-36 bg-black">
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="h-36 bg-muted flex items-center justify-center">
                    <Package className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                )}
                <div className="p-3">
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
                  {p.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Product Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Teeth Whitening Powder"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Description / Notes</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Product details, packaging notes, special instructions..."
                className="mt-1 min-h-[80px]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Reference Image</label>
              {imagePreview ? (
                <div className="mt-1 relative">
                  <img src={imagePreview} alt="Preview" className="w-full h-32 object-contain rounded-lg border border-border bg-card" />
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  )}
                  <button
                    onClick={() => { setImagePreview(""); setForm({ ...form, imageUrl: "" }); }}
                    className="absolute top-1 right-1 p-1 rounded-full bg-background/80 hover:bg-background"
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <div
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
                    "mt-1 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors",
                    "border-border hover:border-muted-foreground"
                  )}
                >
                  <UploadIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Click to upload reference image</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name.trim() || uploading}>
              {editingId ? "Save" : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
