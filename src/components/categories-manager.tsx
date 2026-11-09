"use client";

import { useState } from "react";
import { mutate as swrMutate } from "swr";
import { ChevronRight, Plus, Tags } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ListRow, ListRowSkeleton } from "@/components/ui/list-row";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

/**
 * Categorías (plan 1.10b, no design: the `Movimientos` list and the
 * sheet for create/edit). Each row opens its sheet; delete lives there.
 */
export function CategoriesManager({ help }: { help?: React.ReactNode }) {
  const { data: categories, isLoading } = useCategories();
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const all = categories ?? [];
  const childCount = (id: string) => all.filter((c) => c.parentId === id).length;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-4">
      <PageHeader
        title="Categorías"
        description="Ordená tus gastos. Las comparte todo el espacio."
        className="mb-0"
        action={
          <div className="flex items-center gap-2">
            {help}
            <Button size="icon" aria-label="Nueva categoría" onClick={() => setCreating(true)}>
              <Plus aria-hidden strokeWidth={2} />
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <Card className="py-1">
          <CardContent>
            {[0, 1, 2].map((i) => (
              <ListRowSkeleton key={i} />
            ))}
          </CardContent>
        </Card>
      ) : all.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Todavía no tenés categorías"
          description="Creá una para ordenar tus gastos."
          action={
            <Button variant="outline" onClick={() => setCreating(true)}>
              Crear categoría
            </Button>
          }
        />
      ) : (
        <Card className="py-1">
          <CardContent>
            <ul className="divide-y divide-border">
              {categoryTree(all).map(({ category: cat, depth }) => {
                const kids = depth === 0 ? childCount(cat.id) : 0;
                return (
                  <li key={cat.id} data-depth={depth} className={cn(depth === 1 && "pl-8")}>
                    <ListRow
                      onClick={() => setEditing(cat)}
                      aria-label={`Editar ${cat.name}`}
                      leading={<CategoryIcon icon={cat.icon} size={depth === 1 ? 32 : 40} />}
                      title={cat.name}
                      subtitle={kids > 0 ? (kids === 1 ? "1 subcategoría" : `${kids} subcategorías`) : undefined}
                      trailing={<ChevronRight aria-hidden className="size-5 text-ink-muted" strokeWidth={1.75} />}
                    />
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {creating && (
        <CategorySheet categories={all} onOpenChange={setCreating} onDone={invalidateCategories} />
      )}
      {editing && (
        <CategorySheet
          key={editing.id}
          category={editing}
          categories={all}
          onOpenChange={(v) => !v && setEditing(null)}
          onDone={invalidateCategories}
        />
      )}
    </div>
  );
}

const TOP_LEVEL = "";

function CategorySheet({
  category,
  categories,
  onOpenChange,
  onDone,
}: {
  category?: Category;
  categories: Category[];
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState<CategoryIconKey>(categoryIconKey(category?.icon));
  const [color, setColor] = useState(category?.color ?? PRESET_COLORS[0]);
  const [parentId, setParentId] = useState(category?.parentId ?? TOP_LEVEL);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const parents = parentChoices(categories, category?.id);
  const hasChildren = !!category && categories.some((c) => c.parentId === category.id);
  const [err, setErr] = useState<string | null>(null);

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
      if (category) await patchCategory(category.id, input);
      else await createCategory(input);
      onDone();
      onOpenChange(false);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "No se pudo guardar");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!category) return;
    const ok = await confirm({
      title: "¿Eliminar esta categoría?",
      description: hasChildren
        ? "Sus subcategorías quedan como categorías comunes. Los gastos que la usan quedan sin categoría."
        : "Los gastos que la usan quedan sin categoría.",
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteCategory(category.id);
      onDone();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo eliminar");
      setDeleting(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{category ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
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
                    color === c && "ring-2 ring-ink ring-offset-2 ring-offset-popover",
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
                    !PRESET_COLORS.includes(color) && "border-solid border-ink ring-2 ring-ink ring-offset-2 ring-offset-popover",
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
            <p role="alert" className="rounded-lg bg-negative-soft px-3 py-2 text-caption text-negative">
              {err}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={!name.trim() || saving}>
            {saving ? "Guardando…" : category ? "Guardar" : "Crear categoría"}
          </Button>
          {category && (
            <Button
              type="button"
              variant="ghost"
              className="self-center text-negative hover:bg-negative-soft hover:text-negative"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Eliminando…" : "Eliminar categoría"}
            </Button>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
