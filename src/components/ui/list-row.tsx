import Link from "next/link"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const rowClass =
  "flex min-h-16 w-full items-center gap-3 py-3 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"

/**
 * A movement-like row (design "Filas de lista"): leading icon, title,
 * subtitle and a trailing amount. With `href` the whole row is a link.
 * Rows in a list are separated by the list (divide-y), not by the row.
 */
function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  href,
  className,
}: {
  leading?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  trailing?: React.ReactNode
  href?: string
  className?: string
}) {
  const content = (
    <>
      {leading}
      <div className="min-w-0 flex-1">
        <div className="truncate text-body font-semibold text-ink">{title}</div>
        {subtitle ? <div className="mt-0.5 truncate text-caption text-ink-muted">{subtitle}</div> : null}
      </div>
      {trailing ? <div className="shrink-0 text-right text-body font-semibold text-ink">{trailing}</div> : null}
    </>
  )
  if (href) {
    return (
      <Link data-slot="list-row" href={href} className={cn(rowClass, "rounded-sm", className)}>
        {content}
      </Link>
    )
  }
  return (
    <div data-slot="list-row" className={cn(rowClass, className)}>
      {content}
    </div>
  )
}

function ListRowSkeleton({ className }: { className?: string }) {
  return (
    <div data-slot="list-row-skeleton" aria-hidden className={cn(rowClass, className)}>
      <Skeleton className="size-10 rounded-full" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-3.5 w-2/5 rounded-full" />
        <Skeleton className="h-3 w-1/4 rounded-full" />
      </div>
      <Skeleton className="h-3.5 w-16 rounded-full" />
    </div>
  )
}

/**
 * Installment progress, "3 de 12" with the pill bar: one pill per
 * installment up to 12; with more, each pill stands for a share of them.
 */
function InstallmentBar({ current, total, className }: { current: number; total: number; className?: string }) {
  const pills = Math.min(total, 12)
  const filled = total > 0 ? Math.round((Math.min(current, total) / total) * pills) : 0
  return (
    <span data-slot="installment-bar" className={cn("inline-flex items-center gap-2", className)}>
      <span aria-hidden className="inline-flex gap-0.5">
        {Array.from({ length: pills }, (_, i) => (
          <span key={i} className={cn("h-1.5 w-1.5 rounded-full", i < filled ? "bg-brand" : "bg-border")} />
        ))}
      </span>
      <span>
        {current} de {total}
      </span>
    </span>
  )
}

export { ListRow, ListRowSkeleton, InstallmentBar }
