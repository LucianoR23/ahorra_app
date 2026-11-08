// Subcategories (plan 1.4): one level deep, Servicios > Luz.

type Node = { id: string; name: string; parentId?: string | null };

export type CategoryRow<T extends Node> = { category: T; depth: 0 | 1 };

const byName = <T extends Node>(a: T, b: T) => a.name.localeCompare(b.name, "es", { sensitivity: "base" });

/**
 * Categories in display order: each top-level one by name, followed by its
 * subcategories by name. A subcategory whose parent is missing shows as
 * top-level.
 */
export function categoryTree<T extends Node>(categories: readonly T[] | undefined): CategoryRow<T>[] {
  const all = categories ?? [];
  const ids = new Set(all.map((c) => c.id));
  const isChild = (c: T) => !!c.parentId && ids.has(c.parentId);
  const children = new Map<string, T[]>();
  for (const c of all) {
    if (!isChild(c)) continue;
    const list = children.get(c.parentId!) ?? [];
    list.push(c);
    children.set(c.parentId!, list);
  }
  const rows: CategoryRow<T>[] = [];
  for (const top of all.filter((c) => !isChild(c)).sort(byName)) {
    rows.push({ category: top, depth: 0 });
    for (const child of (children.get(top.id) ?? []).sort(byName)) rows.push({ category: child, depth: 1 });
  }
  return rows;
}

/**
 * Categories that can be the parent of `self` (or of a new category): top-level
 * ones other than itself. Empty when `self` has subcategories, since it can't
 * become one.
 */
export function parentChoices<T extends Node>(categories: readonly T[] | undefined, selfId?: string): T[] {
  const all = categories ?? [];
  if (selfId && all.some((c) => c.parentId === selfId)) return [];
  return all.filter((c) => !c.parentId && c.id !== selfId).sort(byName);
}
