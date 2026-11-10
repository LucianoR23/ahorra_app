"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mutate as swrMutate } from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { FormRow, rowControl } from "@/components/ui/form-row";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money } from "@/components/ui/money";
import { Segmented } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useExchangeRates, useHouseholdMembers, usePaymentMethods } from "@/lib/api/hooks";
import { RateSourceSelect } from "@/components/rate-source-select";
import { convert, rateSourceLabel, sourceOf } from "@/lib/fx";
import { ApiError } from "@/lib/api/errors";
import { createIncome, type IncomeCreateInput } from "@/lib/api/mutations";
import type { Currency } from "@/lib/api/schemas";
import { isoToday } from "@/lib/format";
import { INCOME_SOURCES, incomeSourceLabel } from "@/lib/labels";
import { useSpaces } from "@/lib/spaces";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

const CURRENCIES = [
  { value: "ARS", label: "ARS" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
] as const;

/**
 * Nuevo ingreso (plan 1.10b, no design: the `CargarGasto` pattern): the
 * amount big on top, the data as rows, "Guardar ingreso" pinned at the bottom.
 */
export function IncomeForm() {
  const router = useRouter();
  const { current } = useSpaces();
  const baseCurrency = (current?.baseCurrency ?? "ARS") as Currency;
  const me = useAuthStore((s) => s.user?.id);
  const { data: members } = useHouseholdMembers();
  const { data: paymentMethods } = usePaymentMethods();
  const { data: rates } = useExchangeRates();

  const [amountStr, setAmountStr] = useState("");
  const [currency, setCurrency] = useState<Currency>(baseCurrency);
  const [source, setSource] = useState("salary");
  const [custom, setCustom] = useState(false);
  const [description, setDescription] = useState("");
  const [receivedAt, setReceivedAt] = useState(isoToday());
  const [receivedBy, setReceivedBy] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const amount = Number(amountStr.replace(",", "."));
  const amountValid = amountStr !== "" && !isNaN(amount) && amount > 0;
  const others = members?.filter((m) => m.userId !== me) ?? [];

  // The dollar it converts with (plan 5.1): the space's unless picked here,
  // e.g. CCL for dollars sold that way.
  const [pickedSource, setPickedSource] = useState("");
  const rateSource = pickedSource || sourceOf(current?.fxSource);
  const ratePreview = currency === baseCurrency ? null : convert(rates, amountValid ? amount : 0, currency, baseCurrency, rateSource);
  const foreignCurrency = currency === baseCurrency ? null : currency === "ARS" ? baseCurrency : currency;

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!amountValid) e.amount = "Ingresá un monto mayor a 0";
    if (!source.trim()) e.source = "Contá de dónde viene";
    if (!receivedAt) e.receivedAt = "Elegí la fecha";
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const input: IncomeCreateInput = {
      amount,
      currency,
      source: source.trim(),
      receivedAt,
      description: description.trim() || undefined,
      receivedBy: receivedBy || undefined,
      paymentMethodId: paymentMethodId || undefined,
    };
    if (currency !== baseCurrency) input.rateSource = rateSource;

    setSubmitting(true);
    try {
      const inc = await createIncome(input);
      swrMutate(
        (k) =>
          Array.isArray(k) &&
          typeof k[0] === "string" &&
          (k[0].startsWith("/incomes") || k[0].startsWith("/totals") || k[0].startsWith("/reports")),
        undefined,
        { revalidate: true },
      );
      router.replace(`/ingresos/${inc.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.field) setErrors({ [err.field]: err.message });
        else setErrors({ form: err.message });
      } else {
        setErrors({ form: "Error inesperado" });
      }
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Label htmlFor="amount" className="sr-only">
            Monto
          </Label>
          <div className="flex min-w-0 flex-1 items-baseline gap-1 text-display font-bold text-positive">
            <span aria-hidden className={cn("shrink-0 whitespace-nowrap", !amountStr && "text-ink-muted")}>
              + {currency === "USD" ? "US$" : currency === "EUR" ? "€" : "$"}
            </span>
            <Input
              id="amount"
              inputMode="decimal"
              autoComplete="off"
              value={amountStr}
              placeholder="0"
              onChange={(e) => setAmountStr(e.target.value)}
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? "amount-error" : undefined}
              className="h-auto border-transparent bg-transparent px-1 text-display font-bold text-positive tabular-nums focus-visible:border-focus"
            />
          </div>
          <Segmented aria-label="Moneda" value={currency} onValueChange={(v) => setCurrency(v)} options={CURRENCIES} className="w-auto shrink-0" />
        </div>
        {errors.amount && (
          <p id="amount-error" className="text-caption text-negative">
            {errors.amount}
          </p>
        )}
        {ratePreview && (
          <p className="text-caption text-ink-muted">
            ≈ <Money amount={ratePreview.amountBase} currency={baseCurrency} /> al dólar {rateSourceLabel(rateSource)}. La
            cotización se fija al guardar.
          </p>
        )}
      </div>

      <Card className="py-1">
        <CardContent className="divide-y divide-border">
          {foreignCurrency && (
            <FormRow label="Cotización" htmlFor="rateSource" error={errors.rateSource}>
              <RateSourceSelect
                id="rateSource"
                value={rateSource}
                onValueChange={setPickedSource}
                rates={rates}
                currency={foreignCurrency}
                aria-invalid={!!errors.rateSource}
                className={rowControl}
              />
            </FormRow>
          )}

          <div className="flex flex-col py-2">
            <FormRow label="Fuente" htmlFor="source" error={errors.source} bare>
              <Select
                value={custom ? "other" : source}
                onValueChange={(v) => {
                  const next = v ?? "other";
                  setCustom(next === "other");
                  setSource(next === "other" ? "" : next);
                }}
              >
                <SelectTrigger id="source" className={rowControl}>
                  <SelectValue>{(v: string | null) => (v ? incomeSourceLabel(v) : "")}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {INCOME_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {incomeSourceLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>
            {custom && (
              <Input
                aria-label="Otra fuente"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Ej: alquiler"
                autoFocus
              />
            )}
          </div>

          <FormRow label="Descripción" htmlFor="description">
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opcional"
              className={cn(rowControl, "flex-1")}
            />
          </FormRow>

          <FormRow label="Fecha" error={errors.receivedAt}>
            <DatePicker value={receivedAt} onChange={setReceivedAt} className={rowControl} />
          </FormRow>

          {others.length > 0 && (
            <FormRow label="Lo recibió" htmlFor="receivedBy">
              <Select value={receivedBy} onValueChange={(v) => setReceivedBy(v ?? "")}>
                <SelectTrigger id="receivedBy" className={rowControl}>
                  <SelectValue placeholder="Vos">
                    {(v: string | null) => (v ? (others.find((m) => m.userId === v)?.firstName ?? "Vos") : "Vos")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Vos</SelectItem>
                  {others.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {m.firstName} {m.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>
          )}

          <FormRow label="Cuenta" htmlFor="paymentMethodId">
            <Select value={paymentMethodId} onValueChange={(v) => setPaymentMethodId(v ?? "")}>
              <SelectTrigger id="paymentMethodId" className={rowControl}>
                <SelectValue placeholder="Sin especificar">
                  {(v: string | null) => (v ? (paymentMethods?.find((p) => p.id === v)?.name ?? "Sin especificar") : "Sin especificar")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin especificar</SelectItem>
                {paymentMethods
                  ?.filter((p) => p.isActive && p.kind !== "credit")
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </FormRow>
        </CardContent>
      </Card>

      {errors.form && (
        <p role="alert" className="rounded-lg bg-negative-soft px-3 py-2 text-caption text-negative">
          {errors.form}
        </p>
      )}

      <div className="safe-bottom sticky bottom-0 -mx-4 border-t border-border bg-background px-4 pt-3 pb-4 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Guardando…" : "Guardar ingreso"}
        </Button>
      </div>
    </form>
  );
}
