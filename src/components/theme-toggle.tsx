"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { flushSync } from "react-dom";
import type { MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { useIsClient } from "@/lib/hooks";

type ViewTransitionDocument = Document & {
  startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> };
};

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const mounted = useIsClient();

  const isDark = mounted && theme === "dark";

  const handleToggle = (event: MouseEvent<HTMLButtonElement>) => {
    const next = isDark ? "light" : "dark";
    const doc = document as ViewTransitionDocument;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!doc.startViewTransition || reducedMotion) {
      setTheme(next);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    // If the click came from a pointer, use its coords; for keyboard activations
    // (clientX/Y are 0), fall back to the button's center.
    const x = event.clientX || rect.left + rect.width / 2;
    const y = event.clientY || rect.top + rect.height / 2;
    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    document.documentElement.dataset.themeTransition = "";
    const transition = doc.startViewTransition(() => {
      flushSync(() => setTheme(next));
    });

    transition.ready.then(() => {
      const clipFrom = `circle(0px at ${x}px ${y}px)`;
      const clipTo = `circle(${maxRadius}px at ${x}px ${y}px)`;
      document.documentElement.animate(
        { clipPath: [clipFrom, clipTo] },
        {
          duration: 1000,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    });

    transition.finished.finally(() => {
      delete document.documentElement.dataset.themeTransition;
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      onClick={handleToggle}
      className={className}
    >
      {mounted ? (isDark ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />) : <span className="size-4.5" />}
    </Button>
  );
}
