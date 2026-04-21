"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mutate as swrMutate } from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  useCategories,
  usePaymentMethods,
  useCreditCard,
  useCreditCardPeriods,
  useExchangeRates,
  useHouseholdMembers,
  useHouseholds,
} from "@/lib/api/hooks";
import { useHouseholdStore } from "@/stores/household";
import { createExpense, type ExpenseCreateInput } from "@/lib/api/mutations";
import { ApiError } from "@/lib/api/errors";
import { fmtMoney, isoToday, projectBillingMonth, shiftMonth } from "@/lib/format";
import type { Currency } from "@/lib/api/schemas";
import { cn } from "@/lib/utils";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const CURRENCIES: Currency[] = ["ARS", "USD", "EUR"];

export function ExpenseForm() {
  const router = useRouter();
  const currentHouseholdId = useHouseholdStore((s) => s.currentId);
  const { data: households } = useHouseholds();
  const household = households?.find((h) => h.id === currentHouseholdId) ?? households?.[0];
  const baseCurrency = (household?.baseCurrency ?? "ARS") as Currency;

  const { data: categories } = useCategories();
  const { data: paymentMethods } = usePaymentMethods();
  const { data: rates } = useExchangeRates();
  const { data: members } = useHouseholdMembers();

  const [description, setDescription] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [currency, setCurrency] = useState<Currency>(baseCurrency);
  const [categoryId, setCategoryId] = useState<string>("");
  const [paymentMethodId, setPaymentMethodId] = useState<string>("");
  const [spentAt, setSpentAt] = useState<string>(isoToday());
  const [installments, setInstallments] = useState<number>(1);
  const [isShared, setIsShared] = useState(false);
  const [overrideShares, setOverrideShares] = useState(false);
  const [shareAmounts, setShareAmounts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const amount = Number(amountStr.replace(",", "."));
  const amountValid = amountStr !== "" && !isNaN(amount) && amount > 0;

  const paymentMethod = paymentMethods?.find((p) => p.id === paymentMethodId);
  const isCredit = paymentMethod?.kind === "credit";
  const allowsInstallments = paymentMethod?.allowsInstallments ?? false;

  const { data: creditCard } = useCreditCard(isCredit ? paymentMethodId : null);
  const { data: periods } = useCreditCardPeriods(isCredit ? paymentMethodId : null);

  const ratePreview = (() => {
    if (currency === baseCurrency) return { rate: 1, amountBase: amountValid ? amount : 0 };
    if (!rates) return null;
    const candidate =
      rates.find((r) => r.currency === currency && r.source === "blue") ??
      rates.find((r) => r.currency === currency);
    if (!candidate) return null;
    return { rate: candidate.rateAvg, amountBase: amountValid ? amount * candidate.rateAvg : 0 };
  })();

  const billingPreview =
    !isCredit || !creditCard || !amountValid || installments < 1
      ? null
      : (() => {
          const firstMonth = projectBillingMonth(spentAt, creditCard.defaultClosingDay);
          const perInstallment = amount / installments;
          const perInstallmentBase = (ratePreview?.amountBase ?? amount) / installments;
          return Array.from({ length: installments }, (_, i) => {
            const ym = shiftMonth(firstMonth, i);
            const override = periods?.find((p) => p.periodYm === ym);
            return {
              n: i + 1,
              ym,
              billingDate: override?.closingDate ?? null,
              dueDate: override?.dueDate ?? null,
              amount: perInstallment,
              amountBase: perInstallmentBase,
            };
          });
        })();

  const sharesList =
    !isShared || !overrideShares || !members
      ? null
      : members.map((m) => ({
          userId: m.userId,
          name: `${m.firstName} ${m.lastName}`.trim() || m.email,
          amount: Number((shareAmounts[m.userId] ?? "").replace(",", ".")) || 0,
        }));

  const sharesSum = sharesList?.reduce((a, s) => a + s.amount, 0) ?? 0;
  const sharesMatch = !sharesList || Math.abs(sharesSum - amount) < 0.01;

  function validate() {
    const e: Record<string, string> = {};
    if (!description.trim()) e.description = "Requerido";
    if (!amountValid) e.amount = "Ingresá un monto mayor a 0";
    if (!paymentMethodId) e.paymentMethodId = "Elegí un método de pago";
    if (!spentAt) e.spentAt = "Requerido";
    if (installments < 1) e.installments = "Mínimo 1";
    if (installments > 1 && !allowsInstallments) e.installments = "Este método no admite cuotas";
    if (sharesList && !sharesMatch) {
      e.shares = `Las partes suman ${sharesSum.toFixed(2)}, deben sumar ${amount.toFixed(2)}`;
    }
    return e;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const fieldErrors = validate();
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    const input: ExpenseCreateInput = {
      categoryId: categoryId || null,
      paymentMethodId,
      amount,
      currency,
      description: description.trim(),
      spentAt,
      installments,
      isShared,
    };
    if (sharesList) {
      input.sharesOverride = sharesList.map((s) => ({ userId: s.userId, amount: s.amount }));
    }

    setSubmitting(true);
    try {
      const detail = await createExpense(input);
      // Invalidate expenses + reports
      swrMutate(
        (k) => Array.isArray(k) && typeof k[0] === "string" && (k[0].startsWith("/expenses") || k[0].startsWith("/reports") || k[0].startsWith("/balances")),
        undefined,
        { revalidate: true },
      );
      router.replace(`/movimientos/${detail.expense.id}`);
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
      {/* Monto + moneda */}
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
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
          {ratePreview && currency !== baseCurrency && (
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs">
              <div className="font-semibold">Conversión estimada</div>
              <div className="text-muted-foreground">
                1 {currency} ≈ {ratePreview.rate.toLocaleString("es-AR", { maximumFractionDigits: 2 })} {baseCurrency}
                {" · "}
                Total: {fmtMoney(ratePreview.amountBase, baseCurrency, { decimals: 0 })}
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">La tasa exacta se congela al crear.</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Descripción + categoría */}
      <Card className="rounded-2xl border-0 shadow-card">
        <CardContent className="p-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Super del sábado"
              aria-invalid={!!errors.description}
              className="h-9"
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="category">Categoría</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Sin categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin categoría</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="spentAt">Fecha</Label>
              <Input
                id="spentAt"
                type="date"
                value={spentAt}
                onChange={(e) => setSpentAt(e.target.value)}
                aria-invalid={!!errors.spentAt}
                className="h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Método de pago + cuotas */}
      <Card className="rounded-2xl border-0 shadow-card">
        <CardContent className="p-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="paymentMethod">Método de pago</Label>
            <Select value={paymentMethodId} onValueChange={(v) => { setPaymentMethodId(v); setInstallments(1); }}>
              <SelectTrigger id="paymentMethod">
                <SelectValue placeholder="Elegí un método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Elegí un método</SelectItem>
                {paymentMethods?.filter((p) => p.isActive).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} · {p.kind}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.paymentMethodId && <p className="text-xs text-destructive">{errors.paymentMethodId}</p>}
          </div>

          {allowsInstallments && (
            <div className="space-y-1.5">
              <Label htmlFor="installments">Cuotas</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="installments"
                  type="number"
                  min={1}
                  max={60}
                  value={installments}
                  onChange={(e) => setInstallments(Math.max(1, Number(e.target.value) || 1))}
                  className="h-9 w-20"
                />
                {amountValid && installments > 1 && (
                  <span className="text-xs text-muted-foreground">
                    {fmtMoney(amount / installments, currency, { decimals: 0 })} × {installments}
                  </span>
                )}
              </div>
            </div>
          )}

          {isCredit && billingPreview && billingPreview.length > 0 && (
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <div className="text-xs font-semibold mb-1.5">Facturación estimada</div>
              <div className="flex flex-col gap-1">
                {billingPreview.map((b) => (
                  <div key={b.n} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-mono text-muted-foreground">
                      {installments > 1 ? `Cuota ${b.n}/${installments}` : "Gasto"}
                    </span>
                    <span className="flex-1 mx-2 truncate">
                      {b.billingDate ? (
                        <>Cierra {b.billingDate} · vence {b.dueDate}</>
                      ) : (
                        <span className="text-warn">Período {b.ym} sin configurar — el backend lo deriva del cierre por defecto</span>
                      )}
                    </span>
                    <span className="font-mono font-semibold shrink-0">
                      {fmtMoney(b.amountBase, baseCurrency, { decimals: 0 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {errors.installments && <p className="text-xs text-destructive">{errors.installments}</p>}
        </CardContent>
      </Card>

      {/* Compartir */}
      {members && members.length > 1 && (
        <Card className="rounded-2xl border-0 shadow-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isShared" className="text-sm">Compartir con el hogar</Label>
                <p className="text-xs text-muted-foreground">
                  Se divide según las reglas del hogar salvo que especifiques.
                </p>
              </div>
              <Switch
                id="isShared"
                checked={isShared}
                onCheckedChange={(v) => {
                  setIsShared(v);
                  if (!v) setOverrideShares(false);
                }}
              />
            </div>

            {isShared && (
              <>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <Label htmlFor="overrideShares" className="text-xs">División personalizada</Label>
                  <Switch
                    id="overrideShares"
                    checked={overrideShares}
                    onCheckedChange={setOverrideShares}
                  />
                </div>

                {overrideShares && sharesList && (
                  <div className="flex flex-col gap-2">
                    {sharesList.map((s) => (
                      <div key={s.userId} className="flex items-center gap-2">
                        <span className="flex-1 truncate text-xs font-medium">{s.name}</span>
                        <Input
                          inputMode="decimal"
                          placeholder="0"
                          value={shareAmounts[s.userId] ?? ""}
                          onChange={(e) => setShareAmounts({ ...shareAmounts, [s.userId]: e.target.value })}
                          className="h-8 w-28 text-right font-mono"
                        />
                        <span className="text-[10px] text-muted-foreground w-8">{currency}</span>
                      </div>
                    ))}
                    <div className={cn("text-xs", sharesMatch ? "text-positive" : "text-destructive")}>
                      {sharesMatch ? "✓" : "⚠"} Suma {sharesSum.toFixed(2)} / {amount.toFixed(2)} {currency}
                    </div>
                    {errors.shares && <p className="text-xs text-destructive">{errors.shares}</p>}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {errors.form && (
        <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {errors.form}
        </div>
      )}

      <div className="flex gap-2 pb-4">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => router.back()}
          className="flex-1"
          disabled={submitting}
        >
          Cancelar
        </Button>
        <Button type="submit" size="lg" className="flex-1" disabled={submitting}>
          {submitting ? "Guardando…" : "Crear gasto"}
        </Button>
      </div>
    </form>
  );
}
