import { expect, test } from "@playwright/test";

test.describe("landing page", () => {
  test("renders ShiftSync hero and navigation", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("landing-page")).toBeVisible();
    await expect(page.getByTestId("landing-hero")).toBeVisible();
    await expect(page.getByRole("heading", { name: /shift scheduling/i })).toBeVisible();
    await expect(
      page.getByRole("banner").getByRole("link", { name: "ShiftSync", exact: true }),
    ).toBeVisible();
  });

  test("navigates to privacy page", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Privacy" }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole("heading", { name: /privacy policy/i })).toBeVisible();
  });
});
