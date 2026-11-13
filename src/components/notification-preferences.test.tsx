import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { SWRConfig } from "swr";
import { swrTestConfig } from "@/test/spaces";
import { beforeEach, describe, expect, it } from "vitest";
import type { NotificationPreferences as Prefs } from "@/lib/api/hooks";
import { API, server, signIn } from "@/test/msw";
import { NotificationPreferences } from "./notification-preferences";

function defaults(): Prefs {
  return {
    kinds: [
      { kind: "shared_expense", channels: { in_app: true, push: true } },
      { kind: "settlement", channels: { in_app: true, push: true } },
      { kind: "cards", channels: { in_app: true, push: true } },
      { kind: "installments", channels: { in_app: true, push: true } },
      { kind: "goals", channels: { in_app: true } },
      { kind: "recurring", channels: { in_app: true } },
      { kind: "weekly_review", channels: { in_app: true } },
      { kind: "monthly_report", channels: { email: true } },
    ],
    quietHours: { enabled: true, start: "23:00", end: "08:00" },
    dailyReminder: { enabled: false, at: "21:00" },
    timezone: "America/Argentina/Buenos_Aires",
  };
}

/** Serves the preferences and records every PUT body. */
function serve(initial = defaults()) {
  const puts: Prefs[] = [];
  let current = initial;
  server.use(
    http.get(`${API}/me/notification-preferences`, () => HttpResponse.json(current)),
    http.put(`${API}/me/notification-preferences`, async ({ request }) => {
      const body = (await request.json()) as Prefs;
      puts.push(body);
      current = { ...body, timezone: current.timezone };
      return HttpResponse.json(current);
    }),
  );
  return puts;
}

function renderScreen() {
  return render(
    <SWRConfig value={swrTestConfig}>
      <NotificationPreferences />
    </SWRConfig>,
  );
}

beforeEach(() => signIn());

describe("NotificationPreferences (plan 10.1)", () => {
  it("shows each kind with only its channels, and the quiet hours", async () => {
    serve();
    renderScreen();
    expect(await screen.findByText("Gastos compartidos")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Gastos compartidos: Push" })).toBeChecked();
    expect(screen.queryByRole("switch", { name: "Gastos compartidos: Email" })).not.toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Resumen mensual: Email" })).toBeChecked();
    expect(screen.queryByRole("switch", { name: "Resumen semanal: Push" })).not.toBeInTheDocument();
    expect(screen.getByText("De 23:00 a 08:00.")).toBeInTheDocument();
    expect(screen.getByText(/Hora de Buenos Aires\./)).toBeInTheDocument();
  });

  it("saves a muted channel right away", async () => {
    const puts = serve();
    const user = userEvent.setup();
    renderScreen();
    await user.click(await screen.findByRole("switch", { name: "Tarjetas: Push" }));
    await waitFor(() => expect(puts).toHaveLength(1));
    const cards = puts[0].kinds.find((k) => k.kind === "cards");
    expect(cards?.channels).toEqual({ in_app: true, push: false });
    expect(puts[0].quietHours).toEqual({ enabled: true, start: "23:00", end: "08:00" });
    expect(screen.getByRole("switch", { name: "Tarjetas: Push" })).not.toBeChecked();
  });

  it("turns quiet hours off and hides the times", async () => {
    const puts = serve();
    const user = userEvent.setup();
    renderScreen();
    await user.click(await screen.findByRole("switch", { name: "Silenciar push de noche" }));
    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0].quietHours.enabled).toBe(false);
    expect(await screen.findByText("Apagado: las push llegan a cualquier hora.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Desde")).not.toBeInTheDocument();
  });

  it("goes back when saving fails", async () => {
    serve();
    server.use(http.put(`${API}/me/notification-preferences`, () => HttpResponse.json({ error: "boom" }, { status: 500 })));
    const user = userEvent.setup();
    renderScreen();
    const sw = await screen.findByRole("switch", { name: "Pagos entre ustedes: App" });
    await user.click(sw);
    await waitFor(() => expect(screen.getByRole("switch", { name: "Pagos entre ustedes: App" })).toBeChecked());
  });

  describe("daily reminder (plan 10.2)", () => {
    it("is off by default and turns on at 21:00", async () => {
      const puts = serve();
      const user = userEvent.setup();
      renderScreen();
      const sw = await screen.findByRole("switch", { name: "Recordarme cargar lo que gasté" });
      expect(sw).not.toBeChecked();
      expect(screen.queryByLabelText("A qué hora")).not.toBeInTheDocument();
      await user.click(sw);
      await waitFor(() => expect(puts).toHaveLength(1));
      expect(puts[0].dailyReminder).toEqual({ enabled: true, at: "21:00" });
      expect(puts[0].quietHours).toEqual({ enabled: true, start: "23:00", end: "08:00" });
      expect(await screen.findByText("A las 21:00: «¿Hoy no gastaste nada?»")).toBeInTheDocument();
      expect(screen.getByLabelText("A qué hora")).toBeInTheDocument();
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("warns when the time falls in the quiet hours", async () => {
      serve({ ...defaults(), quietHours: { enabled: true, start: "20:00", end: "08:00" }, dailyReminder: { enabled: true, at: "21:00" } });
      renderScreen();
      expect(await screen.findByRole("status")).toHaveTextContent("cae en tu horario de silencio");
    });

    it("works with an API that does not send it yet", async () => {
      const old = defaults();
      delete old.dailyReminder;
      serve(old);
      renderScreen();
      expect(await screen.findByRole("switch", { name: "Recordarme cargar lo que gasté" })).not.toBeChecked();
    });
  });
});
