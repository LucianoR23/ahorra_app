"use client"

import { formatAmount, maskedAmount, type MoneyCents } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useDiscreet } from "@/stores/discreet"

/**
 * Every amount on screen goes through here (design README §6): tabular
 * figures, `$ 128.450,50`, `US$`, "+" and positive color for incomes.
 * Discreet mode (plan 1.9) shows `$ ••••••` instead.
 */
function Money({
  amount,
  currency = "ARS",
  cents = "auto",
  income = false,
  compact = false,
  className,
}: {
  amount: number
  currency?: string
  cents?: MoneyCents
  income?: boolean
  compact?: boolean
  className?: string
}) {
  const hidden = useDiscreet()
  return (
    <span
      data-slot="money"
      aria-label={hidden ? "Monto oculto" : undefined}
      className={cn("tabular-nums whitespace-nowrap", income && !hidden && "text-positive", className)}
    >
      {hidden ? maskedAmount(currency) : formatAmount(amount, currency, { cents, income, compact })}
    </span>
  )
}

export { Money }
