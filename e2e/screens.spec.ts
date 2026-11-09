import { expect, test, type Browser, type Page } from "@playwright/test";
import { PASSWORD, cardClosedYesterday, createExpense, createHousehold, localDate, loginUI, personalSpaceOf, register } from "./helpers";

// Screenshot harness (plan 1.10a): every screen in light and dark, mobile and
// desktop, saved under test-results/screens for review (CI uploads them as
// an artifact). No pixel comparison yet; 1.10b adds it per screen.
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

async function settle(page: Page) {
  // The insights stream keeps a connection open, so "networkidle" never
  // comes: wait for the shell and for skeletons to go away instead.
  await expect(page.getByRole("navigation", { name: "Navegación principal" }).first()).toBeAttached();
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

  await page.goto("/login");
  await page.screenshot({ path: `test-results/screens/login.${suffix}.png`, fullPage: true });

  await loginUI(page, email);
  for (const screen of screens) {
    // Navigate inside the app: a full reload refreshes the session, and the
    // API allows 30 refreshes per minute per IP.
    await page.evaluate((path) => {
      (window as unknown as { next: { router: { push: (p: string) => void } } }).next.router.push(path);
    }, screen.path);
    await page.waitForURL((u) => u.pathname === screen.path);
    await settle(page);
    await page.screenshot({ path: `test-results/screens/${screen.name}.${suffix}.png`, fullPage: true });
  }
  await context.close();
}

test("screens in light and dark, mobile and desktop", async ({ browser }) => {
  test.setTimeout(10 * 60_000);
  const user = await register("screens", "Luciano");
  await createHousehold(user, "Casa");
  // A card with a closed statement to pay (plan 4.1).
  const card = await cardClosedYesterday(user, "Visa 4417");
  const space = await personalSpaceOf(user);
  await createExpense(user, space, { paymentMethodId: card, amount: 435000, description: "Notebook", spentAt: localDate(-1), installments: 3 });
  const screens = [...SCREENS, { name: "tarjetas-resumen", path: `/tarjetas/${card}/resumen/${localDate(-1).slice(0, 7)}` }];

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
      await page.screenshot({ path: `test-results/screens/onboarding-${step}.${theme}.mobile.png`, fullPage: true });
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
