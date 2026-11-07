"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { CATEGORY_ICONS, type CategoryIconKey } from "@/lib/category-icons";
import { cn } from "@/lib/utils";

const KEYS = Object.keys(CATEGORY_ICONS) as CategoryIconKey[];

/** Grid of Lucide icons to pick a category's icon (one is always chosen). */
export function CategoryIconPicker({
  value,
  onValueChange,
  className,
  ...props
}: {
  value: CategoryIconKey;
  onValueChange: (value: CategoryIconKey) => void;
  className?: string;
  "aria-labelledby"?: string;
}) {
  return (
    <RadioGroup<CategoryIconKey>
      value={value}
      onValueChange={(next) => onValueChange(next)}
      className={cn("grid grid-cols-6 gap-1.5", className)}
      {...props}
    >
      {KEYS.map((key) => {
        const { icon: Icon, label } = CATEGORY_ICONS[key];
        return (
          <Radio.Root
            key={key}
            value={key}
            aria-label={label}
            title={label}
            className={cn(
              "grid aspect-square min-h-11 cursor-pointer place-items-center rounded-lg text-ink-muted outline-none",
              "transition-colors duration-(--duration-fast) hover:bg-surface-2 hover:text-ink",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
              "data-checked:bg-primary data-checked:text-primary-foreground",
            )}
          >
            <Icon aria-hidden className="size-5" strokeWidth={1.75} />
          </Radio.Root>
        );
      })}
    </RadioGroup>
  );
}
