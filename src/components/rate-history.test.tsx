import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { RateHistory } from "./rate-history";
import { API, requests, resetRequests, server, signIn } from "@/test/msw";
import { personalSpace, WithSWR } from "@/test/spaces";
import { useDiscreetStore } from "@/stores/discreet";

// "Cotizaciones" (plan 5.2b).

const point = (day: string, rateSell: number) => ({ day, rateSell, rateAvg: rateSell - 10, rateBuy: rateSell - 20, lastUpdate: `${day}T18:00:00Z` });

function api(points = [point("2026-10-12", 1500), point("2026-10-30", 1550), point("2026-11-09", 1587.9)]) {
  server.use(
    http.get(`${API}/households`, () => HttpResponse.json([{ ...personalSpace, fxSource: "bolsa" }])),
    http.get(`${API}/exchange-rates/history`, ({ request }) => {
      const u = new URL(request.url);
      return HttpResponse.json({ currency: u.searchParams.get("currency"), source: u.searchParams.get("source"), points });
    }),
  );
}

const lastHistoryQuery = () => {
  const r = requests().filter((x) => x.path === "/exchange-rates/history").at(-1);
  return r ? new URLSearchParams(r.query) : null;
};

beforeEach(() => {
  resetRequests();
  useDiscreetStore.setState({ hidden: false });
  signIn({ householdId: personalSpace.id });
});

describe("RateHistory (plan 5.2b)", () => {
  it("starts at the space's dollar over 30 days, with today's price and the change", async () => {
    api();
    render(<RateHistory />, { wrapper: WithSWR });
    expect(await screen.findByText("Dólar MEP · venta")).toBeInTheDocument();
    expect(screen.getByText("$ 1.587,90")).toBeInTheDocument();
    expect(screen.getByText("+5,9% en 30 días")).toBeInTheDocument();
    expect(screen.getByText(/Actualizada el 9\/11/)).toBeInTheDocument();
    const q = lastHistoryQuery()!;
    expect([q.get("currency"), q.get("source"), q.get("days")]).toEqual(["USD", "bolsa", "30"]);
  });

  it("asks for another dollar and another period", async () => {
    api();
    render(<RateHistory />, { wrapper: WithSWR });
    await screen.findByText("Dólar MEP · venta");
    await userEvent.click(screen.getByLabelText("Dólar"));
    await userEvent.click(await screen.findByRole("option", { name: "Dólar Blue" }));
    await userEvent.click(screen.getByRole("radio", { name: "1 año" }));
    await waitFor(() => {
      const q = lastHistoryQuery()!;
      expect([q.get("source"), q.get("days")]).toEqual(["blue", "365"]);
    });
    expect(await screen.findByText("+5,9% en un año")).toBeInTheDocument();
  });

  it("says when there is nothing for that dollar", async () => {
    api([]);
    render(<RateHistory />, { wrapper: WithSWR });
    expect(await screen.findByText("Todavía no hay cotizaciones")).toBeInTheDocument();
  });

  it("hides the price in discreet mode", async () => {
    api();
    useDiscreetStore.setState({ hidden: true });
    render(<RateHistory />, { wrapper: WithSWR });
    await screen.findByText("Dólar MEP · venta");
    expect(screen.queryByText("$ 1.587,90")).not.toBeInTheDocument();
  });
});
