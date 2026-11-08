"use client";

import { useState } from "react";
import { mutate as swrMutate } from "swr";
import { Plus, Trash2, Pencil, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { useCategories } from "@/lib/api/hooks";
import { createCategory, patchCategory, deleteCategory, type CategoryInput } from "@/lib/api/mutations";
import type { Category } from "@/lib/api/schemas";
import { ApiError } from "@/lib/api/errors";
import { toast } from "@/lib/toast";
import { confirm } from "@/lib/confirm";
import { cn } from "@/lib/utils";
import { ColorPicker } from "@/components/ui/color-picker";
import { CategoryIcon } from "@/components/category-icon";
import { CategoryIconPicker } from "@/components/category-icon-picker";
import { categoryIconKey, type CategoryIconKey } from "@/lib/category-icons";
import { categoryTree, parentChoices } from "@/lib/categories";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
  "#64748b", "#14b8a6",
];

function invalidateCategories() {
  swrMutate(
    (k) => Array.isArray(k) && typeof k[0] === "string" && k[0].startsWith("/categories"),
    undefined,
    { revalidate: true },
  );
}

export function CategoriesManager() {
  const { data: categories, isLoading } = useCategories();
  const [editing, setEditing] = useState<Category | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {categories ? `${categories.length} categoría${categories.length === 1 ? "" : "s"}` : ""}
        </p>
        <CategoryFormDialog mode="create" categories={categories ?? []} onDone={invalidateCategories} />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-2xl" />)}
        </div>
      ) : !categories?.length ? (
        <Card className="rounded-2xl border-0 shadow-card">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No hay categorías. Creá una para organizar tus gastos.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {categoryTree(categories).map(({ category: cat, depth }) => (
            <Card
              key={cat.id}
              data-depth={depth}
              className={cn("rounded-2xl border-0 shadow-card", depth === 1 && "ml-8")}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <CategoryIcon icon={cat.icon} size={depth === 1 ? 32 : 40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{cat.name}</p>
                </div>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Editar ${cat.name}`}
                  onClick={() => setEditing(cat)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <DeleteCategoryButton
                  id={cat.id}
                  name={cat.name}
                  hasChildren={categories.some((c) => c.parentId === cat.id)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <CategoryFormDialog
          mode="edit"
          category={editing}
          categories={categories ?? []}
          open
          onOpenChange={(v) => !v && setEditing(null)}
          onDone={() => { invalidateCategories(); setEditing(null); }}
        />
      )}
    </div>
  );
}

function DeleteCategoryButton({ id, name, hasChildren }: { id: string; name: string; hasChildren: boolean }) {
  const [busy, setBusy] = useState(false);
  async function handle() {
    const ok = await confirm({
      title: "¿Eliminar esta categoría?",
      description: hasChildren
        ? "Sus subcategorías quedan como categorías comunes. Los gastos que usan esta categoría quedarán sin categoría."
        : "Los gastos que la usan quedarán sin categoría.",
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await deleteCategory(id);
      invalidateCategories();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Error al eliminar");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button size="icon-sm" variant="ghost" aria-label={`Eliminar ${name}`} onClick={handle} disabled={busy}>
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
    </Button>
  );
}

const TOP_LEVEL = "";

function CategoryFormDialog({
  mode,
  category,
  categories,
  open: controlledOpen,
  onOpenChange,
  onDone,
}: {
  mode: "create" | "edit";
  category?: Category;
  categories: Category[];
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  onDone: () => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState<CategoryIconKey>(categoryIconKey(category?.icon));
  const [color, setColor] = useState(category?.color ?? PRESET_COLORS[0]);
  const [parentId, setParentId] = useState(category?.parentId ?? TOP_LEVEL);
  const [saving, setSaving] = useState(false);
  const parents = parentChoices(categories, category?.id);
  const hasChildren = !!category && categories.some((c) => c.parentId === category.id);
  const [err, setErr] = useState<string | null>(null);

  function resetForm() {
    setName(category?.name ?? "");
    setIcon(categoryIconKey(category?.icon));
    setColor(category?.color ?? PRESET_COLORS[0]);
    setParentId(category?.parentId ?? TOP_LEVEL);
    setErr(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setErr(null);
    setSaving(true);
    const input: CategoryInput = {
      name: name.trim(),
      icon,
      color: color || null,
      parentId: parentId || null,
    };
    try {
      if (mode === "create") {
        await createCategory(input);
      } else if (category) {
        await patchCategory(category.id, input);
      }
      onDone();
      setOpen(false);
      if (mode === "create") resetForm();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => { setOpen(v); if (!v) setErr(null); }}
    >
      {mode === "create" && (
        <DialogTrigger render={<Button size="sm" onClick={resetForm} />}>
          <Plus className="mr-1 size-3.5" />
          Nueva categoría
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nueva categoría" : "Editar categoría"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <Label htmlFor="cat-name">Nombre</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Comida"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="cat-parent">Dentro de</Label>
            {hasChildren ? (
              <p className="mt-1.5 text-caption text-ink-muted">
                Tiene subcategorías, así que no puede ir dentro de otra categoría.
              </p>
            ) : (
              <Select value={parentId} onValueChange={(v) => setParentId(v ?? TOP_LEVEL)}>
                <SelectTrigger id="cat-parent" className="mt-1.5 w-full">
                  <SelectValue placeholder="Ninguna (es principal)">
                    {(v: string | null) => (v ? (parents.find((c) => c.id === v)?.name ?? "Ninguna (es principal)") : "Ninguna (es principal)")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TOP_LEVEL}>Ninguna (es principal)</SelectItem>
                  {parents.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <Label id="cat-icon-label">Ícono</Label>
            <CategoryIconPicker
              aria-labelledby="cat-icon-label"
              value={icon}
              onValueChange={setIcon}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>Color</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "size-7 cursor-pointer rounded-full transition-all",
                    color === c && "ring-2 ring-foreground ring-offset-2",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
              <PopoverPrimitive.Root>
                <PopoverPrimitive.Trigger
                  type="button"
                  title="Color personalizado"
                  className={cn(
                    "flex size-7 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-border transition-all hover:border-foreground/40",
                    !PRESET_COLORS.includes(color) && "border-solid border-foreground ring-2 ring-foreground ring-offset-2",
                  )}
                  style={!PRESET_COLORS.includes(color) ? { backgroundColor: color } : undefined}
                >
                  {PRESET_COLORS.includes(color) && (
                    <Plus className="size-3 text-muted-foreground" />
                  )}
                </PopoverPrimitive.Trigger>
                <PopoverPrimitive.Portal>
                  <PopoverPrimitive.Positioner className="isolate z-60 outline-none" sideOffset={6} align="start">
                    <PopoverPrimitive.Popup className="rounded-xl bg-popover shadow-md ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 duration-100 origin-(--transform-origin)">
                      <ColorPicker value={color} onChange={setColor} />
                    </PopoverPrimitive.Popup>
                  </PopoverPrimitive.Positioner>
                </PopoverPrimitive.Portal>
              </PopoverPrimitive.Root>
            </div>
          </div>

          {err && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {err}
            </div>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" />}>Cancelar</DialogClose>
            <Button type="submit" disabled={!name.trim() || saving}>
              {saving && <Loader2 className="mr-1 size-3.5 animate-spin" />}
              {mode === "create" ? "Crear" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
