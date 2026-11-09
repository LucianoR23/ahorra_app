import { expect, test } from "@playwright/test";
import { addMember, cardClosingToday, createHousehold, loginUI, register } from "./helpers";

test("an expense in 3 installments, shared, reaches the balances", async ({ page }) => {
  const owner = await register("owner", "Owner");
  const householdId = await createHousehold(owner, "Casa cuotas");
  await addMember(owner, householdId, "Miembro");
  await cardClosingToday(owner, "Visa E2E");

  await loginUI(page, owner.email);
  await page.goto("/agregar");
  await page.getByLabel("Monto").fill("900");
  await page.getByLabel("Descripción").fill("Heladera E2E");
  await page.getByLabel("Pago", { exact: true }).click();
  await page.getByRole("option", { name: /Visa E2E/ }).click();
  await page.getByLabel("Cuotas").fill("3");
  await expect(page.getByText(/La primera entra en el resumen/)).toBeVisible(); // billing preview
  await page.getByRole("switch", { name: "Compartido" }).click(); // to the hogar (plan 1.2)
  await page.getByRole("button", { name: "Guardar gasto" }).click();
  await expect(page).not.toHaveURL(/\/agregar/);

  // First installment (300) is billed today and split in two: the member owes 150.
  await page.goto("/deudas");
  await expect(page.getByText("Te deben", { exact: true })).toBeVisible();
  const debts = page.getByRole("region", { name: "Lo que se deben" });
  await expect(debts.getByText("$ 150", { exact: true })).toBeVisible();
});
