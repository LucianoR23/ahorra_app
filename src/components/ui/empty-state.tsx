import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * One empty state for every list (design "Estado vacío"): icon, title, a
 * hint and at most one action. With filters, say so and offer to clear them.
 */
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div data-slot="empty-state" className={cn("flex flex-col items-center gap-2 px-4 py-8 text-center", className)}>
      <div className="mb-1 grid size-14 place-items-center rounded-full bg-surface-2 text-ink">
        <Icon aria-hidden className="size-6" strokeWidth={1.75} />
      </div>
      <p className="text-heading text-ink">{title}</p>
      {description ? <p className="max-w-xs text-caption text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}

export { EmptyState }
