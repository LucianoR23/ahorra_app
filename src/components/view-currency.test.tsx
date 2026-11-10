import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { PesosNotice, UsdViewNote } from "./view-currency";
import { API, server, signIn } from "@/test/msw";
import { personalSpace, WithSWR } from "@/test/spaces";
import { useViewCurrencyStore } from "@/stores/view-currency";

beforeEach(() => {
  signIn({ householdId: personalSpace.id });
  useViewCurrencyStore.setState({ usd: false, today: false });
});

describe("Ver en dólares (plan 5.3)", () => {
  it("screens paid in pesos say so only while viewing dollars", async () => {
    const { rerender } = render(<PesosNotice what="Los resúmenes y las cuotas" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    useViewCurrencyStore.setState({ usd: true });
    rerender(<PesosNotice what="Los resúmenes y las cuotas" />);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Los resúmenes y las cuotas se muestran en pesos, porque así se pagan. Pasarlos a dólares queda para más adelante.",
    );
  });

  it("offers pesos back when the space's dollar has no quotes", async () => {
    server.use(
      http.get(`${API}/households`, () => HttpResponse.json([personalSpace])),
      http.get(`${API}/reports/monthly`, () =>
        HttpResponse.json({ error: { code: "conflict", message: "Todavía no tenemos la cotización de ese dólar." } }, { status: 409 }),
      ),
    );
    useViewCurrencyStore.setState({ usd: true });
    render(<UsdViewNote />, { wrapper: WithSWR });
    expect(await screen.findByRole("alert")).toHaveTextContent("Todavía no tenemos la cotización de tu dólar");
    await userEvent.click(screen.getByRole("button", { name: "Ver en pesos" }));
    expect(useViewCurrencyStore.getState().usd).toBe(false);
  });
});
