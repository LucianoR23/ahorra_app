"use client";

import { cn } from "@/lib/utils";

export const PROGRESS_STEPS = 4;

/**
 * One onboarding screen (design "Onboarding"): progress pills and "Saltar"
 * on top, a big title, the content, and the main action pinned at the bottom.
 */
export function StepLayout({
  progress,
  title,
  description,
  onSkip,
  skipLabel = "Saltar",
  footer,
  children,
}: {
  /** Steps done, 1 to PROGRESS_STEPS. */
  progress: number;
  title: string;
  description?: React.ReactNode;
  onSkip?: () => void;
  skipLabel?: string;
  footer?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-lg flex-col bg-background">
      <main className="flex flex-1 flex-col gap-6 px-5 pt-5">
        <div className="flex min-h-11 items-center justify-between">
          <div role="img" aria-label={`Paso ${progress} de ${PROGRESS_STEPS}`} className="flex gap-1.5">
            {Array.from({ length: PROGRESS_STEPS }, (_, i) => (
              <span
                key={i}
                className={cn("h-1.5 w-6 rounded-full", i < progress ? "bg-brand" : "bg-surface-2")}
              />
            ))}
          </div>
          {onSkip ? (
            <button
              type="button"
              onClick={onSkip}
              className="min-h-11 cursor-pointer rounded-sm px-2 text-caption font-semibold text-ink-muted outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
            >
              {skipLabel}
            </button>
          ) : null}
        </div>
        <div className="flex flex-col gap-2.5">
          <h1 className="text-[30px] leading-[1.1] font-extrabold tracking-[-0.025em] text-ink">{title}</h1>
          {description ? <p className="text-body text-ink-muted">{description}</p> : null}
        </div>
        {children}
      </main>
      {footer ? (
        <div className="sticky bottom-0 flex flex-col gap-2.5 bg-background px-5 pt-4 pb-7">{footer}</div>
      ) : null}
    </div>
  );
}

export function FooterNote({ children }: { children: React.ReactNode }) {
  return <p className="text-center text-caption text-ink-muted">{children}</p>;
}
