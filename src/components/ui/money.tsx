import { formatAmount, type MoneyCents } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * Every amount on screen goes through here (design README §6): tabular
 * figures, `$ 128.450,50`, `US$`, "+" and positive color for incomes.
 * Discreet mode (plan 1.9) will mask it in this one place.
 */
function Money({
  amount,
  currency = "ARS",
  cents = "auto",
  income = false,
  className,
}: {
  amount: number
  currency?: string
  cents?: MoneyCents
  income?: boolean
  className?: string
}) {
  return (
    <span data-slot="money" className={cn("tabular-nums whitespace-nowrap", income && "text-positive", className)}>
      {formatAmount(amount, currency, { cents, income })}
    </span>
  )
}

export { Money }
