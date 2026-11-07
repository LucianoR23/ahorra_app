import { categoryIcon } from "@/lib/category-icons";
import { cn } from "@/lib/utils";

/**
 * A category's Lucide icon on a neutral tile. Category colors are not used
 * in lists (design README §5); `icon` is the stored value (key or old emoji).
 */
export function CategoryIcon({
  icon,
  size = 40,
  className,
}: {
  icon?: string | null;
  size?: number;
  className?: string;
}) {
  const { icon: Icon } = categoryIcon(icon);
  return (
    <div
      style={{ width: size, height: size }}
      className={cn("grid shrink-0 place-items-center rounded-full bg-surface-2 text-ink", className)}
      aria-hidden
    >
      <Icon style={{ width: size / 2, height: size / 2 }} strokeWidth={1.75} />
    </div>
  );
}
