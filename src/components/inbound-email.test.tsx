import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it } from "vitest";
import type { InboundMessage } from "@/lib/api/hooks";
import { API, requests, resetRequests, server, signIn } from "@/test/msw";
import { swrTestConfig } from "@/test/spaces";
import { GMAIL_FILTER, InboundEmail, mailHref } from "./inbound-email";
import { InboundPendingCard } from "./inbound-pending-card";

const ADDRESS = "in+u_abcdefghijklmnop@in-next.example.test";

const pending: InboundMessage = {
  id: "11111111-1111-1111-1111-111111111111",
  kind: "expense",
  status: "pending",
  source: "mercadopago",
  reading: { amount: 15430.5, currency: "ARS", date: "2026-11-12", installments: 0, payment: "mercado pago", description: "Carrefour" },
  sentence: "Carrefour 15430,50 mercado pago ayer",
  sender: null,
  gmailCode: null,
  receivedAt: "2026-11-13T00:10:00Z",
};
const senderPending: InboundMessage = {
  ...pending,
  id: "22222222-2222-2222-2222-222222222222",
  status: "sender_pending",
  reading: null,
  sentence: null,
  sender: "otra@outlook.com",
};
const code: InboundMessage = {
  ...pending,
  id: "33333333-3333-3333-3333-333333333333",
  kind: "gmail_confirmation",
  reading: null,
  sentence: null,
  gmailCode: "987654321",
};

function serve(messages: InboundMessage[], addressStatus = 200) {
  server.use(
    http.get(`${API}/inbound/address`, () =>
      addressStatus === 200
        ? HttpResponse.json({ address: ADDRESS })
        : HttpResponse.json({ code: "inbound_off", message: "off" }, { status: addressStatus }),
    ),
    http.get(`${API}/inbound/messages`, () => HttpResponse.json(messages)),
    http.post(`${API}/inbound/messages/:id/:action`, () => new HttpResponse(null, { status: 204 })),
  );
}

const wrap = (ui: React.ReactNode) => render(<SWRConfig value={swrTestConfig}>{ui}</SWRConfig>);

beforeEach(() => {
  signIn();
  resetRequests();
});

describe("Gastos por mail (plan 3.5)", () => {
  it("shows the address, Gmail's code and the guide, and copies them", async () => {
    serve([code]);
    const user = userEvent.setup();
    wrap(<InboundEmail />);
    expect(await screen.findByTestId("inbound-address")).toHaveTextContent(ADDRESS);
    expect(await screen.findByText("987654321")).toBeInTheDocument();
    expect(screen.getByText(GMAIL_FILTER)).toBeInTheDocument();
    expect(screen.queryByText("Para revisar")).not.toBeInTheDocument();

    const [copyAddress] = screen.getAllByRole("button", { name: "Copiar" });
    await user.click(copyAddress);
    expect(await navigator.clipboard.readText()).toBe(ADDRESS);
  });

  it("lists mails to load, and dismisses one", async () => {
    serve([pending]);
    const user = userEvent.setup();
    wrap(<InboundEmail />);
    const row = (await screen.findByText("Carrefour 15430,50 mercado pago ayer")).closest("li")!;
    expect(within(row).getByRole("link", { name: "Cargar" })).toHaveAttribute("href", mailHref(pending.id));
    await user.click(within(row).getByRole("button", { name: "Descartar" }));
    await waitFor(() =>
      expect(requests().some((r) => r.method === "POST" && r.path === `/inbound/messages/${pending.id}/dismiss`)).toBe(true),
    );
  });

  it("asks whether another forwarding address is the person's", async () => {
    serve([senderPending]);
    const user = userEvent.setup();
    wrap(<InboundEmail />);
    expect(await screen.findByText("Llegó un mail reenviado desde otra@outlook.com. ¿Es tuyo?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sí, es mío" }));
    await waitFor(() =>
      expect(
        requests().some((r) => r.method === "POST" && r.path === `/inbound/messages/${senderPending.id}/accept-sender`),
      ).toBe(true),
    );
  });

  it("says it is not available while the server has it off", async () => {
    serve([], 503);
    wrap(<InboundEmail />);
    expect(await screen.findByText(/todavía no está disponible/)).toBeInTheDocument();
  });
});

describe("InboundPendingCard (plan 3.5)", () => {
  it("counts the mails to review and links to the screen", async () => {
    serve([pending, senderPending, code]);
    wrap(<InboundPendingCard />);
    const link = await screen.findByRole("link", { name: /Tenés 2 gastos por mail para revisar/ });
    expect(link).toHaveAttribute("href", "/gastos-por-mail");
  });

  it("is hidden with nothing to review", async () => {
    serve([code]);
    const { container } = wrap(<InboundPendingCard />);
    await waitFor(() => expect(requests().some((r) => r.path === "/inbound/messages")).toBe(true));
    expect(container).toBeEmptyDOMElement();
  });
});
