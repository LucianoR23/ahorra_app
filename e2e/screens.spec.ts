import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { PASSWORD, addMember, cardClosedYesterday, cashOf, createGoal, createIncome, createExpense, createHousehold, createRecurringExpense, createRecurringIncome, midPreviousMonth, localDate, loginUI, personalSpaceOf, register } from "./helpers";

// Screenshot harness (plan 1.10a): every screen in light and dark, mobile and
// desktop, saved under test-results/screens for review (CI uploads them as
// an artifact).
//
// Visual regression (plan 1.10b): with VISUAL=1 (CI) each shot is also
// compared with its baseline in e2e/__screenshots__. Baselines come from CI's
// Linux runner only (fonts render differently on each OS): run the workflow
// by hand ("Run workflow" on ci, or `gh workflow run ci.yml --ref next`),
// download its "visual-baselines" artifact into e2e/__screenshots__ and
// commit it. Dates, months, times and emails change every run, so they are
// masked; so is the Google button, drawn by Google's servers.
//
// Runs as its own Playwright project (`pnpm test:screens`) so it gets a
// fresh API: the API allows 5 sign-ups per hour per IP and the e2e suite
// already uses 4.

const SCREENS = [
  { name: "inicio", path: "/" },
  { name: "movimientos", path: "/movimientos" },
  { name: "agregar", path: "/agregar" },
  { name: "tarjetas", path: "/tarjetas" },
  { name: "mas", path: "/mas" },
  { name: "hogar", path: "/hogar" },
  { name: "deudas", path: "/deudas" },
  { name: "ingresos", path: "/ingresos" },
  { name: "recurrentes", path: "/recurrentes" },
  { name: "objetivos", path: "/objetivos" },
  { name: "categorias", path: "/categorias" },
  { name: "reportes", path: "/reportes" },
  { name: "notificaciones", path: "/notificaciones" },
  { name: "ajustes", path: "/ajustes" },
  { name: "seguridad", path: "/seguridad" },
  { name: "soporte", path: "/soporte" },
];

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1440, height: 900 },
} as const;

const THEMES = ["light", "dark"] as const;

const VISUAL = !!process.env.VISUAL;

const MONTH_ABBR = "(ene|feb|mar|abr|may|jun|jul|ago|sept?|oct|nov|dic)";
/** Text that changes from one day (or run) to the next. */
const VOLATILE_TEXT = [
  new RegExp(String.raw`\b\d{1,2}( de)? ${MONTH_ABBR}`, "i"),
  /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/i,
  new RegExp(String.raw`^${MONTH_ABBR}\.?( \d{2,4})?$`, "i"),
  /\b(lunes|martes|miércoles|jueves|viernes|sábado|domingo)\b/i,
  /\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/,
  /\b\d{1,2}:\d{2}\b/,
  /\b(d[ií]a|el) \d{1,2}\b/i,
  /\b(en|hace|faltan?) \d+ (d[ií]as?|horas?|h|min|minutos?)\b/i,
  /@/,
];

function volatile(page: Page) {
  return [
    ...VOLATILE_TEXT.map((re) => page.getByText(re)),
    page.locator(".recharts-cartesian-axis-tick"),
    page.locator('[data-slot="google-signin"]'),
  ];
}

/**
 * Saves the shot for review and, with VISUAL=1, compares it with its
 * baseline. Soft, so one changed screen does not hide the others.
 */
async function snap(page: Page, name: string, { fullPage = true } = {}) {
  await page.screenshot({ path: `test-results/screens/${name}.png`, fullPage });
  if (!VISUAL) return;
  await expect.soft(page).toHaveScreenshot(`${name}.png`, {
    fullPage,
    mask: volatile(page),
    animations: "disabled",
    caret: "hide",
    // A masked date one character longer moves its row a little.
    maxDiffPixelRatio: 0.01,
    // Keeps date-dependent rows at a fixed height (see the file).
    stylePath: path.resolve("e2e/screenshot.css"),
  });
}

async function settle(page: Page) {
  // The insights stream keeps a connection open, so "networkidle" never
  // comes: wait for the shell and for skeletons to go away instead.
  // The app's <main>: Cargar gasto has no bottom nav on phones (plan 1.10b).
  await expect(page.getByRole("main")).toBeAttached();
  await page
    .waitForFunction(() => !document.querySelector('[data-slot="skeleton"]'), undefined, { timeout: 5_000 })
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  // Let page and view transitions finish so a screen is not shot mid-fade.
  await page
    .waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"), undefined, { timeout: 5_000 })
    .catch(() => {});
}

