import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OnboardingPage from "@/app/onboarding/page";
import { API, requests, resetRequests, server, signIn } from "@/test/msw";
import { personalSpace, WithSWR } from "@/test/spaces";
import { useAuthStore } from "@/stores/auth";
import { useHouseholdStore } from "@/stores/household";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), back: vi.fn() }),
  usePathname: () => "/onboarding",
}));
vi.mock("@/components/brand-logo", () => ({ BrandLogo: () => <span>logo</span> }));

const me = { id: "u1", email: "ana@example.test", firstName: "Ana", lastName: "Test", isSuperadmin: false };
const cash = {
  id: "pm1", ownerUserId: "u1", name: "Efectivo", kind: "cash",
  allowsInstallments: false, isActive: true, createdAt: "2026-01-01T00:00:00Z",
};
const galicia = { id: "b1", ownerUserId: "u1", name: "Galicia", isActive: true, createdAt: "2026-01-01T00:00:00Z" };

function api() {
  let pmCount = 1;
  server.use(
    http.get(`${API}/households`, () => HttpResponse.json([personalSpace])),
    http.get(`${API}/payment-methods`, () => HttpResponse.json([cash])),
    http.get(`${API}/banks`, () => HttpResponse.json([galicia])),
    http.patch(`${API}/me`, async ({ request }) => HttpResponse.json({ ...me, ...((await request.json()) as object) })),
    http.post(`${API}/me/onboarding/complete`, () => HttpResponse.json({ ...me, onboardedAt: "2026-11-08T12:00:00Z" })),
    http.post(`${API}/banks`, async ({ request }) => {
      const { name } = (await request.json()) as { name: string };
      return HttpResponse.json({ ...galicia, id: "b-new", name }, { status: 201 });
    }),
    http.post(`${API}/payment-methods`, async ({ request }) => {
      const body = (await request.json()) as { name: string; kind: string };
      pmCount++;
      return HttpResponse.json({ ...cash, ...body, id: `pm${pmCount}` }, { status: 201 });
    }),
    http.post(`${API}/expenses`, () => HttpResponse.json({ expense: { id: "e1" }, installments: [], shares: [] }, { status: 201 })),
    http.get(`${API}/*`, () => HttpResponse.json([])),
  );
}

function stubBrowser(opts: { standalone?: boolean; userAgent?: string; push?: boolean }) {
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("standalone") && !!opts.standalone, media: q, addEventListener() {}, removeEventListener() {} }));
  if (opts.userAgent) vi.spyOn(navigator, "userAgent", "get").mockReturnValue(opts.userAgent);
  if (opts.push) {
    vi.stubGlobal("Notification", { permission: "default", requestPermission: vi.fn(async () => "denied") });
    vi.stubGlobal("PushManager", function PushManager() {});
    Object.defineProperty(navigator, "serviceWorker", { value: {}, configurable: true });
  }
}

async function loadFirstExpense(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "Saltar" })); // name
  await user.click(await screen.findByRole("button", { name: "Saltar" })); // ¿Cómo pagás?
  await screen.findByRole("heading", { name: "Cargá tu primer gasto" });
  await user.type(screen.getByLabelText("Monto"), "1500");
  await user.type(screen.getByLabelText("Descripción"), "Café");
  await user.click(screen.getByLabelText("Método de pago"));
  await user.click(await screen.findByRole("option", { name: /Efectivo/ }));
  await user.click(screen.getByRole("button", { name: "Crear gasto" }));
}

const posts = (path: string) =>
  requests()
    .filter((r) => r.method === "POST" && r.path === path)
    .map((r) => JSON.parse(r.body || "{}"));

beforeEach(() => {
  replace.mockClear();
  resetRequests();
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-08T12:00:00-03:00"));
  signIn({ householdId: personalSpace.id });
  api();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, "serviceWorker");
});

