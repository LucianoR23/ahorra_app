import { expect, test } from "@playwright/test";
import { PASSWORD, loginUI, uniqueEmail } from "./helpers";

test("sign up, create a household, keep the session on reload, log in again", async ({ page, browser }) => {
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

  // Email verification is soft: the app lets the new user in, straight to onboarding.
  await page.goto("/");
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByLabel("Nombre del hogar").fill("Casa E2E");
  await page.getByRole("button", { name: /Continuar/ }).click();
  await page.getByRole("button", { name: "Saltar por ahora" }).click();
  await expect(page).toHaveURL(/\/$/);

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
