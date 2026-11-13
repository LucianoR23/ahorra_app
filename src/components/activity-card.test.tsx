import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { SWRConfig } from "swr";
import { swrTestConfig } from "@/test/spaces";
import { beforeEach, describe, expect, it } from "vitest";
import { API, server, signIn } from "@/test/msw";
import { ActivityCard, activityLabel } from "./activity-card";

function renderCard() {
  return render(
    <SWRConfig value={swrTestConfig}>
      <ActivityCard />
    </SWRConfig>,
  );
}

beforeEach(() => signIn());

describe("ActivityCard", () => {
  it("lists the account's events with labels, device, IP and time in Buenos Aires", async () => {
    server.use(
      http.get(`${API}/me/activity`, () =>
        HttpResponse.json({
          items: [
            { action: "login.failed", device: "Safari en iOS", ip: "203.0.113.7", createdAt: "2026-11-06T13:41:00Z" },
            { action: "password.changed", device: "Chrome en Windows", createdAt: "2026-11-05T01:10:00Z" },
          ],
        }),
      ),
    );
    renderCard();
    expect(await screen.findByText("Intento de inicio de sesión fallido")).toBeInTheDocument();
    expect(screen.getByText("Safari en iOS · 203.0.113.7")).toBeInTheDocument();
    expect(screen.getByText("Cambiaste tu contraseña")).toBeInTheDocument();
    expect(screen.getByText("Chrome en Windows")).toBeInTheDocument(); // IP gone after 7 days
    // 01:10 UTC on the 5th is 22:10 on the 4th in Buenos Aires.
    expect(screen.getByText(/4\/11.*22:10/)).toBeInTheDocument();
  });

  it("says when there is nothing yet", async () => {
    server.use(http.get(`${API}/me/activity`, () => HttpResponse.json({ items: [] })));
    renderCard();
    expect(await screen.findByText("Todavía no hay actividad registrada.")).toBeInTheDocument();
  });

  it("falls back to a generic label for actions it does not know", () => {
    expect(activityLabel({ action: "something.new", device: "", createdAt: "" })).toBe("Actividad de la cuenta");
  });
});
