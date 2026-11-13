"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { fmtMonthLong, shiftMonth } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * Month picker with the month total under it (design "Encabezado de página
 * y mes"). `month` is YYYY-MM; `max` stops it from going past a month.
 */
function MonthNavigator({
  month,
  onMonthChange,
  summary,
  max,
  className,
}: {
  month: string
  onMonthChange: (month: string) => void
  summary?: React.ReactNode
  max?: string
  className?: string
}) {
  const atMax = max !== undefined && month >= max
  return (
    <div
      data-slot="month-navigator"
      className={cn("flex items-center gap-2 rounded-xl border border-border bg-surface p-1.5", className)}
    >
      <Button variant="ghost" size="icon" aria-label="Mes anterior" onClick={() => onMonthChange(shiftMonth(month, -1))}>
        <ChevronLeft aria-hidden strokeWidth={1.75} />
      </Button>
      <div className="min-w-0 flex-1 text-center" aria-live="polite">
        <p className="text-heading text-ink">{fmtMonthLong(month)}</p>
        {summary ? (
          <div data-slot="month-summary" className="text-caption text-ink-muted">
            {summary}
          </div>
        ) : null}
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Mes siguiente"
        disabled={atMax}
        className="disabled:bg-transparent"
        onClick={() => onMonthChange(shiftMonth(month, 1))}
      >
        <ChevronRight aria-hidden strokeWidth={1.75} />
      </Button>
    </div>
  )
}

export { MonthNavigator }
