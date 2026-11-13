import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExpenseForm } from "./expense-form";
import { API, requests, resetRequests, server, signIn } from "@/test/msw";
import { hogarSpace, personalSpace, WithSWR } from "@/test/spaces";
import { useHouseholdStore } from "@/stores/household";
import { STORAGE_KEYS } from "@/lib/storage-keys";

const replace = vi.fn();
const resize = vi.hoisted(() => vi.fn());
vi.mock("@/lib/resize-image", async (orig) => ({
  ...(await orig<typeof import("@/lib/resize-image")>()),
  resizeImage: resize,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, back: vi.fn(), push: vi.fn() }) }));

const cash = {
  id: "pm1", ownerUserId: "u1", name: "Efectivo", kind: "cash",
  allowsInstallments: false, isActive: true, createdAt: "2026-01-01T00:00:00Z",
};
const category = (id: string, householdId: string, name: string) => ({
  id, householdId, name, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
});

function api(households: unknown[]) {
  server.use(
    http.get(`${API}/households`, () => HttpResponse.json(households)),
    http.get(`${API}/payment-methods`, () => HttpResponse.json([cash])),
    http.get(`${API}/categories`, ({ request }) =>
      HttpResponse.json(
        request.headers.get("x-household-id") === hogarSpace.id
          ? [category("c-h", hogarSpace.id, "Súper del hogar")]
          : [category("c-p", personalSpace.id, "Mis gustos")],
      ),
    ),
    http.get(`${API}/households/${hogarSpace.id}/members`, () =>
      HttpResponse.json([
        { userId: "u1", email: "ana@example.test", firstName: "Ana", lastName: "Test", role: "owner", joinedAt: "2026-01-01T00:00:00Z" },
        { userId: "u2", email: "beto@example.test", firstName: "Beto", lastName: "Test", role: "member", joinedAt: "2026-01-01T00:00:00Z" },
      ]),
    ),
    http.post(`${API}/expenses`, () => HttpResponse.json({ expense: { id: "e1" }, installments: [], shares: [] }, { status: 201 })),
    http.post(`${API}/categories/suggest`, () => HttpResponse.json({ categoryId: null, source: null })),
    // Last: the first matching handler wins.
    http.get(`${API}/*`, () => HttpResponse.json([])),
  );
}

async function fillAndSubmit() {
  await userEvent.type(screen.getByLabelText("Monto"), "1500");
  await userEvent.type(screen.getByLabelText("Descripción"), "Café");
  await userEvent.click(screen.getByLabelText("Pago"));
  await userEvent.click(await screen.findByRole("option", { name: /Efectivo/ }));
  await userEvent.click(screen.getByRole("button", { name: "Guardar gasto" }));
}

const expensePost = () => requests().find((r) => r.method === "POST" && r.path === "/expenses");

beforeEach(() => {
  replace.mockClear();
  resetRequests();
  localStorage.clear();
  signIn({ householdId: personalSpace.id });
});

