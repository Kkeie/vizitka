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
    await page.getByPlaceholder("Email адрес").fill(`${u}@test.local`);
    await expect(page.getByText(/Email доступен/i)).toBeVisible({ timeout: 20_000 });
    await page.getByPlaceholder("Пароль").fill("password123");
    await page.getByRole("button", { name: /создать аккаунт/i }).click();
    await expect(page).toHaveURL(/\/editor/);
    await expect.poll(
      async () => {
        const state = await page.context().storageState();
        const originState = state.origins.find((entry) =>
          entry.origin.includes("127.0.0.1:5173"),
        );
        return originState?.localStorage.find((entry) => entry.name === "token")?.value ?? null;
      },
      { timeout: 10_000 },
    ).toBeTruthy();
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
    await page.getByPlaceholder("Email адрес").fill(`${u}@test.local`);
    await expect(page.getByText(/Email доступен/i)).toBeVisible({ timeout: 20_000 });
    await page.getByPlaceholder("Пароль").fill("abc");
    await page.getByRole("button", { name: /создать аккаунт/i }).click();
    await expect(page).not.toHaveURL(/\/editor/);
    await expect(page.getByText(/Пароль должен быть не менее 4 символов/i)).toBeVisible();
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

  test("TC-UI-REG-05: на мобильном шаге регистрации виден полный домен ссылки", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/register");
    await expect(page.locator(".username-field .prefix")).toHaveText("https://vizitka.ddns.net/");
  });

  test("TC-UI-LOGIN-01: существующий пользователь входит — открывается редактор", async ({ page, request }) => {
    const u = `login_ok_${Date.now()}`;
    const email = `${u}@test.local`;
    await request.post(`${API}/api/auth/register`, {
      data: { username: u, email, password: "password123" },
    });
    await page.goto("/login");
    await page.getByPlaceholder("Email адрес").fill(email);
    await page.getByPlaceholder("Пароль").fill("password123");
    await page.getByRole("button", { name: /^войти$/i }).click();
    await expect(page).toHaveURL(/\/editor/);
  });

  test("TC-UI-LOGIN-02: неверный пароль — красная ошибка, остаёмся на странице входа", async ({ page, request }) => {
    const u = `login_bad_${Date.now()}`;
    const email = `${u}@test.local`;
    await request.post(`${API}/api/auth/register`, {
      data: { username: u, email, password: "password123" },
    });
    await page.goto("/login");
    await page.getByPlaceholder("Email адрес").fill(email);
    await page.getByPlaceholder("Пароль").fill("wrongpassword");
    await page.getByRole("button", { name: /^войти$/i }).click();
    await expect(page).not.toHaveURL(/\/editor/);
    await expect(page.getByText(/Неверный email или пароль/i)).toBeVisible();
  });

  test("TC-UI-LOGIN-03: кнопка «Выйти» убирает пропуск; зайти в редактор снова без входа нельзя", async ({ page, request }) => {
    const u = `logout_${Date.now()}`;
    const email = `${u}@test.local`;
    await request.post(`${API}/api/auth/register`, {
      data: { username: u, email, password: "password123" },
    });
    await page.goto("/login");
    await page.getByPlaceholder("Email адрес").fill(email);
    await page.getByPlaceholder("Пароль").fill("password123");
    await page.getByRole("button", { name: /^войти$/i }).click();
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
    await page.getByPlaceholder("Email адрес").fill(email);
    await page.getByPlaceholder("Пароль").fill("password123");
    await page.getByRole("button", { name: /^войти$/i }).click();
    await expect(page).toHaveURL(/\/editor/);
  });

  test("TC-UI-EDIT-01: внизу экрана есть кнопки типов карточек (Заметка, Ссылка, …)", async ({ page }) => {
    await expect(page.locator('[data-add-type="note"]')).toBeVisible();
  });

  test("TC-UI-EDIT-03: обычная ссылка проверяется — невалидный домен показывает ошибку", async ({ page }) => {
    await page.locator('[data-add-type="link"]').click();
    const input = page.getByPlaceholder("https://example.com");
    await input.fill("abc");
    await page.getByRole("button", { name: /добавить/i }).click();
    await expect(page.getByText(/Укажите корректный домен ссылки/i)).toBeVisible();
  });

  test("TC-UI-EDIT-04: на телефоне кнопка «⋯» в тулбаре открывает меню", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const overflowToggle = page.getByTestId("editor-overflow-toggle");
    await expect(overflowToggle).toBeVisible();
    await overflowToggle.click();
    await expect(page.getByTestId("editor-overflow-menu")).toBeVisible();
    await expect(page.getByRole("button", { name: "Ссылка" })).toBeVisible();
  });

  test("TC-UI-EDIT-05: на десктопе кнопка «⋯» в тулбаре открывает меню", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    const overflowToggle = page.getByTestId("editor-overflow-toggle");
    await expect(overflowToggle).toBeVisible();
    await overflowToggle.click();
    await expect(page.getByTestId("editor-overflow-menu")).toBeVisible();
  });

  test("TC-UI-EDIT-06: на телефоне через «⋯» добавление музыки открывает поле ввода", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByTestId("editor-overflow-toggle").click();
    await page.getByRole("button", { name: "Музыка" }).click();
    await expect(page.getByPlaceholder("https://music.yandex.ru/...")).toBeVisible();
  });

  test("TC-UI-EDIT-07: на телефоне модалка соцсетей не обрезается по ширине", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByTestId("editor-overflow-toggle").click();
    await page.getByRole("button", { name: "Соцсеть" }).click();
    const modalCard = page.locator("div.card").filter({ has: page.getByText("Добавить соцсеть") }).first();
    await expect(modalCard).toBeVisible();
    const fitsViewport = await modalCard.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.left >= 0 && r.right <= window.innerWidth;
    });
    expect(fitsViewport).toBeTruthy();
  });

  test("TC-UI-EDIT-08: при изменении ширины экрана высота блока не раздувается", async ({ page }) => {
    await page.locator('[data-add-type="note"]').click();
    const noteEditable = page.locator('[contenteditable="true"]').first();
    await noteEditable.waitFor({ state: "visible", timeout: 20_000 });
    await noteEditable.evaluate((el) => {
      el.textContent = "Проверка адаптивной высоты";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.keyboard.press("Tab");
    await page.waitForTimeout(500);

    const card = page.locator('[data-block-id]').first();
    await expect(card).toBeVisible();

    await page.setViewportSize({ width: 900, height: 900 });
    const heightNarrow = await card.evaluate((el) => el.getBoundingClientRect().height);

    await page.setViewportSize({ width: 1400, height: 900 });
    const heightWide = await card.evaluate((el) => el.getBoundingClientRect().height);

    // На широком экране блок не должен резко расти по высоте.
    expect(heightWide).toBeLessThanOrEqual(heightNarrow + 24);
  });

  test("TC-UI-EDIT-09: в режиме phone preview скролл идёт внутри рамки телефона", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 700 });
    for (let i = 0; i < 24; i++) {
      await page.locator('[data-add-type="note"]').click();
    }
    await page.waitForTimeout(500);

    await page.getByTestId("editor-preview-phone-toggle").click();
    const shell = page.locator(".editor-phone-preview-shell");
    const scrollArea = page.locator(".editor-phone-preview-shell .two-column-layout");
    await expect(shell).toBeVisible();
    await expect(scrollArea).toBeVisible();

    const metricsBefore = await scrollArea.evaluate((el) => ({
      scrollTop: el.scrollTop,
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
      windowScrollY: window.scrollY,
    }));
    expect(metricsBefore.scrollHeight).toBeGreaterThan(metricsBefore.clientHeight);

    const box = await shell.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(200);

    const metricsAfter = await scrollArea.evaluate((el) => ({
      scrollTop: el.scrollTop,
      windowScrollY: window.scrollY,
    }));

    expect(metricsAfter.scrollTop).toBeGreaterThan(metricsBefore.scrollTop);
    expect(metricsAfter.windowScrollY).toBe(metricsBefore.windowScrollY);
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
