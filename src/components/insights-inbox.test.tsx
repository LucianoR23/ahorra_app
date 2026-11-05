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

beforeEach(() => {
  signIn();
  server.use(
    http.get(`${API}/insights`, () => HttpResponse.json([goalAlert])),
    http.get(`${API}/insights/unread-count`, () => HttpResponse.json({ unread: 1 })),
  );
});

describe("InsightsInbox", () => {
  it("lists the API's insights", async () => {
    renderInbox();
    expect(await screen.findByText("Objetivo al 105%")).toBeInTheDocument();
  });

  // Audit section 10, bug 3: the "Alertas" filter looks for
  // alert_goal_warning / alert_goal_exceeded, but the API emits "alert".
  it.fails("the Alertas filter keeps the API's goal alerts", async () => {
    renderInbox();
    await screen.findByText("Objetivo al 105%");
    await userEvent.click(screen.getByRole("tab", { name: "Alertas" }));
    expect(await screen.findByText("Objetivo al 105%", {}, { timeout: 1000 })).toBeInTheDocument();
  });
});
