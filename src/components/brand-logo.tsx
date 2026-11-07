import Image from "next/image";
import { cn } from "@/lib/utils";
import { brand } from "@/config/brand";

type Variant = "icon" | "wordmark";

type Props = {
  variant?: Variant;
  /** Height in px. Width auto-scales to preserve aspect ratio. */
  size?: number;
  className?: string;
  priority?: boolean;
};

const SOURCES: Record<Variant, { light: string; dark: string; ratio: number }> = {
  // Brand kit files (public/brand, synced by `pnpm brand:sync`). "light" is
  // the version for light backgrounds. Ratios come from each SVG's viewBox.
  icon: {
    light: "/brand/logo/valuo-mark-light.svg",
    dark: "/brand/logo/valuo-mark-dark.svg",
    ratio: 1,
  },
  wordmark: {
    light: "/brand/logo/valuo-wordmark-light.svg",
    dark: "/brand/logo/valuo-wordmark-dark.svg",
    ratio: 282 / 79.1,
  },
};

/**
 * Brand logo with automatic dark/light swap via Tailwind.
 * - `variant="icon"`: the "v." mark for tight spaces (sidebar collapsed, mobile header, empty states).
 * - `variant="wordmark"`: horizontal logo with text (auth pages, desktop sidebar).
 */
export function BrandLogo({ variant = "icon", size = 32, className, priority }: Props) {
  const src = SOURCES[variant];
  const width = Math.round(size * src.ratio);
  const alt = brand.name;
  // Width comes from the attribute: the brand SVGs only carry a viewBox, so
  // with width:auto they have no intrinsic size and collapse to 0.
  const imgClass = cn("h-auto", className);

  return (
    <>
      <Image
        src={src.light}
        alt={alt}
        width={width}
        height={size}
        priority={priority}
        className={cn(imgClass, "block dark:hidden")}
      />
      <Image
        src={src.dark}
        alt=""
        aria-hidden="true"
        width={width}
        height={size}
        priority={priority}
        className={cn(imgClass, "hidden dark:block")}
      />
    </>
  );
}