async function shoot(
  browser: Browser,
  email: string,
  screens: { name: string; path: string }[],
  theme: (typeof THEMES)[number],
  vp: keyof typeof VIEWPORTS,
) {
  const context = await browser.newContext({ viewport: VIEWPORTS[vp], colorScheme: theme, reducedMotion: "reduce" });
  const page = await context.newPage();
  const suffix = `${theme}.${vp}`;
  // Errors in the browser show in the log (Next's "Issues" badge in dev).
  page.on("console", async (m) => {
    if (m.type() !== "error") return;
    const args = await Promise.all(m.args().map((a) => a.jsonValue().catch(() => "?")));
    console.log(`[console] ${new URL(page.url()).pathname}: ${args.map(String).join(" | ").slice(0, 3000)}`);
  });
  page.on("pageerror", (e) => console.log(`[pageerror] ${new URL(page.url()).pathname}: ${e.message.slice(0, 300)}`));

  // Screens outside the app, before signing in.
  for (const [name, path] of [
    ["register", "/register"],
    ["forgot-password", "/forgot-password"],
    ["reset-password-sin-token", "/reset-password"],
    ["login", "/login"],
  ] as const) {
    await page.goto(path);
    await page.getByRole("heading", { level: 1 }).waitFor();
    await snap(page, `${name}.${suffix}`);
  }

  await loginUI(page, email);
  for (const screen of screens) {
    // Navigate inside the app: a full reload refreshes the session, and the
    // API allows 30 refreshes per minute per IP.
    await page.evaluate((path) => {
      (window as unknown as { next: { router: { push: (p: string) => void } } }).next.router.push(path);
    }, screen.path);
    await page.waitForURL((u) => u.pathname === screen.path);
    await settle(page);
    await snap(page, `${screen.name}.${suffix}`);
  }
  // Inicio · Hogar (plan 1.10b): the same "/" with the Hogar tab picked.
  await page.evaluate(() => (window as unknown as { next: { router: { push: (p: string) => void } } }).next.router.push("/"));
  await page.waitForURL((u) => u.pathname === "/");
  await page.getByRole("tab", { name: "Hogar" }).first().click();
  await expect(page.getByText("Gastaron juntos", { exact: false }).first()).toBeVisible();
  await settle(page);
  await snap(page, `inicio-hogar.${suffix}`);
  // Cuentas entre ustedes (plan 1.10b), in the hogar where they live.
  await page.evaluate(() => (window as unknown as { next: { router: { push: (p: string) => void } } }).next.router.push("/deudas"));
  await page.waitForURL((u) => u.pathname === "/deudas");
  await expect(page.getByRole("region", { name: "Lo que se deben" })).toBeVisible();
  await settle(page);
  await snap(page, `deudas-hogar.${suffix}`);
  // Reportes · Tendencias (plan 1.10b): the chart in theme colors.
  await page.evaluate(() => (window as unknown as { next: { router: { push: (p: string) => void } } }).next.router.push("/reportes"));
  await page.waitForURL((u) => u.pathname === "/reportes");
  await page.getByRole("tab", { name: "Tendencias" }).click();
  await expect(page.locator(".recharts-line").first()).toBeVisible();
  await settle(page);
  await snap(page, `reportes-tendencias.${suffix}`);
  // Notificaciones of the hogar: Ana's shared expense told this user (plan 1.10b).
  await page.evaluate(() => (window as unknown as { next: { router: { push: (p: string) => void } } }).next.router.push("/notificaciones"));
  await page.waitForURL((u) => u.pathname === "/notificaciones");
  await expect(page.getByRole("link", { name: /Nuevo gasto compartido/ }).first()).toBeVisible();
  await settle(page);
  await snap(page, `notificaciones-hogar.${suffix}`);
  await page.getByRole("link", { name: /Nuevo gasto compartido/ }).first().click();
  await page.waitForURL((u) => u.pathname.startsWith("/notificaciones/"));
  await expect(page.getByRole("button", { name: "Eliminar notificación" })).toBeVisible();
  await settle(page);
  await snap(page, `notificacion.${suffix}`);
  // The create sheet (bottom sheet on phones, dialog on desktop), back in Yo.
  await page.getByRole("tab", { name: "Yo" }).first().click();
  await page.evaluate(() => (window as unknown as { next: { router: { push: (p: string) => void } } }).next.router.push("/objetivos"));
  await page.waitForURL((u) => u.pathname === "/objetivos");
  await page.getByRole("button", { name: "Nuevo objetivo" }).click();
  await expect(page.getByRole("dialog", { name: "Nuevo objetivo" })).toBeVisible();
  await snap(page, `objetivo-nuevo.${suffix}`, { fullPage: false });
  await context.close();
}

