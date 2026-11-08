"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { categoryTree } from "@/lib/categories";
import { cn } from "@/lib/utils";

type CategoryOption = { id: string; name: string; parentId?: string | null };

/**
 * Category picker: each category followed by its subcategories, indented
 * (plan 1.4). The empty value means "none" and shows `emptyLabel`.
 */
export function CategorySelect({
  value,
  onValueChange,
  categories,
  emptyLabel,
  id,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  onValueChange: (value: string) => void;
  categories: readonly CategoryOption[] | undefined;
  emptyLabel: string;
  id?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const rows = categoryTree(categories);
  const nameOf = (v: string | null) => (v ? (categories?.find((c) => c.id === v)?.name ?? emptyLabel) : emptyLabel);
  return (
    <Select value={value} onValueChange={(v) => onValueChange(v ?? "")}>
      <SelectTrigger id={id} aria-label={ariaLabel} className={className}>
        <SelectValue placeholder={emptyLabel}>{nameOf}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">{emptyLabel}</SelectItem>
        {rows.map(({ category, depth }) => (
          <SelectItem key={category.id} value={category.id} className={cn(depth === 1 && "pl-11 text-ink-muted")}>
            {category.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
