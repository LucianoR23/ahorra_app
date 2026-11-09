"use client";

import { CardPeriodNudge } from "@/components/card-statements/period-nudge";
import { Check, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { mutate as swrMutate } from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import {
  useCategories,
  usePaymentMethods,
  useCreditCard,
  useCreditCardPeriods,
  useExchangeRates,
  useHouseholdMembers,
} from "@/lib/api/hooks";
import { selectSpace, useSpaces } from "@/lib/spaces";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import { createExpense, type ExpenseCreateInput } from "@/lib/api/mutations";
import { ApiError } from "@/lib/api/errors";
import { isoToday, projectBillingMonth } from "@/lib/format";
import { monthName } from "@/lib/committed";
import { dayMonth } from "@/lib/statements";
import { Money } from "@/components/ui/money";
import type { Currency } from "@/lib/api/schemas";
import { cn } from "@/lib/utils";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PAYMENT_METHOD_KIND_LABELS } from "@/lib/labels";
import { DatePicker } from "@/components/ui/date-picker";
import { CategorySelect } from "@/components/category-select";

const CURRENCIES = [
  { value: "ARS", label: "ARS" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
] as const;

/** A control inside a data row (design `CargarGasto`): no box, right-aligned, still focusable and visible on hover. */
const rowControl =
  "h-11 w-auto min-w-0 max-w-[62%] justify-end gap-2 border-transparent bg-transparent px-2 text-right font-semibold hover:bg-surface-2 aria-invalid:border-negative";

/** Last "Compartido" choice (plan 1.2). The form renders only on the client. */
function readSharedPref(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.expenseShared) === "1";
  } catch {
    return false;
  }
}

function writeSharedPref(v: boolean) {
  try {
    localStorage.setItem(STORAGE_KEYS.expenseShared, v ? "1" : "0");
  } catch {
    // Storage disabled: the choice just isn't remembered.
  }
}

/**
 * Cargar gasto (design `CargarGasto`, plan 1.10b): the amount big on top
 * with its currency, the data as rows, "Compartido", and "Guardar gasto"
 * pinned at the bottom. The natural-language box of the design is 3.1.
 *
 * `onCreated` replaces the default jump to the new expense's detail
 * (onboarding's first expense, plan 1.3).
 */
