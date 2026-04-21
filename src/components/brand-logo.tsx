import Image from "next/image";
import { cn } from "@/lib/utils";

type Variant = "icon" | "wordmark";

type Props = {
  variant?: Variant;
  /** Height in px. Width auto-scales to preserve aspect ratio. */
  size?: number;
  className?: string;
  priority?: boolean;
};

const SOURCES: Record<Variant, { light: string; dark: string; ratio: number }> = {
  icon: {
    light: "/svg/icon-light.svg",
    dark: "/svg/icon-dark.svg",
    ratio: 1,
  },
  wordmark: {
    light: "/svg/logo-horizontal-light.svg",
    dark: "/svg/logo-horizontal-dark.svg",
    ratio: 325 / 84,
  },
};

/**
 * Brand logo with automatic dark/light swap via Tailwind.
 * - `variant="icon"`: square mark for tight spaces (sidebar collapsed, mobile header, empty states).
 * - `variant="wordmark"`: horizontal logo with text (auth pages, desktop sidebar).
 */
export function BrandLogo({ variant = "icon", size = 32, className, priority }: Props) {
  const src = SOURCES[variant];
  const width = Math.round(size * src.ratio);
  const alt = "Ahorro";
  const imgClass = cn("h-auto w-auto", className);

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
