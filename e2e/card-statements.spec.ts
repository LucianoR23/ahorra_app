import { expect, test } from "@playwright/test";
import { cardClosedYesterday, createExpense, localDate, loginUI, personalSpaceOf, register } from "./helpers";

test("the card statement to pay is marked paid from Tarjetas", async ({ page }) => {
  const user = await register("statement", "Ana");
  const card = await cardClosedYesterday(user, "Visa E2E");
  const space = await personalSpaceOf(user);
  await createExpense(user, space, { paymentMethodId: card, amount: 900, description: "Heladera E2E", spentAt: localDate(-1), installments: 3 });

  await loginUI(page, user.email);
  await page.goto("/tarjetas");
  await expect(page.getByText("Resumen a pagar")).toBeVisible();
  await expect(page.getByText("$ 300", { exact: true }).first()).toBeVisible(); // first of 3 installments

  // Comprometido and installments in progress (plan 4.2): two installments left.
  await expect(page.getByText("Comprometido en esta tarjeta")).toBeVisible();
  const plans = page.getByRole("region", { name: "Cuotas en curso" });
  await expect(plans.getByText("Heladera E2E")).toBeVisible();
  await expect(plans.getByText(/2 de 3/)).toBeVisible();

  await page.getByRole("button", { name: "Marcar como pagado" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Marcar como pagado" }).click();
  await expect(page.getByText("Último resumen")).toBeVisible();

  await page.getByText("Ver detalle").click();
  await expect(page.getByText("Heladera E2E")).toBeVisible();
  await expect(page.getByText(/Cuota 1 de 3 · Mi plata/)).toBeVisible();
  await expect(page.getByText(/Pagaste \$ 300/)).toBeVisible();
});
