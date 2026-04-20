import { CATEGORIES } from "@/lib/mock";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

export function CategoryIcon({ cat, size = 40, className }: { cat: string; size?: number; className?: string }) {
  const spec = CATEGORIES.find((c) => c.id === cat) ?? CATEGORIES[0];
  const style = {
    width: size,
    height: size,
    fontSize: size * 0.5,
    "--cat-bg-light": `oklch(0.92 0.08 ${spec.hue})`,
    "--cat-bg-dark": `oklch(0.35 0.09 ${spec.hue})`,
  } as CSSProperties;
  return (
    <div
      style={style}
      className={cn(
        "grid shrink-0 place-items-center rounded-[12px]",
        "bg-[var(--cat-bg-light)] dark:bg-[var(--cat-bg-dark)]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
        className,
      )}
    >
      {spec.emoji}
    </div>
  );
}
