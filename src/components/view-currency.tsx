"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useExchangeRates, useMonthlyReport } from "@/lib/api/hooks";
import { currencyPrefix } from "@/lib/format";
import { availableViewCurrencies, pricedByCoinGecko, rateSourceLabel, viewCurrencyOf } from "@/lib/fx";
import { useViewCurrency, useViewCurrencyStore } from "@/stores/view-currency";

/** "Ver en" on top of Inicio and Reportes (plan 5.3, 5.6): pesos or another currency. */
export function ViewCurrencyPicker() {
  const { currency } = useViewCurrency();
  const setCurrency = useViewCurrencyStore((s) => s.setCurrency);
  const { data: rates } = useExchangeRates();
  const options = availableViewCurrencies(rates);
  // A currency picked before its quote vanished stays listed, so the
  // trigger still names it and the note offers pesos.
  const picked = viewCurrencyOf(currency);
  if (picked && !options.includes(picked)) options.push(picked);
  return (
    <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
      <SelectTrigger aria-label="Ver montos en" className="h-9 w-auto min-w-0 gap-1 px-3">
        <SelectValue>{(v: string | null) => currencyPrefix(v || "ARS")}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ARS">Pesos</SelectItem>
        {options.map((c) => (
          <SelectItem key={c.value} value={c.value}>
            {c.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Under the totals while viewing another currency: which rate converts
 * them, for the dollar the switch between each movement's day and today, and
 * what stays in pesos.
 */
export function ViewCurrencyNote() {
  const { currency, foreign, today } = useViewCurrency();
  const setCurrency = useViewCurrencyStore((s) => s.setCurrency);
  const setToday = useViewCurrencyStore((s) => s.setToday);
  const { data, error } = useMonthlyReport();
  if (!foreign) return null;

  if (error) {
    return (
      <Alert variant="error">
        Todavía no tenemos la cotización para pasar a esa moneda.{" "}
        <Button variant="link" onClick={() => setCurrency("ARS")}>
          Ver en pesos
        </Button>
      </Alert>
    );
  }
  if (!data?.rateSource) return null;

  const stays = "Tarjetas y deudas siguen en pesos.";
  if (currency === "USD") {
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
        {stays}{" "}
        <Button variant="link" className="text-caption" onClick={() => setToday(!today)}>
          {today ? "Usar el de cada movimiento" : "Usar el de hoy"}
        </Button>
      </p>
    );
  }

  const vc = viewCurrencyOf(currency);
  const name = vc?.name ?? currency;
  const price = data.rate ? (
    <>
      : <Money amount={data.rate} cents="always" /> por {name}
    </>
  ) : null;
  return (
    <p className="text-caption text-ink-muted">
      {currency === "USDT" ? (
        <>En USDT al dólar cripto de hoy{price}. </>
      ) : vc?.crypto ? (
        <>En {name} al precio de hoy{price}. </>
      ) : (
        <>
          En {vc?.label.toLowerCase() ?? currency} a la cotización de hoy{price}, con el dólar{" "}
          {rateSourceLabel(data.rateSource)}.{" "}
        </>
      )}
      {stays}
      {pricedByCoinGecko(currency) && (
        <>
          {" "}
          Precios cripto de{" "}
          <a href="https://www.coingecko.com" target="_blank" rel="noopener noreferrer" className="underline">
            CoinGecko
          </a>
          .
        </>
      )}
    </p>
  );
}

/** On screens that stay in pesos while viewing another currency (Tarjetas, Deudas). */
export function PesosNotice({ what }: { what: string }) {
  const { foreign } = useViewCurrency();
  if (!foreign) return null;
  return <Alert>{what} se muestran en pesos, porque así se pagan.</Alert>;
}
