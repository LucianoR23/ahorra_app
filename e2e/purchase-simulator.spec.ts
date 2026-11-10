import { expect, test } from "@playwright/test";
import { cardClosingToday, createRecurringIncome, loginUI, personalSpaceOf, register } from "./helpers";

test("¿Me lo puedo comprar? simulates a purchase and loads it filled in", async ({ page }) => {
  const user = await register("simulator", "Ana");
  await cardClosingToday(user, "Visa E2E");
  const space = await personalSpaceOf(user);
  await createRecurringIncome(user, space, {
    amount: 500000, currency: "ARS", source: "salary", description: "Sueldo", frequency: "monthly", dayOfMonth: 1, startsAt: "2026-01-01",
  });

  await loginUI(page, user.email);
  await page.goto("/mas");
  await page.getByRole("link", { name: "¿Me lo puedo comprar?" }).click();
  await expect(page).toHaveURL(/\/simular$/);

  await page.getByLabel("Monto").fill("60000");
  await page.getByLabel("Pago").click();
  await page.getByRole("option", { name: /Visa E2E/ }).click();
  await page.getByLabel("Cuotas").fill("3");
  await page.getByRole("button", { name: "Ver cómo me queda" }).click();

  await expect(page.getByText(/Pagarías 3 cuotas de \$ 20\.000 desde el resumen de/)).toBeVisible();
  await expect(page.getByText(/En el mes más justo/)).toBeVisible();

  await page.getByRole("link", { name: "Cargar compra" }).click();
  await expect(page).toHaveURL(/\/agregar\?amount=60000/);
  await expect(page.getByLabel("Monto")).toHaveValue("60000");
  await page.getByLabel("Descripción").fill("Bici E2E");
  await page.getByRole("button", { name: "Guardar gasto" }).click();
  await expect(page).toHaveURL(/\/movimientos\/[0-9a-f-]+$/);
  await expect(page.getByText("Bici E2E")).toBeVisible();
});
