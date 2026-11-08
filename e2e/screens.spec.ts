import { expect, test, type Browser, type Page } from "@playwright/test";
import { cardClosingToday, createHousehold, loginUI, register } from "./helpers";

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

async function shoot(browser: Browser, email: string, theme: (typeof THEMES)[number], vp: keyof typeof VIEWPORTS) {
  const context = await browser.newContext({ viewport: VIEWPORTS[vp], colorScheme: theme, reducedMotion: "reduce" });
  const page = await context.newPage();
  const suffix = `${theme}.${vp}`;

  await page.goto("/login");
  await page.screenshot({ path: `test-results/screens/login.${suffix}.png`, fullPage: true });

  await loginUI(page, email);
  for (const screen of SCREENS) {
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
  await cardClosingToday(user, "Visa 4417");

  for (const theme of THEMES) {
    for (const vp of Object.keys(VIEWPORTS) as (keyof typeof VIEWPORTS)[]) {
      await shoot(browser, user.email, theme, vp);
    }
  }
});
