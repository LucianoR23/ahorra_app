"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CategorySelect } from "@/components/category-select";
import { FormRow as Row, rowControl } from "@/components/ui/form-row";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money } from "@/components/ui/money";
import { Segmented } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategories, usePaymentMethods } from "@/lib/api/hooks";
import { simulatePurchase } from "@/lib/api/mutations";
import { ApiError } from "@/lib/api/errors";
import type { Category, PurchaseSimulation } from "@/lib/api/schemas";
import { monthName, monthShort } from "@/lib/committed";
import { PAYMENT_METHOD_KIND_LABELS } from "@/lib/labels";
import { cashOrInstallments, prefillHref } from "@/lib/simulator";
import { useSpaces } from "@/lib/spaces";
import { cn } from "@/lib/utils";

const CURRENCIES = [
  { value: "ARS", label: "ARS" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
] as const;

type Currency = (typeof CURRENCIES)[number]["value"];

type Simulated = {
  data: PurchaseSimulation;
  amount: number;
  currency: Currency;
  paymentMethodId: string;
  installments: number;
  categoryId: string;
};

const pct = (n: number) => `${n.toLocaleString("es-AR", { maximumFractionDigits: 1 })}%`;

/**
 * "¿Me lo puedo comprar?" (plan 4.8): a purchase and what it does to the
 * next months, with the user's own data. Nothing is saved until "Cargar
 * compra", which opens Cargar gasto filled in.
 */
export function PurchaseSimulator() {
  const { current } = useSpaces();
  const { data: paymentMethods } = usePaymentMethods();
  const { data: categories } = useCategories(current?.id);

  const [amountStr, setAmountStr] = useState("");
  const [currency, setCurrency] = useState<Currency>((current?.baseCurrency as Currency | undefined) ?? "ARS");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [installments, setInstallments] = useState(1);
  const [categoryId, setCategoryId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Simulated | null>(null);

  const amount = Number(amountStr.replace(",", "."));
  const amountValid = amountStr !== "" && !isNaN(amount) && amount > 0;
  const paymentMethod = paymentMethods?.find((p) => p.id === paymentMethodId);
  const allowsInstallments = paymentMethod?.allowsInstallments ?? false;

  // Any change makes the last answer stale.
  function edit<T>(set: (v: T) => void) {
    return (v: T) => {
      set(v);
      setResult(null);
    };
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!amountValid) e.amount = "Ingresá un monto mayor a 0";
    if (!paymentMethodId) e.paymentMethodId = "Elegí con qué pagarías";
    setErrors(e);
    if (Object.keys(e).length > 0 || !current) return;
    setSubmitting(true);
    try {
      const n = allowsInstallments ? installments : 1;
      const data = await simulatePurchase(
        { paymentMethodId, categoryId: categoryId || null, amount, currency, installments: n },
        current.id,
      );
      setResult({ data, amount, currency, paymentMethodId, installments: n, categoryId });
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.field ? { [err.field]: err.message } : { form: err.message });
      else setErrors({ form: "Error inesperado" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Label htmlFor="sim-amount" className="sr-only">
              Monto
            </Label>
            <div className="flex min-w-0 flex-1 items-baseline gap-1 text-display font-bold">
              <span aria-hidden className={cn("shrink-0 whitespace-nowrap", !amountStr && "text-ink-muted")}>
                {currency === "USD" ? "US$" : currency === "EUR" ? "€" : "$"}
              </span>
              <Input
                id="sim-amount"
                inputMode="decimal"
                autoComplete="off"
                value={amountStr}
                placeholder="0"
                onChange={(e) => edit(setAmountStr)(e.target.value)}
                aria-invalid={!!errors.amount}
                aria-describedby={errors.amount ? "sim-amount-error" : undefined}
                className="h-auto border-transparent bg-transparent px-1 text-display font-bold tabular-nums focus-visible:border-focus"
              />
            </div>
            <Segmented
              aria-label="Moneda"
              value={currency}
              onValueChange={edit(setCurrency)}
              options={CURRENCIES}
              className="w-auto shrink-0"
            />
          </div>
          {errors.amount && (
            <p id="sim-amount-error" className="text-caption text-negative">
              {errors.amount}
            </p>
          )}
        </div>

        <Card className="py-1">
          <CardContent className="divide-y divide-border">
            <Row label="Pago" htmlFor="sim-payment" error={errors.paymentMethodId}>
              <Select
                value={paymentMethodId}
                onValueChange={(v) => {
                  edit(setPaymentMethodId)(v ?? "");
                  setInstallments(1);
                }}
              >
                <SelectTrigger id="sim-payment" aria-invalid={!!errors.paymentMethodId} className={rowControl}>
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
              <Row label="Cuotas" htmlFor="sim-installments" error={errors.installments}>
                <span className="flex items-center gap-2 font-semibold">
                  <Input
                    id="sim-installments"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={60}
                    value={installments}
                    onChange={(e) => edit(setInstallments)(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                    className="h-11 w-20 text-center font-semibold"
                  />
                  {amountValid && installments > 1 && (
                    <span>
                      de <Money amount={amount / installments} currency={currency} />
                    </span>
                  )}
                </span>
              </Row>
            )}

            <Row label="Categoría" htmlFor="sim-category">
              <CategorySelect
                value={categoryId}
                onValueChange={edit(setCategoryId)}
                categories={categories}
                emptyLabel="Sin categoría"
                id="sim-category"
                className={rowControl}
              />
            </Row>
          </CardContent>
        </Card>

        {errors.form && <Alert variant="error">{errors.form}</Alert>}

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Calculando…" : "Ver cómo me queda"}
        </Button>
      </form>

      {result && <SimulationResult result={result} categories={categories} cardName={paymentMethod?.name} />}
    </div>
  );
}

function SimulationResult({
  result,
  categories,
  cardName,
}: {
  result: Simulated;
  categories: Category[] | undefined;
  cardName: string | undefined;
}) {
  const { data } = result;
  const base = data.baseCurrency;
  const first = data.purchase.installments[0];
  const n = data.purchase.installments.length;
  const withPurchase = data.months.filter((m) => m.purchase > 0);
  const tightest = (withPurchase.length ? withPurchase : data.months).reduce<(typeof data.months)[number] | null>(
    (min, m) => (!min || m.left < min.left ? m : min),
    null,
  );
  const max = Math.max(...data.months.map((m) => Math.max(m.income, m.cardsAfter + m.fixed)), 1);

  return (
    <section aria-labelledby="sim-result" className="flex flex-col gap-4">
      <h2 id="sim-result" className="sr-only">
        Cómo te queda
      </h2>

      <Card>
        <CardContent className="flex flex-col gap-2">
          <p className="text-body text-ink">
            {n > 1 ? (
              <>
                Pagarías {n} cuotas de <Money amount={first.amountBase} currency={base} />
              </>
            ) : (
              <>
                Pagarías <Money amount={data.purchase.amountBase} currency={base} />
              </>
            )}
            {data.purchase.isCredit ? ` desde el resumen de ${monthName(first.periodYm)}.` : " ahora."}
          </p>
          {data.hasIncome && tightest ? (
            <p className={cn("text-title font-semibold", tightest.left < 0 ? "text-negative" : "text-ink")}>
              {tightest.left < 0 ? "En " : "En el mes más justo, "}
              {monthName(tightest.periodYm)}{" "}
              {tightest.left < 0 ? (
                <>
                  te faltarían <Money amount={-tightest.left} currency={base} />
                </>
              ) : (
                <>
                  te quedan <Money amount={tightest.left} currency={base} />
                </>
              )}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {!data.hasIncome && (
        <Alert>
          Para ver cuánto te queda cada mes, cargá tu sueldo como ingreso recurrente en{" "}
          <Link href="/recurrentes" className="font-semibold underline underline-offset-4">
            Recurrentes
          </Link>
          .
        </Alert>
      )}

      <Card>
        <CardContent className="flex flex-col gap-1">
          <h3 className="text-heading font-semibold">Mes a mes</h3>
          <ul className="divide-y divide-border">
            {data.months.map((m) => (
              <li key={m.periodYm} data-testid="sim-month" className="flex flex-col gap-2 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold text-ink">{monthShort(m.periodYm)}</span>
                  <span className="text-right">
                    Tarjetas <Money amount={m.cardsAfter} currency={base} className="font-semibold" />
                    {m.pctOfIncome !== null && <span className="text-ink-muted"> · {pct(m.pctOfIncome)} del ingreso</span>}
                  </span>
                </div>
                <div aria-hidden className="flex h-2 overflow-hidden rounded-full bg-surface-2">
                  <span className="bg-ink-muted" style={{ width: `${(m.cardsBefore / max) * 100}%` }} />
                  <span className="bg-brand" style={{ width: `${(m.purchase / max) * 100}%` }} />
                  <span className="bg-border" style={{ width: `${(m.fixed / max) * 100}%` }} />
                </div>
                <div className="flex flex-wrap justify-between gap-x-3 text-caption text-ink-muted">
                  <span>
                    {m.purchase > 0 ? (
                      <>
                        Esta compra <Money amount={m.purchase} currency={base} />
                      </>
                    ) : (
                      "Sin cuota de esta compra"
                    )}
                    {m.fixed > 0 && (
                      <>
                        {" · "}Fijos <Money amount={m.fixed} currency={base} />
                      </>
                    )}
                  </span>
                  {data.hasIncome && (
                    <span className={cn(m.left < 0 && "text-negative")}>
                      {m.left < 0 ? "Faltan " : "Quedan "}
                      <Money amount={Math.abs(m.left)} currency={base} />
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="text-caption text-ink-muted">
            Por resumen de tarjeta. Fijos son tus gastos recurrentes; las tarjetas suman lo que ya tenés en cuotas.
          </p>
        </CardContent>
      </Card>

      {data.card.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-1">
            <h3 className="text-heading font-semibold">{cardName ? `Resúmenes de tu ${cardName}` : "Resúmenes de la tarjeta"}</h3>
            <ul className="divide-y divide-border">
              {data.card
                .filter((c) => c.after > 0)
                .map((c) => (
                  <li key={c.periodYm} className="flex items-baseline justify-between gap-3 py-2">
                    <span className="text-ink">{monthShort(c.periodYm)}</span>
                    <span className="text-right">
                      <Money amount={c.before} currency={base} className="text-ink-muted" /> →{" "}
                      <Money amount={c.after} currency={base} className="font-semibold" />
                    </span>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {data.goals.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-2">
            <h3 className="text-heading font-semibold">Tus límites</h3>
            <ul className="flex flex-col gap-2">
              {data.goals.map((g) => {
                const name =
                  g.goalType === "total_limit"
                    ? "Límite total"
                    : `Límite de ${categories?.find((c) => c.id === g.categoryId)?.name ?? "la categoría"}`;
                return (
                  <li key={g.goalId} className="text-body">
                    <span className="font-semibold">{name}:</span>{" "}
                    {g.exceeds ? (
                      <span className="text-negative">este mes llegarías al {pct(g.pctAfter)} y te pasarías.</span>
                    ) : n > 1 ? (
                      <>cada cuota usa el {pct(g.pctPerInstallment)} del límite.</>
                    ) : (
                      <>usa el {pct(g.pctPerInstallment)} del límite.</>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {result.installments > 1 && <CashOrInstallments total={result.amount} installments={result.installments} currency={result.currency} />}

      {data.todayRate && <p className="text-caption text-ink-muted">Los montos en otra moneda usan la cotización de hoy.</p>}

      <Button
        size="lg"
        className="w-full"
        nativeButton={false}
        render={
          <Link
            href={prefillHref({
              amount: result.amount,
              currency: result.currency,
              paymentMethodId: result.paymentMethodId,
              installments: result.installments,
              categoryId: result.categoryId || undefined,
            })}
          />
        }
      >
        Cargar compra
      </Button>
    </section>
  );
}

/**
 * ¿Cuotas o contado? The installments' value today against the cash price,
 * at the monthly yield the user's money gets (editable).
 */
function CashOrInstallments({ total, installments, currency }: { total: number; installments: number; currency: string }) {
  const [open, setOpen] = useState(false);
  const [cashStr, setCashStr] = useState(String(total).replace(".", ","));
  const [rateStr, setRateStr] = useState("2");
  const cash = Number(cashStr.replace(",", "."));
  const rate = Number(rateStr.replace(",", "."));
  const valid = cash > 0 && rate >= 0 && !isNaN(rate);
  const r = valid ? cashOrInstallments(cash, total, installments, rate) : null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <Button variant="ghost" className="justify-between px-0" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span className="text-heading font-semibold">¿Cuotas o contado?</span>
          <span className="text-caption text-ink-muted">{open ? "Ocultar" : "Comparar"}</span>
        </Button>
        {open && (
          <>
            <div className="divide-y divide-border">
              <Row label="Precio de contado" htmlFor="sim-cash">
                <Input
                  id="sim-cash"
                  inputMode="decimal"
                  value={cashStr}
                  onChange={(e) => setCashStr(e.target.value)}
                  className={cn(rowControl, "w-32")}
                />
              </Row>
              <Row label="Lo que rinde tu plata por mes (%)" htmlFor="sim-rate">
                <Input
                  id="sim-rate"
                  inputMode="decimal"
                  value={rateStr}
                  onChange={(e) => setRateStr(e.target.value)}
                  className={cn(rowControl, "w-20")}
                />
              </Row>
            </div>
            {r && (
              <p role="status" className="text-body">
                {r.best === "igual" ? (
                  "Te da lo mismo: las cuotas valen hoy lo mismo que el contado."
                ) : r.best === "cuotas" ? (
                  <>
                    Te conviene en cuotas: hoy valen <Money amount={r.presentValue} currency={currency} />,{" "}
                    <Money amount={r.difference} currency={currency} /> menos que el contado.
                  </>
                ) : (
                  <>
                    Te conviene de contado: las cuotas valen hoy <Money amount={r.presentValue} currency={currency} />,{" "}
                    <Money amount={r.difference} currency={currency} /> más que el contado.
                  </>
                )}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
