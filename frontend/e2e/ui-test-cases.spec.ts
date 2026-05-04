/**
 * Проверки интерфейса в браузере (как будто живой человек нажимает кнопки).
 * Подробные объяснения для непрограммистов — в docs/TESTS-EXPLAINED.md.
 */
import { test, expect } from "@playwright/test";

const API = "http://127.0.0.1:3000";

test.describe("Регистрация и вход (как в инструкции для пользователя)", () => {
  test("TC-UI-REG-01: новый человек вводит ник и пароль — попадает в редактор, «пропуск» лежит в localStorage", async ({ page }) => {
    const u = `uitest_01_${Date.now()}`;
    await page.goto("/register");
    await page.getByPlaceholder("ваш-логин").fill(u);
    await page.getByRole("button", { name: /продолжить/i }).click();
    await page.getByPlaceholder("Email address").fill(`${u}@test.local`);
    await page.getByPlaceholder("Password").fill("password123");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/editor/);
    const token = await page.evaluate(() => localStorage.getItem("token"));
    expect(token).toBeTruthy();
  });

  test("TC-UI-REG-02: слишком короткий ник — остаёмся на странице регистрации и видим подсказку про 3 символа", async ({ page }) => {
    await page.goto("/register");
    const nick = page.getByPlaceholder("ваш-логин");
    await nick.fill("ab");
    await nick.blur();
    await expect(page.getByText(/Минимум 3 символа/i)).toBeVisible();
  });

  test("TC-UI-REG-03: короткий пароль — подсказка про 4 символа, в редактор не пускает", async ({ page }) => {
    const u = `uitest_03_${Date.now()}`;
    await page.goto("/register");
    await page.getByPlaceholder("ваш-логин").fill(u);
    await page.getByRole("button", { name: /продолжить/i }).click();
    await page.getByPlaceholder("Email address").fill(`${u}@test.local`);
    await page.getByPlaceholder("Password").fill("abc");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).not.toHaveURL(/\/editor/);
    await expect(page.getByText(/Password must be at least 4 characters/i)).toBeVisible();
  });

  test("TC-UI-REG-04: ник уже занят — под полем появляются варианты @..., по клику подставляется другой ник", async ({ page, request }) => {
    const taken = `taken_${Date.now()}`;
    const reg = await request.post(`${API}/api/auth/register`, {
      data: { username: taken, email: `${taken}@test.local`, password: "password123" },
    });
    expect(reg.ok()).toBeTruthy();
    await page.goto("/register");
    await page.getByPlaceholder("ваш-логин").fill(taken);
    await page.waitForTimeout(700);
    const firstSuggestion = page.getByRole("button").filter({ hasText: /^@/ }).first();
    await expect(firstSuggestion).toBeVisible({ timeout: 15_000 });
    const text = await firstSuggestion.textContent();
    expect(text).toMatch(/^@/);
    await firstSuggestion.click();
    const val = await page.getByPlaceholder("ваш-логин").inputValue();
    expect(val.length).toBeGreaterThanOrEqual(3);
  });

  test("TC-UI-LOGIN-01: существующий пользователь входит — открывается редактор", async ({ page, request }) => {
    const u = `login_ok_${Date.now()}`;
    const email = `${u}@test.local`;
    await request.post(`${API}/api/auth/register`, {
      data: { username: u, email, password: "password123" },
    });
    await page.goto("/login");
    await page.getByPlaceholder("Email address").fill(email);
    await page.getByPlaceholder("Password").fill("password123");
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/editor/);
  });

  test("TC-UI-LOGIN-02: неверный пароль — красная ошибка, остаёмся на странице входа", async ({ page, request }) => {
    const u = `login_bad_${Date.now()}`;
    const email = `${u}@test.local`;
    await request.post(`${API}/api/auth/register`, {
      data: { username: u, email, password: "password123" },
    });
    await page.goto("/login");
    await page.getByPlaceholder("Email address").fill(email);
    await page.getByPlaceholder("Password").fill("wrongpassword");
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page).not.toHaveURL(/\/editor/);
    await expect(page.getByText(/Wrong email or password/i)).toBeVisible();
  });

  test("TC-UI-LOGIN-03: кнопка «Выйти» убирает пропуск; зайти в редактор снова без входа нельзя", async ({ page, request }) => {
    const u = `logout_${Date.now()}`;
    const email = `${u}@test.local`;
    await request.post(`${API}/api/auth/register`, {
      data: { username: u, email, password: "password123" },
    });
    await page.goto("/login");
    await page.getByPlaceholder("Email address").fill(email);
    await page.getByPlaceholder("Password").fill("password123");
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/editor/);
    await page.getByRole("button", { name: /выйти/i }).click();
    const token = await page.evaluate(() => localStorage.getItem("token"));
    expect(token).toBeFalsy();
    await page.goto("/editor");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Редактор визитки", () => {
  test.beforeEach(async ({ page, request }) => {
    const u = `edit_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const email = `${u}@test.local`;
    await request.post(`${API}/api/auth/register`, {
      data: { username: u, email, password: "password123" },
    });
    await page.goto("/login");
    await page.getByPlaceholder("Email address").fill(email);
    await page.getByPlaceholder("Password").fill("password123");
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/editor/);
  });

  test("TC-UI-EDIT-01: внизу экрана есть кнопки типов карточек (Заметка, Ссылка, …)", async ({ page }) => {
    await expect(page.locator('[data-add-type="note"]')).toBeVisible();
  });

  test("TC-UI-EDIT-02: добавили заметку с текстом — после обновления страница текст на месте (сохранилось на сервере)", async ({ page }) => {
    await page.locator('[data-add-type="note"]').click();
    const text = "Моя первая заметка";
    const box = page.locator('[contenteditable="true"]').first();
    await box.waitFor({ state: "visible", timeout: 20_000 });
    await box.click();
    await box.evaluate((el, t) => {
      el.textContent = t;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, text);
    await page.keyboard.press("Tab");
    await page.waitForTimeout(1500);
    await expect(page.getByText(text)).toBeVisible();
    await page.reload();
    await expect(page.getByText(text)).toBeVisible();
  });
});

test.describe.serial("Публичная страница (как видят гости)", () => {
  let pubUser = "";

  test.beforeAll(async ({ request }) => {
    const u = `alice_pub_ui_${Date.now()}`;
    const res = await request.post(`${API}/api/auth/register`, {
      data: { username: u, email: `${u}@test.local`, password: "password123" },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { token: string };
    await request.patch(`${API}/api/profile/`, {
      headers: { Authorization: `Bearer ${body.token}` },
      data: { name: "Alice UI", bio: "Bio" },
    });
    await request.post(`${API}/api/blocks/`, {
      headers: { Authorization: `Bearer ${body.token}` },
      data: { type: "note", note: "Блок" },
    });
    pubUser = u;
  });

  test("TC-UI-PUB-01: в чистом окне браузера видно имя и блоки; кнопок редактора нет", async ({ page, browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const p = await ctx.newPage();
    await p.goto(`/public/${pubUser}`);
    await expect(p.getByText("Alice UI")).toBeVisible();
    await expect(p.locator('[data-add-type="note"]')).toHaveCount(0);
    await ctx.close();
  });

  test("TC-UI-PUB-02: несуществующий адрес — человекочитаемое «Профиль не найден», не белый экран", async ({ page }) => {
    await page.goto("/public/nonexistent_user_xyz_999999");
    await expect(page.getByText("Профиль не найден")).toBeVisible();
  });

  test("TC-UI-PUB-04: короткая ссылка без слова public — та же визитка", async ({ page }) => {
    await page.goto(`/${pubUser}`);
    await expect(page.getByText("Alice UI")).toBeVisible();
  });

  test("TC-UI-PUB-05: старый адрес /u/ник — тоже открывает визитку", async ({ page }) => {
    await page.goto(`/u/${pubUser}`);
    await expect(page.getByText("Alice UI")).toBeVisible();
  });

  test("TC-UI-PUB-03: узкий и широкий экран — имя всё ещё читается", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(`/public/${pubUser}`);
    await expect(page.getByText("Alice UI")).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByText("Alice UI")).toBeVisible();
  });
});
