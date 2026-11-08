"use client"

import type { LucideIcon } from "lucide-react"

import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

/**
 * A whole-row checkbox for picking several options (design "Onboarding",
 * "¿Cómo pagás?"). The row is the label, so tapping anywhere toggles it.
 */
function CheckCard({
  checked,
  onCheckedChange,
  icon: Icon,
  label,
  description,
  className,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  icon?: LucideIcon
  label: string
  description?: string
  className?: string
}) {
  return (
    <label
      data-slot="check-card"
      data-checked={checked ? "" : undefined}
      className={cn(
        "flex min-h-15 cursor-pointer items-center gap-3.5 rounded-xl border border-border bg-surface px-4 py-3 transition-colors duration-(--duration-fast)",
        "hover:border-border-strong data-checked:border-ink data-checked:ring-1 data-checked:ring-ink",
        "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus",
        className
      )}
    >
      {Icon ? <Icon aria-hidden className="size-5.5 shrink-0" strokeWidth={1.75} /> : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("text-body text-ink", checked ? "font-bold" : "font-semibold")}>{label}</span>
        {description ? <span className="text-caption text-ink-muted">{description}</span> : null}
      </span>
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        className="size-6 focus-visible:outline-none"
      />
    </label>
  )
}

export { CheckCard }