describe("OnboardingPage", () => {
  it("waits on the loading screen until the user's spaces are known", () => {
    useHouseholdStore.setState({ currentId: null, resolvedFor: null });
    render(<OnboardingPage />, { wrapper: WithSWR });
    expect(screen.getByText("Cargando")).toBeInTheDocument();
  });

  it("sends someone who already onboarded home", async () => {
    useAuthStore.setState({ user: { ...me, onboardedAt: "2026-11-01T00:00:00Z" } });
    render(<OnboardingPage />, { wrapper: WithSWR });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(screen.queryByRole("heading", { name: "¿Cómo te llamamos?" })).not.toBeInTheDocument();
  });

  it("walks name, payment methods and cards, then skipping the expense finishes", async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />, { wrapper: WithSWR });

    // 1. Name, prefilled; a change is saved.
    const name = await screen.findByLabelText("Tu nombre");
    expect(name).toHaveValue("Ana");
    expect(screen.getByRole("img", { name: "Paso 1 de 4" })).toBeInTheDocument();
    await user.clear(name);
    await user.type(name, "Anita");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    // 2. ¿Cómo pagás?
    expect(await screen.findByRole("heading", { name: "¿Cómo pagás, Anita?" })).toBeInTheDocument();
    expect(requests().find((r) => r.method === "PATCH" && r.path === "/me")?.body).toBe(JSON.stringify({ firstName: "Anita" }));
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: /Visa/ }));
    await user.click(screen.getByRole("checkbox", { name: /Mercado Pago/ }));
    await user.click(screen.getByRole("radio", { name: "Sí" }));
    await user.click(screen.getByRole("checkbox", { name: /Efectivo o débito/ }));
    await user.click(screen.getByRole("button", { name: "Continuar · 3 elegidos" }));

    // 3. Cards: Visa needs a bank and its days; the Mercado Pago card has its issuer.
    expect(await screen.findByRole("heading", { name: "Tus tarjetas" })).toBeInTheDocument();
    expect(posts("/payment-methods")).toEqual([
      { name: "Mercado Pago", kind: "wallet", allowsInstallments: false },
      { name: "Débito", kind: "debit", allowsInstallments: false },
    ]);
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(await screen.findAllByText("Elegí el banco")).not.toHaveLength(0);
    expect(posts("/payment-methods")).toHaveLength(2);

    await user.click(screen.getByLabelText("Banco"));
    await user.click(await screen.findByRole("option", { name: "Otro" }));
    await user.type(screen.getByLabelText("Nombre del banco"), "Banco Raro");
    const [visaClosing, mpClosing] = screen.getAllByLabelText("Día de cierre");
    const [visaDue, mpDue] = screen.getAllByLabelText("Día de vencimiento");
    await user.type(visaClosing, "25");
    await user.type(visaDue, "5");
    await user.type(mpClosing, "1x0");
    await user.type(mpDue, "20");
    expect(mpClosing).toHaveValue("10");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByRole("heading", { name: "Cargá tu primer gasto" })).toBeInTheDocument();
    expect(posts("/banks")).toEqual([{ name: "Banco Raro" }, { name: "Mercado Pago" }]);
    expect(posts("/payment-methods").slice(2)).toEqual([
      {
        name: "Visa Banco Raro", kind: "credit", bankId: "b-new", allowsInstallments: true,
        creditCard: {
          alias: "Visa Banco Raro", network: "visa", defaultClosingDay: 25, defaultDueDay: 5,
          currentPeriod: { closingDate: "2026-11-25", dueDate: "2026-12-05" },
        },
      },
      {
        name: "Mastercard Mercado Pago", kind: "credit", bankId: "b-new", allowsInstallments: true,
        creditCard: {
          alias: "Mastercard Mercado Pago", network: "mastercard", defaultClosingDay: 10, defaultDueDay: 20,
          currentPeriod: { closingDate: "2026-11-10", dueDate: "2026-11-20" },
        },
      },
    ]);

    // 4. Skipping the first expense still marks onboarding done and goes home.
    await user.click(screen.getByRole("button", { name: "Saltar" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(posts("/me/onboarding/complete")).toHaveLength(1);
    expect(useAuthStore.getState().user?.onboardedAt).toBe("2026-11-08T12:00:00Z");
  });

  it("skips the cards step when no card was picked, and reuses a bank the user has", async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />, { wrapper: WithSWR });
    await user.click(await screen.findByRole("button", { name: "Saltar" }));
    await user.click(await screen.findByRole("checkbox", { name: /Efectivo o débito/ }));
    await user.click(screen.getByRole("button", { name: "Continuar · 1 elegido" }));
    expect(await screen.findByRole("heading", { name: "Cargá tu primer gasto" })).toBeInTheDocument();
    expect(requests().some((r) => r.method === "PATCH" && r.path === "/me")).toBe(false);
  });

  it("names the card after the bank picked from the list, and lets the user rename it", async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />, { wrapper: WithSWR });
    await user.click(await screen.findByRole("button", { name: "Saltar" }));
    await user.click(await screen.findByRole("checkbox", { name: /American Express/ }));
    await user.click(screen.getByRole("button", { name: /Continuar · 1/ }));

    expect(await screen.findByRole("heading", { name: "Tu tarjeta" })).toBeInTheDocument();
    await user.click(screen.getByLabelText("Banco"));
    await user.click(await screen.findByRole("option", { name: "Galicia" }));
    expect(screen.getByRole("heading", { name: "American Express Galicia" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toHaveAttribute("placeholder", "American Express Galicia");
    await user.type(screen.getByLabelText("Nombre"), "Amex Gold");
    await user.type(screen.getByLabelText("Día de cierre"), "31");
    await user.type(screen.getByLabelText("Día de vencimiento"), "10");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    await screen.findByRole("heading", { name: "Cargá tu primer gasto" });
    expect(posts("/banks")).toEqual([]);
    expect(posts("/payment-methods")).toEqual([
      expect.objectContaining({ name: "Amex Gold", bankId: "b1", creditCard: expect.objectContaining({ alias: "Amex Gold", network: "amex" }) }),
    ]);
  });

  it("shows the API's message when a card can't be saved", async () => {
    server.use(
      http.post(`${API}/payment-methods`, () =>
        HttpResponse.json({ code: "validation", message: "El cierre no es válido", field: "x" }, { status: 422 }),
      ),
    );
    const user = userEvent.setup();
    render(<OnboardingPage />, { wrapper: WithSWR });
    await user.click(await screen.findByRole("button", { name: "Saltar" }));
    await user.click(await screen.findByRole("checkbox", { name: /Visa/ }));
    await user.click(screen.getByRole("button", { name: /Continuar · 1/ }));
    await user.click(await screen.findByLabelText("Banco"));
    await user.click(await screen.findByRole("option", { name: "Galicia" }));
    await user.type(screen.getByLabelText("Día de cierre"), "25");
    await user.type(screen.getByLabelText("Día de vencimiento"), "5");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("El cierre no es válido");
    expect(screen.getByRole("heading", { name: "Tu tarjeta" })).toBeInTheDocument();
  });

  it("after the first expense, without push or install to offer, goes home", async () => {
    stubBrowser({});
    const user = userEvent.setup();
    render(<OnboardingPage />, { wrapper: WithSWR });
    await loadFirstExpense(user);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(posts("/expenses")).toHaveLength(1);
    expect(posts("/me/onboarding/complete")).toHaveLength(1);
    expect(replace).not.toHaveBeenCalledWith("/movimientos/e1");
  });

  it("after the first expense asks for push, then shows the iPhone install steps", async () => {
    stubBrowser({ push: true, standalone: false, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Safari/604.1" });
    // iOS Safari outside the app can't ask for push: only the install steps show.
    const user = userEvent.setup();
    render(<OnboardingPage />, { wrapper: WithSWR });
    await loadFirstExpense(user);
    expect(await screen.findByRole("heading", { name: /a mano/ })).toBeInTheDocument();
    expect(screen.getByText("Tocá Compartir")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Listo" }));
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("asks for push where the browser supports it; a denial still moves on", async () => {
    stubBrowser({ push: true });
    server.use(http.get(`${API}/push/vapid-public-key`, () => HttpResponse.json({ publicKey: "test-key" })));
    const user = userEvent.setup();
    render(<OnboardingPage />, { wrapper: WithSWR });
    await loadFirstExpense(user);
    expect(await screen.findByRole("heading", { name: "¿Te avisamos?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Activar avisos" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(Notification.requestPermission).toHaveBeenCalled();
  });

  it("offers the browser's install prompt when there is one", async () => {
    stubBrowser({ push: true });
    const prompt = vi.fn(async () => {});
    const user = userEvent.setup();
    render(<OnboardingPage />, { wrapper: WithSWR });
    const event = Object.assign(new Event("beforeinstallprompt"), { prompt, userChoice: Promise.resolve({ outcome: "accepted" }) });
    window.dispatchEvent(event);
    await loadFirstExpense(user);
    await user.click(await screen.findByRole("button", { name: "Ahora no" }));
    await user.click(await screen.findByRole("button", { name: "Instalar la app" }));
    expect(prompt).toHaveBeenCalled();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });
});
