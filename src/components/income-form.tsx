"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mutate as swrMutate } from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  useHouseholdMembers,
  useHouseholds,
  usePaymentMethods,
  useExchangeRates,
} from "@/lib/api/hooks";
import { useHouseholdStore } from "@/stores/household";
import { createIncome, type IncomeCreateInput } from "@/lib/api/mutations";
import { ApiError } from "@/lib/api/errors";
import { fmtMoney, isoToday } from "@/lib/format";
import type { Currency } from "@/lib/api/schemas";
import { cn } from "@/lib/utils";

const CURRENCIES: Currency[] = ["ARS", "USD", "EUR"];
const selectClass =
  "h-9 w-full rounded-md border border-input bg-input/20 px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30";

const SOURCE_PRESETS = ["salario", "freelance", "venta", "regalo", "interes", "otro"];

export function IncomeForm({
  initial,
}: {
  initial?: {
    id: string;
    source: string;
    description?: string | null;
    receivedAt: string;
    amount: number;
    currency: string;
  };
}) {
  const router = useRouter();
  const currentHouseholdId = useHouseholdStore((s) => s.currentId);
  const { data: households } = useHouseholds();
  const household = households?.find((h) => h.id === currentHouseholdId) ?? households?.[0];
  const baseCurrency = (household?.baseCurrency ?? "ARS") as Currency;

  const { data: members } = useHouseholdMembers();
  const { data: paymentMethods } = usePaymentMethods();
  const { data: rates } = useExchangeRates();

  const [amountStr, setAmountStr] = useState(initial ? String(initial.amount) : "");
  const [currency, setCurrency] = useState<Currency>((initial?.currency as Currency) ?? baseCurrency);
  const [source, setSource] = useState(initial?.source ?? "salario");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [receivedAt, setReceivedAt] = useState(initial?.receivedAt ?? isoToday());
  const [receivedBy, setReceivedBy] = useState<string>("");
  const [paymentMethodId, setPaymentMethodId] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const amount = Number(amountStr.replace(",", "."));
  const amountValid = amountStr !== "" && !isNaN(amount) && amount > 0;

  const ratePreview = (() => {
    if (currency === baseCurrency || !rates) return null;
    const r =
      rates.find((x) => x.currency === currency && x.source === "blue") ??
      rates.find((x) => x.currency === currency);
    if (!r) return null;
    return { rate: r.rateAvg, amountBase: amountValid ? amount * r.rateAvg : 0 };
  })();

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!amountValid) e.amount = "Ingresá un monto mayor a 0";
    if (!source.trim()) e.source = "Requerido";
    if (!receivedAt) e.receivedAt = "Requerido";
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

    setSubmitting(true);
    try {
      const inc = await createIncome(input);
      swrMutate(
        (k) => Array.isArray(k) && typeof k[0] === "string" && (k[0].startsWith("/incomes") || k[0].startsWith("/totals") || k[0].startsWith("/reports")),
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
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Card className="rounded-2xl border-0 shadow-card">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Monto</Label>
              <Input
                id="amount"
                inputMode="decimal"
                value={amountStr}
                placeholder="0"
                onChange={(e) => setAmountStr(e.target.value)}
                aria-invalid={!!errors.amount}
                className="h-10 text-lg font-mono font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency">Moneda</Label>
              <select
                id="currency"
                className={cn(selectClass, "h-10")}
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
          {ratePreview && (
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs">
              ≈ {fmtMoney(ratePreview.amountBase, baseCurrency, { decimals: 0 })} (1 {currency} ≈ {ratePreview.rate.toFixed(2)} {baseCurrency})
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-0 shadow-card">
        <CardContent className="p-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="source">Fuente</Label>
            <select
              id="source"
              className={selectClass}
              value={SOURCE_PRESETS.includes(source) ? source : "otro"}
              onChange={(e) => setSource(e.target.value === "otro" ? "" : e.target.value)}
            >
              {SOURCE_PRESETS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {(!SOURCE_PRESETS.includes(source) || source === "") && (
              <Input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Ej: alquiler"
                className="h-9 mt-2"
              />
            )}
            {errors.source && <p className="text-xs text-destructive">{errors.source}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Abril"
              className="h-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="receivedAt">Fecha</Label>
              <Input
                id="receivedAt"
                type="date"
                value={receivedAt}
                onChange={(e) => setReceivedAt(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="receivedBy">Para</Label>
              <select
                id="receivedBy"
                className={selectClass}
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
              >
                <option value="">Yo</option>
                {members?.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.firstName} {m.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="paymentMethodId">Cuenta destino (opcional)</Label>
            <select
              id="paymentMethodId"
              className={selectClass}
              value={paymentMethodId}
              onChange={(e) => setPaymentMethodId(e.target.value)}
            >
              <option value="">Sin especificar</option>
              {paymentMethods?.filter((p) => p.isActive).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {errors.form && (
        <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {errors.form}
        </div>
      )}

      <div className="flex gap-2 pb-4">
        <Button type="button" variant="outline" size="lg" onClick={() => router.back()} className="flex-1" disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" size="lg" className="flex-1" disabled={submitting}>
          {submitting ? "Guardando…" : "Crear ingreso"}
        </Button>
      </div>
    </form>
  );
}
