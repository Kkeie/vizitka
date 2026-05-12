import nodemailer from "nodemailer";

function getFrontendOrigin(): string {
  const single =
    process.env.FRONTEND_APP_URL?.trim() ||
    process.env.FRONTEND_URL?.split(",")[0]?.trim();
  if (single) return single.replace(/\/+$/, "");
  return "http://localhost:5173";
}

export function buildEmailVerificationUrl(rawToken: string): string {
  const base = getFrontendOrigin();
  return `${base}/verify-email?token=${encodeURIComponent(rawToken)}`;
}

function parseTimeoutMs(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function createTransport() {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;

  const port = Number(process.env.SMTP_PORT || "587");
  const secure =
    process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1" || port === 465;

  const connectionTimeout = parseTimeoutMs(process.env.SMTP_CONNECTION_TIMEOUT_MS, 12_000);
  const greetingTimeout = parseTimeoutMs(process.env.SMTP_GREETING_TIMEOUT_MS, 12_000);
  const socketTimeout = parseTimeoutMs(process.env.SMTP_SOCKET_TIMEOUT_MS, 20_000);

  /** Часто помогает при «вечном» коннекте к smtp.gmail.com на Windows (IPv6). 4 = только IPv4, 6 = IPv6. */
  const familyRaw = process.env.SMTP_IP_FAMILY?.trim();
  const family =
    familyRaw === "6" ? 6 : familyRaw === "4" || familyRaw === undefined || familyRaw === "" ? 4 : undefined;

  const options = {
    host,
    port,
    secure,
    connectionTimeout,
    greetingTimeout,
    socketTimeout,
    requireTLS: !secure && port === 587,
    tls: { minVersion: "TLSv1.2" as const },
    ...(family !== undefined ? { family } : {}),
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    debug: process.env.SMTP_DEBUG === "1" || process.env.SMTP_DEBUG === "true",
  };

  return nodemailer.createTransport(options);
}
let cachedTransport: nodemailer.Transporter | null | undefined;

function getOrCreateTransport(): nodemailer.Transporter | null {
  if (cachedTransport === undefined) {
    cachedTransport = createTransport();
  }
  return cachedTransport;
}

export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
  const transport = getOrCreateTransport();
  const from = process.env.EMAIL_FROM?.trim() || process.env.SMTP_FROM?.trim() || "noreply@localhost";

  if (!transport) {
    console.warn(`[MAIL] SMTP_HOST not set — logging verification link instead of sending email to ${to}`);
    console.warn(`[MAIL] Link: ${verifyUrl}`);
    return;
  }

  const send = transport.sendMail({
    from,
    to,
    subject: "Подтвердите email",
    text: `Подтвердите адрес, перейдя по ссылке:\n\n${verifyUrl}\n\nЕсли это были не вы, проигнорируйте письмо.`,
    html: `<p>Подтвердите адрес электронной почты:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>Если это были не вы, проигнорируйте письмо.</p>`,
  });
  const timeoutMs = parseTimeoutMs(process.env.SMTP_SEND_TIMEOUT_MS, 20_000);
  try {
    await Promise.race([
      send,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`sendMail timeout after ${timeoutMs}ms`)), timeoutMs),
      ),
    ]);
  } catch (e) {
    if (e instanceof Error && e.message.includes("sendMail timeout")) {
      console.warn(
        "[MAIL] SMTP timeout — часто виноват VPN (блокирует/ломает исходящий трафик на 465/587) или фаервол. " +
          "Попробуйте без VPN, split-tunnel или другой режим VPN. Иначе: SMTP_PORT=587 SMTP_SECURE=false, SMTP_IP_FAMILY=4. Подробнее: SMTP_DEBUG=1",
      );
    }
    throw e;
  }
}
