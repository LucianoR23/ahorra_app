import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { CardPeriodNudge, periodToConfirm } from "./period-nudge";
import type { CreditCardPeriodStatus } from "@/lib/api/schemas";
import { API, requests, server, signIn } from "@/test/msw";
import { personalSpace, WithSWR } from "@/test/spaces";

// "Cargá el cierre de este mes" (plan 4.3).

function iso(daysFromToday: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const status = (closingIn: number, loaded = false): CreditCardPeriodStatus => ({
  noPeriodsLoaded: false,
  dueDatePassed: false,
  latestPeriod: null,
  openPeriod: { periodYm: iso(closingIn).slice(0, 7), closingDate: iso(closingIn), dueDate: iso(closingIn + 10), loaded },
});

describe("periodToConfirm", () => {
  it("asks only for estimated dates closing within a week", () => {
    expect(periodToConfirm(status(3))?.closingDate).toBe(iso(3));
    expect(periodToConfirm(status(0))).toBeDefined();
    expect(periodToConfirm(status(7))).toBeDefined();
    expect(periodToConfirm(status(8))).toBeUndefined();
    expect(periodToConfirm(status(3, true))).toBeUndefined();
    expect(periodToConfirm(undefined)).toBeUndefined();
  });
});

describe("CardPeriodNudge", () => {
  let current = status(3);
  beforeEach(() => {
    signIn({ householdId: personalSpace.id });
    current = status(3);
    server.use(
      http.get(`${API}/payment-methods/visa/credit-card/periods/status`, () => HttpResponse.json(current)),
      http.put(`${API}/payment-methods/visa/credit-card/periods/:ym`, async ({ request }) => {
        const body = (await request.json()) as { closingDate: string; dueDate: string };
        current = status(3, true);
        return HttpResponse.json({ creditCardId: "cc", periodYm: "x", ...body });
      }),
    );
  });

  it("keeps the estimated dates with Son esas", async () => {
    render(<CardPeriodNudge paymentMethodId="visa" cardName="Visa" />, { wrapper: WithSWR });
    expect(await screen.findByText("Cargá el cierre de este mes de tu Visa")).toBeInTheDocument();
    const [, m, d] = iso(3).split("-").map(Number);
    expect(screen.getByText(new RegExp(`cierra el ${d}/${m}`))).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Son esas" }));
    await waitFor(() => {
      const put = requests().find((r) => r.method === "PUT");
      expect(put && JSON.parse(put.body)).toEqual({ closingDate: iso(3), dueDate: iso(13) });
    });
    await waitFor(() => expect(screen.queryByText("Cargá el cierre de este mes de tu Visa")).not.toBeInTheDocument());
  });

  it("opens the dates with Cambiar fechas", async () => {
    render(<CardPeriodNudge paymentMethodId="visa" cardName="Visa" />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: "Cambiar fechas" }));
    expect(await screen.findByRole("dialog", { name: "Cierre de este mes" })).toBeInTheDocument();
  });

  it("says nothing when the dates are loaded", async () => {
    current = status(3, true);
    const { container } = render(<CardPeriodNudge paymentMethodId="visa" cardName="Visa" />, { wrapper: WithSWR });
    await waitFor(() => expect(requests().some((r) => r.path.endsWith("/periods/status"))).toBe(true));
    expect(container).toBeEmptyDOMElement();
  });
});

