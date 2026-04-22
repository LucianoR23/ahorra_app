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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { incomeSourceLabel } from "@/lib/labels";
import { DatePicker } from "@/components/ui/date-picker";

const CURRENCIES: Currency[] = ["ARS", "USD", "EUR"];

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
              <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                <SelectTrigger id="currency" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
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
            <Select
              value={SOURCE_PRESETS.includes(source) ? source : "otro"}
              onValueChange={(v) => setSource(v === "otro" || v == null ? "" : v)}
            >
              <SelectTrigger id="source">
                <SelectValue>
                  {(v: string | null) => (v ? incomeSourceLabel(v) : "")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SOURCE_PRESETS.map((s) => (
                  <SelectItem key={s} value={s}>{incomeSourceLabel(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              <DatePicker
                value={receivedAt}
                onChange={setReceivedAt}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="receivedBy">Para</Label>
              <Select value={receivedBy} onValueChange={(v) => setReceivedBy(v ?? "")}>
                <SelectTrigger id="receivedBy">
                  <SelectValue placeholder="Yo">
                    {(v: string | null) => {
                      if (!v) return "Yo";
                      const m = members?.find((x) => x.userId === v);
                      return m ? `${m.firstName} ${m.lastName}`.trim() || m.email : "Yo";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Yo</SelectItem>
                  {members?.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {m.firstName} {m.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="paymentMethodId">Cuenta destino (opcional)</Label>
            <Select value={paymentMethodId} onValueChange={(v) => setPaymentMethodId(v ?? "")}>
              <SelectTrigger id="paymentMethodId">
                <SelectValue placeholder="Sin especificar">
                  {(v: string | null) => (v ? (paymentMethods?.find((p) => p.id === v)?.name ?? "Sin especificar") : "Sin especificar")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin especificar</SelectItem>
                {paymentMethods?.filter((p) => p.isActive).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