test("screens in light and dark, mobile and desktop", async ({ browser }) => {
  test.setTimeout(10 * 60_000);
  const user = await register("screens", "Luciano");
  const hogar = await createHousehold(user, "Casa");
  // A second member and shared expenses for Inicio · Hogar (plan 1.10b).
  const ana = await addMember(user, hogar, "Ana");
  await createExpense(user, hogar, { paymentMethodId: await cashOf(user), amount: 42315, description: "Súper", spentAt: localDate(0), isShared: true });
  await createExpense(ana, hogar, { paymentMethodId: await cashOf(ana), amount: 38900, description: "Luz", spentAt: localDate(0), isShared: true });
  // A card with a closed statement to pay (plan 4.1).
  const card = await cardClosedYesterday(user, "Visa 4417");
  const space = await personalSpaceOf(user);
  // Last month's purchase, so this month's lists look the same every day
  // (on the 1st, "yesterday" would be last month and drop out of them).
  await createExpense(user, space, { paymentMethodId: card, amount: 435000, description: "Notebook", spentAt: midPreviousMonth(), installments: 3 });
  // Installments in progress for Comprometido (plan 4.2).
  const heladera = await createExpense(user, space, { paymentMethodId: card, amount: 1079880, description: "Heladera", spentAt: localDate(0), installments: 12 });
  const sueldo = await createIncome(user, space, { amount: 1151143, description: "Sueldo", receivedAt: localDate(0) });
  // Recurrentes and Presupuestos y objetivos (plan 1.10b).
  await createRecurringExpense(user, space, { paymentMethodId: card, amount: 12999, description: "Netflix", dayOfMonth: Number(localDate(0).slice(8)) });
  await createRecurringIncome(user, space, { amount: 250000, description: "Diseño web", source: "freelance", dayOfMonth: Number(localDate(0).slice(8)) });
  await createGoal(user, space, { goalType: "total_limit", targetAmount: 2000000 });
  const screens = [
    ...SCREENS,
    { name: "ingreso", path: `/ingresos/${sueldo}` },
    { name: "ingreso-nuevo", path: "/ingresos/nuevo" },
    { name: "tarjetas-resumen", path: `/tarjetas/${card}/resumen/${localDate(-1).slice(0, 7)}` },
    { name: "detalle", path: `/movimientos/${heladera}` },
  ];

  for (const theme of THEMES) {
    for (const vp of Object.keys(VIEWPORTS) as (keyof typeof VIEWPORTS)[]) {
      await shoot(browser, user.email, screens, theme, vp);
    }
  }
});

// Onboarding (plan 1.3) for a user who has not done it, on mobile. The
// shots stop before any step that writes.
test("onboarding screens", async ({ browser }) => {
  test.setTimeout(3 * 60_000);
  const user = await register("screens-onboarding", "Luciano", { onboarded: false });
  for (const theme of THEMES) {
    const context = await browser.newContext({ viewport: VIEWPORTS.mobile, colorScheme: theme, reducedMotion: "reduce" });
    const page = await context.newPage();
    const shot = async (step: string) => {
      // Let the checkbox transitions finish before the shot.
      await page
        .waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"), undefined, { timeout: 5_000 })
        .catch(() => {});
      await snap(page, `onboarding-${step}.${theme}.mobile`);
    };

    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill(user.email);
    await page.getByLabel("Contraseña", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"));
    if (new URL(page.url()).pathname.startsWith("/verify-email")) {
      await page.evaluate(() => (window as unknown as { next: { router: { push: (p: string) => void } } }).next.router.push("/"));
    }
    await page.waitForURL((u) => u.pathname === "/onboarding");
    await expect(page.getByLabel("Tu nombre")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await shot("1-nombre");

    await page.getByRole("button", { name: "Saltar" }).click();
    await page.getByRole("checkbox", { name: /Visa/ }).click();
    await page.getByRole("checkbox", { name: /Mastercard/ }).click();
    await page.getByRole("checkbox", { name: /Mercado Pago/ }).click();
    await shot("2-como-pagas");
    // Cards only: continuing writes nothing until the cards are saved.
    await page.getByRole("checkbox", { name: /Mercado Pago/ }).click();
    await page.getByRole("button", { name: "Continuar · 2 elegidos" }).click();
    await expect(page.getByRole("heading", { name: "Tus tarjetas" })).toBeVisible();
    await shot("3-tarjetas");
    await context.close();
  }
});
