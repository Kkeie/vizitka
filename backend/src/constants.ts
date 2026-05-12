/** Ник в URL: латиница, цифры, подчёркивание. */
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 32;

/** Практический максимум длины email для полей формы и БД. */
export const EMAIL_MAX_LENGTH = 254;

/** Новые пароли: не короче минимума; не длиннее — совместимость с bcrypt (72 байта). */
export const PASSWORD_MIN_LENGTH = 4;
export const PASSWORD_MAX_LENGTH = 72;

export const RESERVED_USERNAMES = [
  "login",
  "register",
  "editor",
  "u",
  "api",
  "index.html",
  "404.html",
  "index",
  "public",
  "favicon.ico",
  "robots.txt"
];