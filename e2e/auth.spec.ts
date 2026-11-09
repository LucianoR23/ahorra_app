import { expect, test } from "@playwright/test";
import { PASSWORD, loginUI, uniqueEmail } from "./helpers";

test("sign up, onboard, land in Mi plata, create a hogar, keep the session on reload, log in again", async ({ page, browser }) => {
  const email = uniqueEmail("signup");

  // Sign up through the form.
  await page.goto("/register");
  await page.getByLabel("Nombre").fill("Ana");
  await page.getByLabel("Apellido").fill("E2E");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirmar contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page).toHaveURL(/\/verify-email\/pending/);

  // Email verification is soft: the app lets the new user in, first through
  // onboarding (plan 1.3): name, how they pay, the card's days, first expense.
  await page.goto("/");
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByLabel("Tu nombre")).toHaveValue("Ana");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("checkbox", { name: /Visa/ }).click();
  await page.getByRole("button", { name: "Continuar · 1 elegido" }).click();
  await page.getByLabel("Banco").click();
  await page.getByRole("option", { name: "Galicia" }).click();
  await page.getByLabel("Día de cierre").fill("25");
  await page.getByLabel("Día de vencimiento").fill("5");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Cargá tu primer gasto" })).toBeVisible();
  await page.getByLabel("Monto").fill("1500");
  await page.getByLabel("Descripción").fill("Café");
  await page.getByLabel("Pago", { exact: true }).click();
  await page.getByRole("option", { name: /Visa Galicia/ }).click();
  await page.getByRole("button", { name: "Guardar gasto" }).click();
  // Push and install come after and can be declined; then home.
  for (let i = 0; i < 2 && !/\/$/.test(new URL(page.url()).pathname); i++) {
    const notNow = page.getByRole("button", { name: "Ahora no" });
    await notNow.or(page.getByRole("button", { name: "Listo" })).first().click({ timeout: 5_000 }).catch(() => {});
  }

  // "Mi plata", with no hogar yet: no "Yo · Hogar" tabs, and "Más" only
  // offers to start sharing.
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "Movimientos" }).first()).toBeVisible();
  await expect(page.getByRole("tab", { name: "Hogar" })).toHaveCount(0);
  await page.getByRole("link", { name: "Más" }).first().click();
  await expect(page).toHaveURL(/\/mas$/);
  await expect(page.getByRole("link", { name: "Cuentas entre ustedes" })).toHaveCount(0);

  // Creating a hogar is optional, from "Más"; then the tabs appear.
  await page.getByRole("link", { name: "Compartir gastos" }).click();
  await page.getByRole("link", { name: "Crear hogar" }).click();
  await page.getByLabel("Nombre del hogar").fill("Casa E2E");
  await page.getByRole("button", { name: /Crear hogar/ }).click();
  await expect(page).toHaveURL(/\/hogar$/);
  await expect(page.getByRole("tab", { name: "Hogar" }).first()).toHaveAttribute("aria-selected", "true");
  await page.goto("/mas");
  await expect(page.getByRole("link", { name: "Cuentas entre ustedes" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Compartir gastos" })).toHaveCount(0);
  await page.goto("/");

  // The access token lives in memory; a reload restores the session through
  // the httpOnly refresh cookie (cross-port, like front and API in prod).
  await page.reload();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "Movimientos" }).first()).toBeVisible();

  // A fresh browser logs in and lands on home without ever passing through
  // onboarding (regression: the onboarding flash after login).
  const fresh = await browser.newContext();
  const page2 = await fresh.newPage();
  const visited: string[] = [];
  page2.on("framenavigated", (f) => {
    if (f === page2.mainFrame()) visited.push(new URL(f.url()).pathname);
  });
  await loginUI(page2, email);
  await expect(page2.getByRole("link", { name: "Movimientos" }).first()).toBeVisible();
  expect(visited).not.toContain("/onboarding");
  expect(visited).toContain("/verify-email/pending"); // unverified: reminded, not blocked
  await fresh.close();
});

test("wrong password shows the generic error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(uniqueEmail("nobody"));
  await page.getByLabel("Contraseña", { exact: true }).fill("Wrong-pass-123");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByText("email o contraseña incorrectos")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
