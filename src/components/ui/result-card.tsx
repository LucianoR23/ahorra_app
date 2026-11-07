import { Check, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Outcome of a flow (email sent, password changed, invite accepted). Auth
 * and result screens use it (design "Avisos y resultado").
 */
function ResultCard({
  icon: Icon = Check,
  tone = "positive",
  title,
  description,
  children,
  className,
}: {
  icon?: LucideIcon
  tone?: "positive" | "negative" | "neutral"
  title: string
  description?: React.ReactNode
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div data-slot="result-card" className={cn("flex flex-col items-center gap-2 text-center", className)}>
      <div
        className={cn(
          "mb-1 grid size-12 place-items-center rounded-full",
          tone === "positive" && "bg-positive/12 text-positive",
          tone === "negative" && "bg-negative-soft text-negative",
          tone === "neutral" && "bg-surface-2 text-ink"
        )}
      >
        <Icon aria-hidden className="size-6" strokeWidth={1.75} />
      </div>
      <h2 className="text-heading text-ink">{title}</h2>
      {description ? <p className="max-w-sm text-caption text-ink-muted">{description}</p> : null}
      {children ? <div className="mt-3 flex w-full flex-col gap-2">{children}</div> : null}
    </div>
  )
}

export { ResultCard }
