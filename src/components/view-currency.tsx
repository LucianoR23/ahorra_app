"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { Segmented } from "@/components/ui/segmented";
import { useMonthlyReport } from "@/lib/api/hooks";
import { rateSourceLabel } from "@/lib/fx";
import { useViewCurrency, useViewCurrencyStore } from "@/stores/view-currency";

const OPTIONS = [
  { value: "ARS", label: "$" },
  { value: "USD", label: "US$" },
] as const;

/** "$ / US$" on top of Inicio and Reportes (plan 5.3). */
export function CurrencyToggle() {
  const { usd } = useViewCurrency();
  const setUsd = useViewCurrencyStore((s) => s.setUsd);
  return (
    <Segmented
      aria-label="Ver montos en"
      value={usd ? "USD" : "ARS"}
      onValueChange={(v) => setUsd(v === "USD")}
      options={OPTIONS}
      className="w-auto"
    />
  );
}

/**
 * Under the totals while viewing dollars: which dollar converts them, the
 * switch between each movement's day and today, and what stays in pesos.
 */
export function UsdViewNote() {
  const { usd, today } = useViewCurrency();
  const setUsd = useViewCurrencyStore((s) => s.setUsd);
  const setToday = useViewCurrencyStore((s) => s.setToday);
  const { data, error } = useMonthlyReport();
  if (!usd) return null;

  if (error) {
    return (
      <Alert variant="error">
        Todavía no tenemos la cotización de tu dólar para pasar a dólares.{" "}
        <Button variant="link" onClick={() => setUsd(false)}>
          Ver en pesos
        </Button>
      </Alert>
    );
  }
  if (!data?.rateSource) return null;

  const dollar = `dólar ${rateSourceLabel(data.rateSource)}`;
  return (
    <p className="text-caption text-ink-muted">
      {today ? (
        <>
          En dólares al {dollar} de hoy
          {data.usdRate ? (
            <>
              , a <Money amount={data.usdRate} cents="always" />
            </>
          ) : null}
          .{" "}
        </>
      ) : (
        <>En dólares al {dollar} del día de cada movimiento. </>
      )}
      Tarjetas y deudas siguen en pesos.{" "}
      <Button variant="link" className="text-caption" onClick={() => setToday(!today)}>
        {today ? "Usar el de cada movimiento" : "Usar el de hoy"}
      </Button>
    </p>
  );
}

/** On screens that stay in pesos while viewing dollars (Tarjetas, Deudas). */
export function PesosNotice({ what }: { what: string }) {
  const { usd } = useViewCurrency();
  if (!usd) return null;
  return <Alert>{what} se muestran en pesos, porque así se pagan.</Alert>;
}
