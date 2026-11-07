import { expect, test } from "@playwright/test";
import { createHousehold, listDrafts, loginUI, register, variableBillDueToday } from "./helpers";

test("a variable monthly bill arrives as a draft and is confirmed with the real amount", async ({ page }) => {
  const user = await register("bills", "Ana");
  const householdId = await createHousehold(user, "Casa facturas");
  await variableBillDueToday(user, householdId, "Luz E2E", 10000);
  const [draft] = await listDrafts(user, householdId);
  expect(draft?.amount).toBe(10000);

  await loginUI(page, user.email);
  // Login opens "Mi plata"; the bill lives in the hogar.
  await page.getByRole("tab", { name: "Hogar" }).first().click();
  await expect(page.getByRole("heading", { name: "Pendientes de confirmar" })).toBeVisible();
  // "Luz E2E" also shows in the recent expenses list (drafts count as spending, 0.4).
  await page.getByText("Confirmar →").click();
  await page.getByLabel("Monto real de la factura").fill("12345");
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByText("Gasto confirmado")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pendientes de confirmar" })).toBeHidden();

  expect(await listDrafts(user, householdId)).toHaveLength(0);
});
