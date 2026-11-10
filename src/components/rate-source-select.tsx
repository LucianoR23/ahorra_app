"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Rate } from "@/lib/api/schemas";
import { RATE_SOURCES, rateFor, rateSourceLabel } from "@/lib/fx";
import { useFormatAmount } from "@/stores/discreet";

/**
 * Which dollar a movement or a household converts with (plan 5.1): "MEP ·
 * $ 1.588". With `currency`, each option shows its price for it; sources
 * without one are still listed (the API may price them by then).
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
        <SelectValue>{(v: string | null) => (v ? label(v) : "Elegí")}</SelectValue>
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
