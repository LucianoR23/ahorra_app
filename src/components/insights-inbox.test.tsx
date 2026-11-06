import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it } from "vitest";
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

  // Audit section 10, bug 3 (fixed in 0.1): the filter used to look for types
  // the API never emits; it now asks the API for type=alert.
  it("the Alertas filter asks the API for its goal alerts", async () => {
    renderInbox();
    await screen.findByText("Objetivo al 105%");
    await userEvent.click(screen.getByRole("tab", { name: "Alertas" }));
    expect(await screen.findByText("Objetivo al 105%", {}, { timeout: 1000 })).toBeInTheDocument();
    expect(requestedTypes).toContain("alert");
  });

  it("offers a next page only when totalCount says there is one", async () => {
    server.use(http.get(`${API}/insights`, () => HttpResponse.json(page([goalAlert], 30))));
    renderInbox();
    await screen.findByText("Objetivo al 105%");
    expect(screen.getByRole("button", { name: /siguiente/i })).toBeEnabled();
  });
});
