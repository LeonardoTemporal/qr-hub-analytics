import { expect, test } from "@playwright/test";

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    )
    .toBe(true);
}

test("landing renders its cinematic experience", async ({ page }) => {
  await page.route("**/api/public/site", (route) =>
    route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ detail: "No published override" }),
    }),
  );
  const response = await page.goto("/");

  expect(response?.ok()).toBe(true);
  const landing = page.frameLocator('iframe[title="7Fitment"]');
  await expect(landing.locator("body")).toContainText("7FITMENT");
  await expect
    .poll(() =>
      landing
        .locator("html")
        .evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
    )
    .toBe(true);
  await expectNoHorizontalOverflow(page);
});

test("links hub exposes the contact destinations", async ({ page }) => {
  await page.route("**/api/tracking/events", (route) =>
    route.fulfill({ status: 204 }),
  );
  const response = await page.goto("/enlaces");

  expect(response?.ok()).toBe(true);
  await expect(page.getByRole("heading", { name: "7FITMENT" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Cotizar proyecto/ })).toHaveAttribute(
    "href",
    /^https:\/\/wa\.me\//,
  );
  await expect(page.getByRole("link", { name: /Instagram/ })).toHaveAttribute(
    "href",
    /^https:\/\/www\.instagram\.com\//,
  );
  await expect(page.getByRole("link", { name: /Ubicación/ })).toHaveAttribute(
    "href",
    /^https:\/\/maps\.app\.goo\.gl\//,
  );
  await expect(page.locator('a[href^="/t/"]')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test("admin routes require a session and never reveal a password", async ({
  page,
}) => {
  await page.route("**/api/admin/auth/session", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Not authenticated" }),
    }),
  );

  await page.goto("/admin/analytics");
  await expect(page).toHaveURL(/\/admin\/login$/);
  const password = page.getByLabel("Contrasena");
  await expect(password).toHaveAttribute("type", "password");
  await expect(password).not.toHaveAttribute("placeholder", /.+/);
});

test("canonical QR asset is published", async ({ request }) => {
  const response = await request.get("/assets/qr/7fitment-qr-general.svg");

  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/svg+xml");
  await expect(response.text()).resolves.toContain("<svg");
});
