"use client"

import { Radio } from "@base-ui/react/radio"
import { RadioGroup } from "@base-ui/react/radio-group"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export type SegmentedOption<V extends string> = {
  value: V
  label: string
  icon?: LucideIcon
}

/**
 * One choice out of a few, as a pill track (design "Componentes" →
 * Selección). It is a radio group: arrow keys move, one is always chosen.
 * For switching views of the same screen use Tabs instead.
 */
function Segmented<V extends string>({
  value,
  onValueChange,
  options,
  className,
  ...props
}: {
  value: V
  onValueChange: (value: V) => void
  options: readonly SegmentedOption<V>[]
  className?: string
  "aria-label"?: string
  "aria-labelledby"?: string
}) {
  return (
    <RadioGroup<V>
      data-slot="segmented"
      value={value}
      onValueChange={(next) => onValueChange(next)}
      className={cn("flex w-full gap-1 rounded-full bg-surface-2 p-1", className)}
      {...props}
    >
      {options.map(({ value: optionValue, label, icon: Icon }) => (
        <Radio.Root
          key={optionValue}
          value={optionValue}
          data-slot="segmented-option"
          className={cn(
            "flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full px-3 text-caption font-semibold text-ink-muted outline-none",
            "transition-colors duration-(--duration-fast) hover:text-ink",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
            "data-checked:bg-surface data-checked:text-ink data-checked:shadow-card",
            "data-disabled:pointer-events-none data-disabled:opacity-50",
          )}
        >
          {Icon ? <Icon aria-hidden className="size-4" strokeWidth={1.75} /> : null}
          {label}
        </Radio.Root>
      ))}
    </RadioGroup>
  )
}

export { Segmented }