describe("ExpenseForm spaces (plan 1.2)", () => {
  it("without a hogar there is no Compartido switch and the expense goes to Mi plata", async () => {
    api([personalSpace]);
    render(<ExpenseForm />, { wrapper: WithSWR });
    await screen.findByLabelText("Monto");
    expect(screen.queryByRole("switch", { name: "Compartido" })).not.toBeInTheDocument();

    await fillAndSubmit();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/movimientos/e1"));
    const post = expensePost()!;
    expect(post.headers.get("x-household-id")).toBe(personalSpace.id);
    await expect.poll(() => JSON.parse(post.body || "{}").isShared).toBe(false);
  });

  it("Compartido sends it to the hogar, with its categories, and is remembered", async () => {
    api([personalSpace, hogarSpace]);
    render(<ExpenseForm />, { wrapper: WithSWR });
    const toggle = await screen.findByRole("switch", { name: "Compartido" });
    expect(toggle).not.toBeChecked();
    expect(screen.getByText("Va a Mi plata. Activalo para sumarlo al Hogar.")).toBeInTheDocument();

    await userEvent.click(toggle);
    expect(screen.getByText(/Va a Casa y se divide/)).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEYS.expenseShared)).toBe("1");
    await userEvent.click(screen.getByLabelText("Categoría"));
    expect(await screen.findByRole("option", { name: "Súper del hogar" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Mis gustos" })).not.toBeInTheDocument();
    await userEvent.keyboard("{Escape}");

    await fillAndSubmit();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/movimientos/e1"));
    const post = expensePost()!;
    expect(post.headers.get("x-household-id")).toBe(hogarSpace.id);
    await expect.poll(() => JSON.parse(post.body || "{}").isShared).toBe(true);
    // The detail page reads the current space: it switched to the hogar.
    expect(useHouseholdStore.getState().currentId).toBe(hogarSpace.id);
  });

  it("starts with the last choice", async () => {
    localStorage.setItem(STORAGE_KEYS.expenseShared, "1");
    api([personalSpace, hogarSpace]);
    render(<ExpenseForm />, { wrapper: WithSWR });
    expect(await screen.findByRole("switch", { name: "Compartido" })).toBeChecked();
  });
});

describe("ExpenseForm layout (design CargarGasto, plan 1.10b)", () => {
  const visa = {
    id: "visa", ownerUserId: "u1", name: "Visa", kind: "credit",
    allowsInstallments: true, isActive: true, createdAt: "2026-01-01T00:00:00Z",
  };

  function withCard(periods: unknown[]) {
    api([personalSpace]);
    server.use(
      http.get(`${API}/payment-methods`, () => HttpResponse.json([cash, visa])),
      http.get(`${API}/payment-methods/visa/credit-card`, () =>
        HttpResponse.json({ paymentMethodId: "visa", bankId: null, network: "visa", alias: "Visa", lastFour: "4417", defaultClosingDay: 28, defaultDueDay: 8, debitPaymentMethodId: null }),
      ),
      http.get(`${API}/payment-methods/visa/credit-card/periods`, () => HttpResponse.json(periods)),
    );
  }

  it("sends the currency picked next to the amount", async () => {
    api([personalSpace]);
    render(<ExpenseForm />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("radio", { name: "USD" }));
    await fillAndSubmit();
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(JSON.parse(expensePost()!.body || "{}")).toMatchObject({ currency: "USD", amount: 1500, description: "Café" });
  });

  it("says which statement the first installment lands in", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-09T12:00:00-03:00"));
    withCard([{ periodYm: "2026-11", closingDate: "2026-11-28", dueDate: "2026-12-08" }]);
    render(<ExpenseForm />, { wrapper: WithSWR });
    await userEvent.type(await screen.findByLabelText("Monto"), "120000");
    await userEvent.click(screen.getByLabelText("Pago"));
    await userEvent.click(await screen.findByRole("option", { name: /Visa/ }));
    const n = await screen.findByLabelText("Cuotas");
    // Clearing would leave 1 (the minimum) and typing would make it 16.
    fireEvent.change(n, { target: { value: "6" } });
    expect(await screen.findByText(/La primera entra/)).toHaveTextContent("La primera entra en el resumen que cierra el 28/11 y vence el 8/12.");
    expect(screen.getAllByText((_, el) => el?.tagName === "SPAN" && el.textContent?.replace(/\s+/g, " ") === "de $ 20.000")[0]).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("names the month when its dates are not loaded", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-09T12:00:00-03:00"));
    withCard([]);
    render(<ExpenseForm />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByLabelText("Pago"));
    await userEvent.click(await screen.findByRole("option", { name: /Visa/ }));
    expect(await screen.findByText(/Entra en el resumen/)).toHaveTextContent("Entra en el resumen de noviembre.");
    vi.useRealTimers();
  });

  it("says what is missing", async () => {
    api([personalSpace]);
    render(<ExpenseForm />, { wrapper: WithSWR });
    await userEvent.click(await screen.findByRole("button", { name: "Guardar gasto" }));
    expect(screen.getByText("Ingresá un monto mayor a 0")).toBeInTheDocument();
    expect(screen.getByText("Contá qué compraste")).toBeInTheDocument();
    expect(screen.getByText("Elegí con qué pagaste")).toBeInTheDocument();
    expect(expensePost()).toBeUndefined();
  });
});

describe("ExpenseForm filled in (Cargar compra, plan 4.8)", () => {
  it("starts with the simulated purchase and saves it with a description", async () => {
    api([personalSpace]);
    render(<ExpenseForm initial={{ amount: 1500.5, currency: "USD", paymentMethodId: "pm1", categoryId: "c-p" }} />, {
      wrapper: WithSWR,
    });
    expect(await screen.findByLabelText("Monto")).toHaveValue("1500,5");
    await userEvent.type(screen.getByLabelText("Descripción"), "Heladera");
    await userEvent.click(screen.getByRole("button", { name: "Guardar gasto" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/movimientos/e1"));
    expect(JSON.parse(expensePost()!.body || "{}")).toMatchObject({
      amount: 1500.5,
      currency: "USD",
      paymentMethodId: "pm1",
      categoryId: "c-p",
      description: "Heladera",
    });
  });
});

describe("ExpenseForm auto-categorization (plan 8.4)", () => {
  const suggestPosts = () => requests().filter((r) => r.method === "POST" && r.path === "/categories/suggest");
  // Answers with the space's own category, as the API does.
  function suggests(source: "history" | "ai") {
    server.use(
      http.post(`${API}/categories/suggest`, ({ request }) =>
        HttpResponse.json({ categoryId: request.headers.get("x-household-id") === hogarSpace.id ? "c-h" : "c-p", source }),
      ),
    );
  }
  const categoryRow = () => screen.getByLabelText("Categoría");

  it("fills the category from history when the description loses focus, and saves it", async () => {
    api([personalSpace]);
    suggests("history");
    render(<ExpenseForm />, { wrapper: WithSWR });
    await userEvent.type(await screen.findByLabelText("Descripción"), "Coto");
    await userEvent.tab();
    expect(await screen.findByText("Como la última vez")).toBeInTheDocument();
    expect(categoryRow()).toHaveTextContent("Mis gustos");
    const post = suggestPosts()[0];
    expect(post.headers.get("x-household-id")).toBe(personalSpace.id);
    expect(JSON.parse(post.body || "{}")).toEqual({ description: "Coto" });

    // The same description is not asked twice.
    await userEvent.click(screen.getByLabelText("Descripción"));
    await userEvent.tab();
    expect(suggestPosts()).toHaveLength(1);

    await userEvent.type(screen.getByLabelText("Monto"), "1500");
    await userEvent.click(screen.getByLabelText("Pago"));
    await userEvent.click(await screen.findByRole("option", { name: /Efectivo/ }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar gasto" }));
    await waitFor(() => expect(expensePost()).toBeDefined());
    expect(JSON.parse(expensePost()!.body || "{}").categoryId).toBe("c-p");
  });

  it("says when the AI picked it, and leaves the category empty without a suggestion", async () => {
    api([personalSpace]);
    render(<ExpenseForm />, { wrapper: WithSWR });
    await userEvent.type(await screen.findByLabelText("Descripción"), "Cosas varias");
    await userEvent.tab();
    await waitFor(() => expect(suggestPosts()).toHaveLength(1));
    expect(categoryRow()).toHaveTextContent("Sin categoría");

    suggests("ai");
    await userEvent.type(screen.getByLabelText("Descripción"), " de farmacia");
    await userEvent.tab();
    expect(await screen.findByText("Sugerida automáticamente")).toBeInTheDocument();
  });

  it("stops once the person picks a category", async () => {
    api([personalSpace]);
    suggests("history");
    render(<ExpenseForm />, { wrapper: WithSWR });
    await screen.findByLabelText("Descripción");
    await userEvent.click(categoryRow());
    await userEvent.click(await screen.findByRole("option", { name: /Sin categoría/ }));
    await userEvent.type(screen.getByLabelText("Descripción"), "Coto");
    await userEvent.tab();
    expect(suggestPosts()).toHaveLength(0);
    expect(screen.queryByText("Como la última vez")).not.toBeInTheDocument();
  });

  it("asks again in the hogar when Compartido changes the space", async () => {
    api([personalSpace, hogarSpace]);
    suggests("history");
    render(<ExpenseForm />, { wrapper: WithSWR });
    await userEvent.type(await screen.findByLabelText("Descripción"), "Coto");
    await userEvent.tab();
    await waitFor(() => expect(categoryRow()).toHaveTextContent("Mis gustos"));
    await userEvent.click(screen.getByRole("switch", { name: "Compartido" }));
    await waitFor(() => expect(categoryRow()).toHaveTextContent("Súper del hogar"));
    expect(suggestPosts().map((r) => r.headers.get("x-household-id"))).toEqual([personalSpace.id, hogarSpace.id]);
  });

  it("never asks when the category came filled in", async () => {
    api([personalSpace]);
    suggests("history");
    render(<ExpenseForm initial={{ categoryId: "c-p" }} />, { wrapper: WithSWR });
    await userEvent.type(await screen.findByLabelText("Descripción"), "Heladera");
    await userEvent.tab();
    expect(suggestPosts()).toHaveLength(0);
  });
});

describe("ExpenseForm natural-language entry (plan 3.1)", () => {
  const method = (id: string, name: string, kind: string, allowsInstallments = false) => ({
    ...cash, id, name, kind, allowsInstallments,
  });
  const methods = [
    cash,
    method("pm-mp", "Mercado Pago", "wallet", true),
    method("pm-vg", "Visa Galicia", "debit"),
    method("pm-vs", "Visa Santander", "debit"),
  ];
  const empty = {
    understood: true, notFinance: false, source: "rules", amount: null, currency: null, spentAt: null,
    installments: null, description: null, paymentMethodId: null, paymentCandidates: [], shared: false,
    categoryId: null, categorySource: null,
  };
  function parses(answer: Partial<typeof empty> | Record<string, unknown>) {
    server.use(
      http.get(`${API}/payment-methods`, () => HttpResponse.json(methods)),
      http.post(`${API}/expenses/parse`, () => HttpResponse.json({ ...empty, ...answer })),
    );
  }
  const parsePosts = () => requests().filter((r) => r.method === "POST" && r.path === "/expenses/parse");
  const box = () => screen.findByLabelText("Contalo como te salga");

  it("fills the rows from the sentence on Enter, and saves them", async () => {
    api([personalSpace]);
    parses({
      amount: 120000, currency: "USD", spentAt: "2026-11-11", installments: 6, description: "Zapatillas",
      paymentMethodId: "pm-mp", categoryId: "c-p", categorySource: "history",
    });
    render(<ExpenseForm />, { wrapper: WithSWR });
    await userEvent.type(await box(), "zapatillas 120 mil en 6 cuotas con mp ayer{Enter}");
    expect(await screen.findByText("Lo entendimos así. Tocá un dato para cambiarlo.")).toBeInTheDocument();
    expect(screen.getByLabelText("Monto")).toHaveValue("120000");
    expect(screen.getByLabelText("Descripción")).toHaveValue("Zapatillas");
    expect(screen.getByLabelText("Pago")).toHaveTextContent("Mercado Pago");
    expect(screen.getByLabelText("Cuotas")).toHaveValue(6);
    expect(screen.getByLabelText("Categoría")).toHaveTextContent("Mis gustos");
    expect(screen.getByText("Como la última vez")).toBeInTheDocument();

    const post = parsePosts()[0];
    expect(post.headers.get("x-household-id")).toBe(personalSpace.id);
    expect(JSON.parse(post.body || "{}")).toEqual({ text: "zapatillas 120 mil en 6 cuotas con mp ayer" });
    // The category came with the sentence: no second request.
    expect(requests().filter((r) => r.path === "/categories/suggest")).toHaveLength(0);

    await userEvent.click(screen.getByRole("button", { name: "Guardar gasto" }));
    await waitFor(() => expect(expensePost()).toBeDefined());
    expect(JSON.parse(expensePost()!.body || "{}")).toMatchObject({
      amount: 120000, currency: "USD", spentAt: "2026-11-11", installments: 6, description: "Zapatillas",
      paymentMethodId: "pm-mp", categoryId: "c-p",
    });
  });

  it("leaves Pago empty when the words fit several methods, and lists those first", async () => {
    api([personalSpace]);
    parses({ amount: 2500, description: "Café", paymentCandidates: ["pm-vg", "pm-vs"] });
    render(<ExpenseForm />, { wrapper: WithSWR });
    await userEvent.type(await box(), "café 2500 visa{Enter}");
    expect(await screen.findByText("Tenés 2 Visa: elegí cuál")).toBeInTheDocument();
    expect(screen.getByLabelText("Pago")).toHaveTextContent("Elegí");

    await userEvent.click(screen.getByLabelText("Pago"));
    const options = await screen.findAllByRole("option");
    expect(options.slice(0, 2).map((o) => o.textContent)).toEqual([
      expect.stringContaining("Visa Galicia"),
      expect.stringContaining("Visa Santander"),
    ]);
    await userEvent.click(options[1]);
    expect(screen.getByLabelText("Pago")).toHaveTextContent("Visa Santander");
    expect(screen.queryByText("Tenés 2 Visa: elegí cuál")).not.toBeInTheDocument();
  });

  it("reads each sentence once, also when the box loses focus", async () => {
    api([personalSpace]);
    parses({ amount: 2500, description: "Café" });
    render(<ExpenseForm />, { wrapper: WithSWR });
    await userEvent.type(await box(), "café 2500");
    await userEvent.tab();
    await waitFor(() => expect(parsePosts()).toHaveLength(1));
    await userEvent.click(await box());
    await userEvent.tab();
    expect(parsePosts()).toHaveLength(1);
    // Shift+Enter is a new line, not a request.
    await userEvent.type(await box(), "{Shift>}{Enter}{/Shift}");
    expect(parsePosts()).toHaveLength(1);
  });

  it("keeps what the sentence does not mention", async () => {
    api([personalSpace]);
    parses({ amount: 900, understood: true });
    render(<ExpenseForm />, { wrapper: WithSWR });
    await userEvent.type(await screen.findByLabelText("Descripción"), "Kiosco");
    await userEvent.type(await box(), "900{Enter}");
    await waitFor(() => expect(screen.getByLabelText("Monto")).toHaveValue("900"));
    expect(screen.getByLabelText("Descripción")).toHaveValue("Kiosco");
  });

  it("says when there is no amount, or it is not an expense", async () => {
    api([personalSpace]);
    parses({ understood: false, description: "Café" });
    render(<ExpenseForm />, { wrapper: WithSWR });
    await userEvent.type(await box(), "café{Enter}");
    expect(await screen.findByText("No encontramos el monto: completalo abajo.")).toBeInTheDocument();

    parses({ understood: false, notFinance: true });
    await userEvent.clear(await box());
    await userEvent.type(await box(), "contame un chiste{Enter}");
    expect(await screen.findByText("Solo puedo cargar gastos. Probá: «súper 15000 débito».")).toBeInTheDocument();
    expect(screen.getByLabelText("Descripción")).toHaveValue("Café");

    server.use(http.post(`${API}/expenses/parse`, () => HttpResponse.json({ error: "x" }, { status: 500 })));
    await userEvent.type(await box(), " ya{Enter}");
    expect(await screen.findByText("No pudimos leerlo. Completá los datos abajo.")).toBeInTheDocument();
  });

  it("turns Compartido on when the sentence says so, and asks the hogar's category", async () => {
    api([personalSpace, hogarSpace]);
    parses({ amount: 15000, description: "Súper", shared: true, categoryId: "c-p", categorySource: "history" });
    server.use(
      http.post(`${API}/categories/suggest`, ({ request }) =>
        HttpResponse.json({ categoryId: request.headers.get("x-household-id") === hogarSpace.id ? "c-h" : "c-p", source: "history" }),
      ),
    );
    render(<ExpenseForm />, { wrapper: WithSWR });
    await userEvent.type(await box(), "súper 15 mil compartido{Enter}");
    await waitFor(() => expect(screen.getByRole("switch", { name: "Compartido" })).toBeChecked());
    await waitFor(() => expect(screen.getByLabelText("Categoría")).toHaveTextContent("Súper del hogar"));
    const suggest = requests().find((r) => r.path === "/categories/suggest");
    expect(suggest?.headers.get("x-household-id")).toBe(hogarSpace.id);
  });

  describe("voice (plan 3.2)", () => {
    class FakeRecorder {
      static isTypeSupported = (t: string) => t === "audio/mp4";
      state = "inactive";
      mimeType: string;
      ondataavailable: ((e: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      constructor(_s: unknown, o?: { mimeType?: string }) {
        this.mimeType = o?.mimeType ?? "";
      }
      start() {
        this.state = "recording";
      }
      stop() {
        this.state = "inactive";
        this.ondataavailable?.({ data: new Blob(["voz"], { type: this.mimeType }) });
        this.onstop?.();
      }
    }
    function withMic(getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] })) {
      vi.stubGlobal("MediaRecorder", FakeRecorder);
      Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });
    }
    function hears(answer: Record<string, unknown>) {
      server.use(http.post(`${API}/expenses/parse-audio`, () => HttpResponse.json({ ...empty, transcript: null, ...answer })));
    }
    const audioPosts = () => requests().filter((r) => r.method === "POST" && r.path === "/expenses/parse-audio");

    afterEach(() => {
      vi.unstubAllGlobals();
      Reflect.deleteProperty(navigator, "mediaDevices");
    });

    it("has no mic where the browser cannot record", async () => {
      api([personalSpace]);
      render(<ExpenseForm />, { wrapper: WithSWR });
      await box();
      expect(screen.queryByRole("button", { name: "Dictar por audio" })).not.toBeInTheDocument();
    });

    it("tap, talk, tap: what was heard goes into the box and fills the rows", async () => {
      api([personalSpace]);
      parses({ amount: 3500, description: "Café" });
      hears({ transcript: "café 2500 con mercado pago", amount: 2500, description: "Café", paymentMethodId: "pm-mp" });
      withMic();
      render(<ExpenseForm />, { wrapper: WithSWR });
      await userEvent.click(await screen.findByRole("button", { name: "Dictar por audio" }));
      expect(await screen.findByText("0:30")).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Terminar de grabar" }));

      expect(await screen.findByText("Lo entendimos así. Tocá un dato para cambiarlo.")).toBeInTheDocument();
      expect(screen.getByLabelText("Contalo como te salga")).toHaveValue("café 2500 con mercado pago");
      expect(screen.getByLabelText("Monto")).toHaveValue("2500");
      expect(screen.getByLabelText("Pago")).toHaveTextContent("Mercado Pago");
      const post = audioPosts()[0];
      expect(post.headers.get("content-type")).toBe("audio/mp4");
      expect(post.headers.get("x-household-id")).toBe(personalSpace.id);

      // Enter on the same words does not ask again; a correction does, as text.
      await userEvent.type(screen.getByLabelText("Contalo como te salga"), "{Enter}");
      expect(parsePosts()).toHaveLength(0);
      const nl = screen.getByLabelText("Contalo como te salga");
      await userEvent.clear(nl);
      await userEvent.type(nl, "café 3500 con mercado pago{Enter}");
      await waitFor(() => expect(screen.getByLabelText("Monto")).toHaveValue("3500"));
      expect(parsePosts()).toHaveLength(1);
    });

    it("says when the audio was not heard, or the mic is not allowed", async () => {
      api([personalSpace]);
      hears({ transcript: null, understood: false });
      withMic();
      render(<ExpenseForm />, { wrapper: WithSWR });
      await userEvent.click(await screen.findByRole("button", { name: "Dictar por audio" }));
      await userEvent.click(await screen.findByRole("button", { name: "Terminar de grabar" }));
      expect(await screen.findByText("No pudimos entender el audio. Probá de nuevo o escribilo.")).toBeInTheDocument();
      expect(screen.getByLabelText("Contalo como te salga")).toHaveValue("");

      withMic(vi.fn().mockRejectedValue(new DOMException("no", "NotAllowedError")));
      await userEvent.click(screen.getByRole("button", { name: "Dictar por audio" }));
      expect(
        await screen.findByText("Sin permiso para el micrófono. Activalo en el navegador o escribilo."),
      ).toBeInTheDocument();
    });
  });

  describe("photo (plan 3.3)", () => {
    const photo = new File(["raw"], "ticket.heic", { type: "image/heic" });
    function reads(answer: Record<string, unknown>) {
      server.use(http.post(`${API}/expenses/parse-receipt`, () => HttpResponse.json({ ...empty, transcript: null, ...answer })));
    }
    const receiptPosts = () => requests().filter((r) => r.method === "POST" && r.path === "/expenses/parse-receipt");
    const fileInput = () => document.querySelector<HTMLInputElement>("input[type=file]")!;

    beforeEach(() => {
      resize.mockReset();
      resize.mockResolvedValue(new Blob(["small"], { type: "image/jpeg" }));
    });

    it("reads a ticket: the sentence goes into the box and fills the rows", async () => {
      api([personalSpace]);
      parses({ amount: 15000, description: "Carrefour" });
      reads({ transcript: "Carrefour 15430,50 mercado pago ayer", amount: 15430.5, description: "Carrefour", paymentMethodId: "pm-mp" });
      render(<ExpenseForm />, { wrapper: WithSWR });
      expect(await screen.findByRole("button", { name: "Leer foto de ticket o comprobante" })).toBeEnabled();
      await userEvent.upload(fileInput(), photo);

      expect(await screen.findByText("Lo entendimos así. Tocá un dato para cambiarlo.")).toBeInTheDocument();
      expect(screen.getByLabelText("Contalo como te salga")).toHaveValue("Carrefour 15430,50 mercado pago ayer");
      expect(screen.getByLabelText("Monto")).toHaveValue("15430,5");
      expect(screen.getByLabelText("Pago")).toHaveTextContent("Mercado Pago");
      expect(resize).toHaveBeenCalledWith(photo);
      const post = receiptPosts()[0];
      expect(post.headers.get("content-type")).toBe("image/jpeg");
      expect(post.headers.get("x-household-id")).toBe(personalSpace.id);
      // Picked again later: the input was cleared.
      expect(fileInput().value).toBe("");

      // A correction is read as text; the photo is not sent again.
      const nl = screen.getByLabelText("Contalo como te salga");
      await userEvent.clear(nl);
      await userEvent.type(nl, "Carrefour 15000 mercado pago ayer{Enter}");
      await waitFor(() => expect(screen.getByLabelText("Monto")).toHaveValue("15000"));
      expect(parsePosts()).toHaveLength(1);
      expect(receiptPosts()).toHaveLength(1);
    });

    it("says when the photo is not a payment, cannot be read or cannot be opened", async () => {
      api([personalSpace]);
      reads({ notFinance: true });
      render(<ExpenseForm />, { wrapper: WithSWR });
      await screen.findByRole("button", { name: "Leer foto de ticket o comprobante" });
      await userEvent.upload(fileInput(), photo);
      expect(
        await screen.findByText("No parece un ticket ni un comprobante de pago. Probá con otra foto."),
      ).toBeInTheDocument();

      reads({ understood: false });
      await userEvent.upload(fileInput(), photo);
      expect(await screen.findByText("No pudimos leer la foto. Probá con otra o escribilo.")).toBeInTheDocument();
      expect(screen.getByLabelText("Contalo como te salga")).toHaveValue("");

      const { ImageUnreadable } = await import("@/lib/resize-image");
      resize.mockRejectedValue(new ImageUnreadable());
      await userEvent.upload(fileInput(), photo);
      expect(await screen.findByText("No pudimos abrir esa imagen. Probá con otra foto.")).toBeInTheDocument();
      expect(receiptPosts()).toHaveLength(2);
    });
  });
});

describe("candidatesHint", () => {
  it("names the shared word, or counts", async () => {
    const { candidatesHint } = await import("./expense-form");
    expect(candidatesHint(["Visa Galicia", "Visa Santander"])).toBe("Tenés 2 Visa: elegí cuál");
    expect(candidatesHint(["Débito Galicia", "Visa Galicia"])).toBe("Coinciden 2 medios de pago: elegí cuál");
  });
});
