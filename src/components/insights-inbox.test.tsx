import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { swrFetcher } from "@/lib/api/swr-fetcher";
import { API, server, signIn } from "@/test/msw";
import { InsightsInbox } from "./insights-inbox";

// An insight exactly as the API emits a goal alert today.
const goalAlert = {
  id: "n1",
  householdId: "h1",
  insightDate: "2026-03-12",
  insightType: "alert",
  title: "Objetivo al 105%",
  body: "Llevás $1050.00 gastados de $1000.00 (total_limit).",
  severity: "critical",
  isRead: false,
  createdAt: "2026-03-12T10:00:00Z",
};

function renderInbox() {
  return render(
    <SWRConfig value={{ fetcher: swrFetcher, provider: () => new Map(), dedupingInterval: 0 }}>
      <InsightsInbox />
    </SWRConfig>,
  );
}

const page = (items: unknown[], totalCount = items.length) => ({ items, totalCount, limit: 25, offset: 0 });

// Types the inbox asked the API for, in order.
let requestedTypes: (string | null)[] = [];

beforeEach(() => {
  signIn();
  requestedTypes = [];
  server.use(
    http.get(`${API}/insights`, ({ request }) => {
      const type = new URL(request.url).searchParams.get("type");
      requestedTypes.push(type);
      return HttpResponse.json(page(type === null || type === "alert" ? [goalAlert] : []));
    }),
    http.get(`${API}/insights/unread-count`, () => HttpResponse.json({ unread: 1 })),
  );
});

describe("InsightsInbox", () => {
  it("lists the API's insights", async () => {
    renderInbox();
    expect(await screen.findByText("Objetivo al 105%")).toBeInTheDocument();
  });

  it("links to the notification preferences (plan 10.1)", async () => {
    renderInbox();
    expect(await screen.findByRole("link", { name: "Preferencias de notificaciones" })).toHaveAttribute("href", "/ajustes/notificaciones");
  });

  // Audit section 10, bug 3 (fixed in 0.1): the filter used to look for types
  // the API never emits; it now asks the API for type=alert.
  it("the Alertas filter asks the API for its goal alerts", async () => {
    renderInbox();
    await screen.findByText("Objetivo al 105%");
    await userEvent.click(screen.getByRole("button", { name: "Alertas" }));
    expect(await screen.findByText("Objetivo al 105%", {}, { timeout: 1000 })).toBeInTheDocument();
    expect(requestedTypes).toContain("alert");
  });

  it("offers more only when totalCount says there are more", async () => {
    server.use(http.get(`${API}/insights`, () => HttpResponse.json(page([goalAlert], 30))));
    renderInbox();
    await screen.findByText("Objetivo al 105%");
    expect(screen.getByRole("button", { name: "Cargar más" })).toBeInTheDocument();
  });

  it("shows the unread count and marks an unread one", async () => {
    renderInbox();
    expect(await screen.findByText("1 sin leer")).toBeInTheDocument();
    const row = await screen.findByRole("link", { name: /Objetivo al 105%/ });
    expect(row).toHaveAttribute("href", "/notificaciones/n1");
    expect(row).toHaveTextContent("Sin leer:");
    expect(row).toHaveTextContent("Llevás $1050.00");
  });

  it("marks them all as read from the header", async () => {
    let marked = false;
    server.use(
      http.post(`${API}/insights/mark-all-read`, () => {
        marked = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderInbox();
    await screen.findByText("1 sin leer");
    await userEvent.click(screen.getByRole("button", { name: "Marcar todas como leídas" }));
    await vi.waitFor(() => expect(marked).toBe(true));
  });

  it("searches behind the magnifier", async () => {
    const queries: (string | null)[] = [];
    server.use(
      http.get(`${API}/insights`, ({ request }) => {
        queries.push(new URL(request.url).searchParams.get("q"));
        return HttpResponse.json(page([]));
      }),
    );
    renderInbox();
    await userEvent.click(await screen.findByRole("button", { name: "Buscar" }));
    await userEvent.type(screen.getByLabelText("Buscar en notificaciones"), "visa");
    expect(await screen.findByText("Sin resultados")).toBeInTheDocument();
    expect(queries).toContain("visa");
  });
});
