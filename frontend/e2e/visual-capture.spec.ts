/**
 * Только сохранение скриншотов для ручного / агентского просмотра.
 * Сравнения с эталонами нет — файлы перезаписываются при каждом прогоне.
 */
import fs from "node:fs";
import path from "node:path";
import { devices, expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3000";

function shotDir(): string {
  return path.join(process.cwd(), "e2e", "screenshots");
}

test.describe("Visual capture (no baseline)", () => {
  test("сохранить ключевые экраны в e2e/screenshots/", async ({ page, browser, request }) => {
    const dir = shotDir();
    fs.mkdirSync(dir, { recursive: true });

    const stamp = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const uReg = `visreg_${stamp}`;
    const uLogin = `vislog_${stamp}`;
    const emailLogin = `${uLogin}@test.local`;

    const regRes = await request.post(`${API}/api/auth/register`, {
      data: { username: uLogin, email: emailLogin, password: "password123" },
    });
    if (!regRes.ok()) {
      throw new Error(`setup register failed: ${regRes.status()}`);
    }

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/register");
    await page.screenshot({ path: path.join(dir, "01-register-step1.png"), fullPage: true });

    await page.getByPlaceholder("ваш-логин").fill(uReg);
    await page.getByRole("button", { name: /продолжить/i }).click();
    await page.getByPlaceholder("Email адрес").waitFor({ state: "visible" });
    await page.screenshot({ path: path.join(dir, "02-register-step2.png"), fullPage: true });

    await page.goto("/login");
    await page.screenshot({ path: path.join(dir, "03-login.png"), fullPage: true });

    await page.getByPlaceholder("Email адрес").fill(emailLogin);
    await page.getByPlaceholder("Пароль").fill("password123");
    await page.getByRole("button", { name: /^войти$/i }).click();
    await page.waitForURL(/\/editor/);

    await page.screenshot({ path: path.join(dir, "04-editor-desktop.png"), fullPage: true });

    const phonePreviewToggle = page.getByTestId("editor-preview-phone-toggle");
    await expect(phonePreviewToggle).toBeVisible();
    await phonePreviewToggle.click();
    await expect(page.locator(".editor-phone-preview-shell")).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(dir, "05-editor-phone-mode.png"), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/editor`);
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.getByTestId("editor-preview-phone-toggle").click();
    await expect(page.locator(".editor-phone-preview-shell")).toHaveCount(0);
    await page.screenshot({ path: path.join(dir, "06-editor-viewport-390.png"), fullPage: true });

    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const guest = await ctx.newPage();
    await guest.setViewportSize({ width: 390, height: 844 });
    await guest.goto(`/${uLogin}`);
    await guest.screenshot({ path: path.join(dir, "07-public-mobile.png"), fullPage: true });
    await ctx.close();
  });

  /** Режим телефона Playwright (viewport, UA, isMobile) без отдельного worker — через newContext. */
  test("редактор: iPhone 12 в Playwright + встроенное превью «как на макете»", async ({ browser, request }) => {
    const dir = shotDir();
    fs.mkdirSync(dir, { recursive: true });

    const stamp = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const u = `iphone_vis_${stamp}`;
    const email = `${u}@test.local`;
    const regRes = await request.post(`${API}/api/auth/register`, {
      data: { username: u, email, password: "password123" },
    });
    if (!regRes.ok()) {
      throw new Error(`register failed: ${regRes.status()}`);
    }

    const context = await browser.newContext({
      ...devices["iPhone 12"],
    });
    const page = await context.newPage();
    try {
      await page.goto("/login");
      await page.getByPlaceholder("Email адрес").fill(email);
      await page.getByPlaceholder("Пароль").fill("password123");
      await page.getByRole("button", { name: /^войти$/i }).click();
      await page.waitForURL(/\/editor/);

      await page.getByTestId("editor-preview-phone-toggle").click();
      await expect(page.locator(".editor-phone-preview-shell")).toHaveCount(0);
      await page.waitForTimeout(400);

      await page.screenshot({
        path: path.join(dir, "08-playwright-iphone12-in-app-phone-preview.png"),
        fullPage: true,
      });
    } finally {
      await context.close();
    }
  });
});
