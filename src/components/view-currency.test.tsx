import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { PesosNotice, ViewCurrencyNote, ViewCurrencyPicker } from "./view-currency";
import { API, server, signIn } from "@/test/msw";
import { personalSpace, WithSWR } from "@/test/spaces";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import { useViewCurrencyStore, viewQuery } from "@/stores/view-currency";

const rate = (currency: string, source: string, sell: number) => ({
  currency,
  source,
  rateAvg: sell,
  rateBuy: sell,
  rateSell: sell,
  lastUpdate: "2026-11-10T12:00:00Z",
  fetchedAt: "2026-11-10T12:00:00Z",
});

beforeEach(() => {
  signIn({ householdId: personalSpace.id });
  useViewCurrencyStore.setState({ currency: "ARS", today: false });
});

describe("Ver en (plan 5.3, 5.6)", () => {
  it("screens paid in pesos say so only while viewing another currency", async () => {
    const { rerender } = render(<PesosNotice what="Los resúmenes y las cuotas" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    useViewCurrencyStore.setState({ currency: "EUR" });
    rerender(<PesosNotice what="Los resúmenes y las cuotas" />);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Los resúmenes y las cuotas se muestran en pesos, porque así se pagan.",
    );
  });

  it("lists the dollar always and the rest once they have a quote", async () => {
    server.use(
      http.get(`${API}/exchange-rates/current`, () =>
        HttpResponse.json([
          rate("USD", "bolsa", 1588),
          rate("EUR", "oficial", 1738),
          rate("BRL", "oficial", 277),
          rate("USDT", "cripto", 1623),
        ]),
      ),
    );
    render(<ViewCurrencyPicker />, { wrapper: WithSWR });
    const picker = screen.getByRole("combobox", { name: "Ver montos en" });
    expect(picker).toHaveTextContent("$");

    await userEvent.click(picker);
    await screen.findByRole("option", { name: "Reales" });
    // No bitcoin or ether quote yet (the API has no CoinGecko key).
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Pesos", "Dólares", "Euros", "Reales", "USDT"]);

    await userEvent.click(screen.getByRole("option", { name: "Euros" }));
    expect(useViewCurrencyStore.getState().currency).toBe("EUR");
    expect(picker).toHaveTextContent("€");
  });

  it("keeps a picked currency listed when its quote is gone", async () => {
    server.use(http.get(`${API}/exchange-rates/current`, () => HttpResponse.json([rate("USD", "bolsa", 1588)])));
    useViewCurrencyStore.setState({ currency: "BTC" });
    render(<ViewCurrencyPicker />, { wrapper: WithSWR });
    await userEvent.click(screen.getByRole("combobox", { name: "Ver montos en" }));
    await screen.findByRole("option", { name: "Bitcoin" });
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Pesos", "Dólares", "Bitcoin"]);
  });

  it("offers pesos back when there is no quote for that currency", async () => {
    server.use(
      http.get(`${API}/households`, () => HttpResponse.json([personalSpace])),
      http.get(`${API}/reports/monthly`, () =>
        HttpResponse.json({ error: { code: "conflict", message: "Todavía no tenemos la cotización de esa moneda." } }, { status: 409 }),
      ),
    );
    useViewCurrencyStore.setState({ currency: "ETH" });
    render(<ViewCurrencyNote />, { wrapper: WithSWR });
    expect(await screen.findByRole("alert")).toHaveTextContent("Todavía no tenemos la cotización para pasar a esa moneda");
    await userEvent.click(screen.getByRole("button", { name: "Ver en pesos" }));
    expect(useViewCurrencyStore.getState().currency).toBe("ARS");
  });

  it("says which rate converts a fiat currency, and has no day mode", async () => {
    server.use(
      http.get(`${API}/households`, () => HttpResponse.json([personalSpace])),
      http.get(`${API}/reports/monthly`, () =>
        HttpResponse.json({ householdId: personalSpace.id, baseCurrency: "ARS", currency: "EUR", rateSource: "bolsa", rateMode: "today", rate: 1760, scale: 2 }),
      ),
    );
    useViewCurrencyStore.setState({ currency: "EUR", today: true });
    render(<ViewCurrencyNote />, { wrapper: WithSWR });
    expect(await screen.findByText(/En euros a la cotización de hoy/)).toHaveTextContent(
      "En euros a la cotización de hoy: $ 1.760,00 por euro, con el dólar MEP. Tarjetas y deudas siguen en pesos.",
    );
    expect(screen.queryByRole("button", { name: /Usar el/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/CoinGecko/)).not.toBeInTheDocument();
  });

  it("credits CoinGecko for bitcoin", async () => {
    server.use(
      http.get(`${API}/households`, () => HttpResponse.json([personalSpace])),
      http.get(`${API}/reports/monthly`, () =>
        HttpResponse.json({ householdId: personalSpace.id, baseCurrency: "ARS", currency: "BTC", rateSource: "cripto", rateMode: "today", rate: 113583538, scale: 8 }),
      ),
    );
    useViewCurrencyStore.setState({ currency: "BTC" });
    render(<ViewCurrencyNote />, { wrapper: WithSWR });
    expect(await screen.findByText(/En bitcoin al precio de hoy/)).toHaveTextContent(
      "En bitcoin al precio de hoy: $ 113.583.538,00 por bitcoin. Tarjetas y deudas siguen en pesos. Precios cripto de CoinGecko.",
    );
    expect(screen.getByRole("link", { name: "CoinGecko" })).toHaveAttribute("href", "https://www.coingecko.com");
  });

  it("asks the API for the currency picked; only the dollar takes rate=today", () => {
    expect(viewQuery({ currency: "ARS", foreign: false, today: false })).toEqual({});
    expect(viewQuery({ currency: "USD", foreign: true, today: false })).toEqual({ currency: "USD" });
    expect(viewQuery({ currency: "USD", foreign: true, today: true })).toEqual({ currency: "USD", rate: "today" });
    expect(viewQuery({ currency: "BTC", foreign: true, today: false })).toEqual({ currency: "BTC" });
  });

  it("turns the old dollars switch into the dollar", async () => {
    localStorage.setItem(STORAGE_KEYS.viewCurrency, JSON.stringify({ state: { usd: true, today: true }, version: 0 }));
    await useViewCurrencyStore.persist.rehydrate();
    expect(useViewCurrencyStore.getState()).toMatchObject({ currency: "USD", today: true });

    localStorage.setItem(STORAGE_KEYS.viewCurrency, JSON.stringify({ state: { usd: false }, version: 0 }));
    await useViewCurrencyStore.persist.rehydrate();
    expect(useViewCurrencyStore.getState()).toMatchObject({ currency: "ARS", today: false });
    localStorage.removeItem(STORAGE_KEYS.viewCurrency);
  });
});
