import { render, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CardCommittedSection } from "./card-committed";
import { CommittedBars, CommittedDollars } from "./committed-bars";
import type { Committed, PeriodTotals } from "@/lib/api/schemas";
import { endsIn, monthShort } from "@/lib/committed";
import { API, server, signIn } from "@/test/msw";
import { personalSpace, WithSWR } from "@/test/spaces";
import { useDiscreetStore } from "@/stores/discreet";

// "Comprometido" and "Cuotas en curso" (plan 4.2).

const ars = (periodYm: string, amount: number): PeriodTotals => ({
  periodYm,
  totals: amount > 0 ? [{ currency: "ARS", amount }] : [],
});

const committed: Committed = {
  months: [ars("2026-11", 0), ars("2026-12", 400000), ars("2027-01", 235000)],
  cards: [
    {
      paymentMethodId: "visa",
      name: "Visa Galicia",
      alias: "Visa",
      network: "visa",
      lastFour: "4417",
      openPeriodYm: "2026-12",
      toPay: null,
      months: [
        ars("2026-11", 0),
        { periodYm: "2026-12", totals: [{ currency: "ARS", amount: 186320 }, { currency: "USD", amount: 12 }] },
        ars("2027-01", 235000),
      ],
    },
  ],
};

beforeEach(() => {
  signIn({ householdId: personalSpace.id });
  server.use(
    http.get(`${API}/credit-cards/committed`, () => HttpResponse.json(committed)),
    http.get(`${API}/payment-methods/visa/credit-card/installment-plans`, () =>
      HttpResponse.json({
        plans: [
          {
            expenseId: "e1",
            householdId: personalSpace.id,
            categoryId: null,
            description: "Notebook",
            currency: "ARS",
            totalInstallments: 6,
            nextInstallmentNumber: 4,
            nextInstallmentAmount: 145000,
            lastPeriodYm: "2027-02",
          },
        ],
      }),
    ),
  );
});

afterEach(() => useDiscreetStore.setState({ hidden: false }));

describe("committed helpers", () => {
  it("names months and when a plan ends", () => {
    expect(monthShort("2026-12")).toBe("Dic");
    expect(endsIn("2026-12", new Date(2026, 10, 8))).toBe("termina en diciembre");
    expect(endsIn("2027-08", new Date(2026, 10, 8))).toBe("termina en agosto de 2027");
  });
});

describe("CommittedBars", () => {
  const months = [ars("2026-12", 200000), ars("2027-01", 100000), ars("2027-02", 0)];

  it("draws one bar per month, scaled to the largest, with the amounts for screen readers", () => {
    render(<CommittedBars months={months} values />);
    const bars = screen.getAllByTestId("committed-bar");
    expect(bars.map((b) => b.style.height)).toEqual(["100%", "50%", "3%"]);
    expect(screen.getByText("$ 200k")).toBeInTheDocument();
    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("listitem")[0]).toHaveTextContent("diciembre: $ 200.000");
  });

  it("hides the amounts in discreet mode but keeps the bars", () => {
    useDiscreetStore.setState({ hidden: true });
    render(<CommittedBars months={months} values />);
    expect(screen.queryByText("$ 200k")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("committed-bar")).toHaveLength(3);
    expect(screen.getAllByLabelText("Monto oculto")).toHaveLength(3);
  });

  it("mentions dollars apart, only when there are", () => {
    const { container, rerender } = render(<CommittedDollars months={months} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<CommittedDollars months={[{ periodYm: "2026-12", totals: [{ currency: "USD", amount: 12 }] }]} />);
    expect(screen.getByText(/en dólares \(dic\)/)).toHaveTextContent("Más US$ 12 en dólares (dic).");
  });
});

describe("CardCommittedSection", () => {
  it("shows the card's months from its open period and its installments in progress", async () => {
    render(<CardCommittedSection paymentMethodId="visa" />, { wrapper: WithSWR });
    expect(await screen.findByText("Comprometido en esta tarjeta")).toBeInTheDocument();
    expect(screen.getAllByTestId("committed-bar")).toHaveLength(2); // November is before the open period
    expect(screen.getByText("$ 186k")).toBeInTheDocument();
    expect(screen.getByText(/en dólares/)).toHaveTextContent("Más US$ 12 en dólares (dic).");

    expect(await screen.findByText("Cuotas en curso")).toBeInTheDocument();
    expect(screen.getByText("Notebook")).toBeInTheDocument();
    expect(screen.getByText("$ 145.000")).toBeInTheDocument();
    expect(screen.getByText(/4 de 6/).closest("li")).toHaveTextContent("4 de 6 · termina en febrero de 2027");
  });

  it("says so when the card has nothing ahead", async () => {
    server.use(
      http.get(`${API}/credit-cards/committed`, () =>
        HttpResponse.json({ ...committed, cards: [{ ...committed.cards[0], months: [ars("2026-12", 0)] }] }),
      ),
      http.get(`${API}/payment-methods/visa/credit-card/installment-plans`, () => HttpResponse.json({ plans: [] })),
    );
    render(<CardCommittedSection paymentMethodId="visa" />, { wrapper: WithSWR });
    expect(await screen.findByText("No tiene cuotas en los próximos resúmenes.")).toBeInTheDocument();
    expect(screen.queryByText("Cuotas en curso")).not.toBeInTheDocument();
  });
});