export function ExpenseForm({ onCreated }: { onCreated?: (expenseId: string) => void } = {}) {
  const router = useRouter();
  // "Compartido" off → Mi plata; on → the hogar with its split rules.
  const { personal, hogar, current } = useSpaces();
  const [compartido, setCompartido] = useState(readSharedPref);
  const isShared = !!hogar && compartido;
  const target = isShared ? hogar : personal;
  const baseCurrency = (target?.baseCurrency ?? "ARS") as Currency;

  const { data: categories } = useCategories(target?.id);
  const { data: paymentMethods } = usePaymentMethods();
  const { data: rates } = useExchangeRates();
  const { data: members } = useHouseholdMembers(hogar?.id);

  const [description, setDescription] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [currency, setCurrency] = useState<Currency>(baseCurrency);
  const [categoryId, setCategoryId] = useState<string>("");
  const [paymentMethodId, setPaymentMethodId] = useState<string>("");
  const [spentAt, setSpentAt] = useState<string>(isoToday());
  const [installments, setInstallments] = useState<number>(1);
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
      rates.find((r) => r.currency === currency && r.source === "blue") ?? rates.find((r) => r.currency === currency);
    if (!candidate) return null;
    return { rate: candidate.rateAvg, amountBase: amountValid ? amount * candidate.rateAvg : 0 };
  })();

  // Where the first installment lands: the loaded period of its month, or just the month.
  const firstStatement = (() => {
    if (!isCredit || !creditCard) return null;
    const ym = projectBillingMonth(spentAt, creditCard.defaultClosingDay);
    const period = periods?.find((p) => p.periodYm === ym);
    return { ym, closingDate: period?.closingDate ?? null, dueDate: period?.dueDate ?? null };
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
    if (!description.trim()) e.description = "Contá qué compraste";
    if (!amountValid) e.amount = "Ingresá un monto mayor a 0";
    if (!paymentMethodId) e.paymentMethodId = "Elegí con qué pagaste";
    if (!spentAt) e.spentAt = "Elegí la fecha";
    if (installments < 1) e.installments = "Mínimo 1";
    if (installments > 1 && !allowsInstallments) e.installments = "Este medio no admite cuotas";
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

    if (!target) return;
    setSubmitting(true);
    try {
      const detail = await createExpense(input, target.id);
      // The detail page reads the current space: show the one it went to.
      if (target.id !== current?.id) selectSpace(target.id);
      swrMutate(
        (k) =>
          Array.isArray(k) &&
          typeof k[0] === "string" &&
          (k[0].startsWith("/expenses") || k[0].startsWith("/reports") || k[0].startsWith("/balances") || k[0].startsWith("/credit-cards")),
        undefined,
        { revalidate: true },
      );
      if (onCreated) onCreated(detail.expense.id);
      else router.replace(`/movimientos/${detail.expense.id}`);
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
      {/* The amount, big, with its currency. */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Label htmlFor="amount" className="sr-only">
            Monto
          </Label>
          <div className="flex min-w-0 flex-1 items-baseline gap-1 text-display font-bold">
            <span aria-hidden className={cn(!amountStr && "text-ink-muted")}>
              {currency === "USD" ? "US$" : currency === "EUR" ? "€" : "$"}
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
              className="h-auto border-transparent bg-transparent px-1 text-display font-bold tabular-nums focus-visible:border-focus"
            />
          </div>
          <Segmented
            aria-label="Moneda"
            value={currency}
            onValueChange={(v) => setCurrency(v)}
            options={CURRENCIES}
            className="w-auto shrink-0"
          />
        </div>
        {errors.amount && (
          <p id="amount-error" className="text-caption text-negative">
            {errors.amount}
          </p>
        )}
        {ratePreview && currency !== baseCurrency && (
          <p className="text-caption text-ink-muted">
            ≈ <Money amount={ratePreview.amountBase} currency={baseCurrency} /> (1 {currency} ≈{" "}
            {ratePreview.rate.toLocaleString("es-AR", { maximumFractionDigits: 2 })} {baseCurrency}). La cotización se fija al guardar.
          </p>
        )}
      </div>

      {/* The data, one row each. */}
      <Card className="py-1">
        <CardContent className="divide-y divide-border">
          <Row label="Descripción" htmlFor="description" error={errors.description}>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Qué compraste"
              aria-invalid={!!errors.description}
              className={cn(rowControl, "flex-1")}
            />
          </Row>

          <Row label="Categoría" htmlFor="category">
            <CategorySelect
              value={categoryId}
              onValueChange={setCategoryId}
              categories={categories}
              emptyLabel="Sin categoría"
              id="category"
              className={rowControl}
            />
          </Row>

          <Row label="Pago" htmlFor="paymentMethod" error={errors.paymentMethodId}>
            <Select
              value={paymentMethodId}
              onValueChange={(v) => {
                setPaymentMethodId(v ?? "");
                setInstallments(1);
              }}
            >
              <SelectTrigger id="paymentMethod" aria-invalid={!!errors.paymentMethodId} className={rowControl}>
                <SelectValue placeholder="Elegí">
                  {(v: string | null) => paymentMethods?.find((p) => p.id === v)?.name ?? "Elegí"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {paymentMethods
                  ?.filter((p) => p.isActive)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} · {PAYMENT_METHOD_KIND_LABELS[p.kind]}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Row>

          {allowsInstallments && (
            <div className="flex flex-col gap-2 py-2">
              <Row label="Cuotas" htmlFor="installments" error={errors.installments} bare>
                <span className="flex items-center gap-2 font-semibold">
                  <Input
                    id="installments"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={60}
                    value={installments}
                    onChange={(e) => setInstallments(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                    className="h-11 w-20 text-center font-semibold"
                  />
                  {amountValid && installments > 1 && (
                    <span>
                      de <Money amount={amount / installments} currency={currency} />
                    </span>
                  )}
                </span>
              </Row>
              {installments > 1 && (
                <div aria-hidden className="flex gap-1">
                  {Array.from({ length: Math.min(installments, 12) }, (_, i) => (
                    <span key={i} className="h-2 flex-1 rounded-full bg-border" />
                  ))}
                </div>
              )}
              {firstStatement && (
                <p className="text-caption text-ink-muted">
                  {installments > 1 ? "La primera entra" : "Entra"}{" "}
                  {firstStatement.closingDate && firstStatement.dueDate
                    ? `en el resumen que cierra el ${dayMonth(firstStatement.closingDate)} y vence el ${dayMonth(firstStatement.dueDate)}.`
                    : `en el resumen de ${monthName(firstStatement.ym)}.`}
                </p>
              )}
            </div>
          )}

          <Row label="Fecha" error={errors.spentAt}>
            <DatePicker value={spentAt} onChange={setSpentAt} aria-invalid={!!errors.spentAt} className={rowControl} />
          </Row>
        </CardContent>
      </Card>

      {isCredit && paymentMethod && <CardPeriodNudge paymentMethodId={paymentMethod.id} cardName={paymentMethod.name} />}

      {/* Compartido (plan 1.2): only with a hogar */}
      {hogar && (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="isShared" className="text-heading font-semibold">
                  Compartido
                </Label>
                <p className="text-caption text-ink-muted">
                  {isShared
                    ? `Va a ${hogar.name} y se divide según sus reglas, salvo que especifiques.`
                    : "Va a Mi plata. Activalo para sumarlo al Hogar."}
                </p>
              </div>
              <Switch
                id="isShared"
                checked={isShared}
                onCheckedChange={(v) => {
                  setCompartido(v);
                  writeSharedPref(v);
                  // Each space has its own categories.
                  setCategoryId("");
                  if (!v) setOverrideShares(false);
                }}
              />
            </div>

            {isShared && members && members.length > 1 && (
              <>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <Label htmlFor="overrideShares">División personalizada</Label>
                  <Switch id="overrideShares" checked={overrideShares} onCheckedChange={setOverrideShares} />
                </div>

                {overrideShares && sharesList && (
                  <div className="flex flex-col gap-2">
                    {sharesList.map((s) => (
                      <div key={s.userId} className="flex items-center gap-2">
                        <Label htmlFor={`share-${s.userId}`} className="flex-1 truncate font-normal">
                          {s.name}
                        </Label>
                        <Input
                          id={`share-${s.userId}`}
                          inputMode="decimal"
                          placeholder="0"
                          value={shareAmounts[s.userId] ?? ""}
                          onChange={(e) => setShareAmounts({ ...shareAmounts, [s.userId]: e.target.value })}
                          className="h-11 w-32 text-right tabular-nums"
                        />
                        <span className="w-9 text-caption text-ink-muted">{currency}</span>
                      </div>
                    ))}
                    <p className={cn("flex items-center gap-1 text-caption", sharesMatch ? "text-positive" : "text-negative")}>
                      {sharesMatch ? <Check aria-hidden className="size-4" /> : <TriangleAlert aria-hidden className="size-4" />} Suma{" "}
                      {sharesSum.toFixed(2)} / {amount.toFixed(2)} {currency}
                    </p>
                    {errors.shares && <p className="text-caption text-negative">{errors.shares}</p>}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {errors.form && (
        <p role="alert" className="rounded-lg bg-negative-soft px-3 py-2 text-caption text-negative">
          {errors.form}
        </p>
      )}

      {/* One action, pinned to the bottom on phones. */}
      <div className="safe-bottom sticky bottom-0 -mx-4 border-t border-border bg-background px-4 pt-3 pb-4 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Guardando…" : "Guardar gasto"}
        </Button>
      </div>
    </form>
  );
}

/** A data row: label on the left, its control on the right, the error under it. */
function Row({
  label,
  htmlFor,
  error,
  bare,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  /** Inside a block that already has the padding and the divider. */
  bare?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col", !bare && "py-2")}>
      <div className="flex min-h-12 items-center justify-between gap-4">
        {htmlFor ? (
          <Label htmlFor={htmlFor} className="shrink-0 font-normal text-ink-muted">
            {label}
          </Label>
        ) : (
          <span className="shrink-0 text-body text-ink-muted">{label}</span>
        )}
        {children}
      </div>
      {error && <p className="text-right text-caption text-negative">{error}</p>}
    </div>
  );
}
