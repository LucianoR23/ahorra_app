"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Rate } from "@/lib/api/schemas";
import { RATE_SOURCES, rateFor, rateSourceLabel } from "@/lib/fx";
import { useFormatAmount } from "@/stores/discreet";

/**
 * Which dollar a movement or a household converts with (plan 5.1). Closed
 * it shows the name ("MEP"); each option shows its price for `currency`
 * ("MEP · $ 1.588"), and sources without one are still listed.
 */
export function RateSourceSelect({
  id,
  value,
  onValueChange,
  rates,
  currency = "USD",
  className,
  "aria-invalid": ariaInvalid,
}: {
  id?: string;
  value: string;
  onValueChange: (v: string) => void;
  rates: Rate[] | undefined;
  currency?: string;
  className?: string;
  "aria-invalid"?: boolean;
}) {
  const formatAmount = useFormatAmount();
  const label = (source: string) => {
    const price = rateFor(rates, currency, source);
    return price === null ? rateSourceLabel(source) : `${rateSourceLabel(source)} · ${formatAmount(price, "ARS")}`;
  };
  return (
    <Select value={value} onValueChange={(v) => v && onValueChange(v)}>
      <SelectTrigger id={id} aria-invalid={ariaInvalid} className={className}>
        {/* Closed, just the name: it fits the row, and the preview line already says the amount. */}
        <SelectValue>{(v: string | null) => (v ? rateSourceLabel(v) : "Elegí")}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {RATE_SOURCES.map((s) => (
          <SelectItem key={s.value} value={s.value}>
            {label(s.value)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
