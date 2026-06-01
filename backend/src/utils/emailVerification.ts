import { db } from "./db";
import { generateVerificationToken, hashVerificationToken } from "./verificationToken";
import { buildEmailVerificationUrl, sendVerificationEmail } from "./mailer";

export const VERIFY_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;

export function isEmailTakenByAnotherUser(email: string, excludeUserId: number): boolean {
  const row = db
    .prepare(
      `SELECT id FROM User
       WHERE id != ?
         AND (email = ? COLLATE NOCASE OR pendingEmail = ? COLLATE NOCASE)`,
    )
    .get(excludeUserId, email, email);
  return Boolean(row);
}

export function queueEmailVerification(userId: number, targetEmail: string, asPendingEmail: boolean) {
  const normalized = targetEmail.trim().toLowerCase();
  const rawVerify = generateVerificationToken();
  const verifyHash = hashVerificationToken(rawVerify);
  const verifyExpires = new Date(Date.now() + VERIFY_TOKEN_TTL_MS).toISOString();
  const verifySentAt = new Date().toISOString();

  if (asPendingEmail) {
    db.prepare(
      `UPDATE User SET
        pendingEmail = ?,
        emailVerifyTokenHash = ?,
        emailVerifyExpiresAt = ?,
        emailVerifySentAt = ?
      WHERE id = ?`,
    ).run(normalized, verifyHash, verifyExpires, verifySentAt, userId);
  } else {
    db.prepare(
      `UPDATE User SET
        emailVerifyTokenHash = ?,
        emailVerifyExpiresAt = ?,
        emailVerifySentAt = ?
      WHERE id = ?`,
    ).run(verifyHash, verifyExpires, verifySentAt, userId);
  }

  return { rawToken: rawVerify, targetEmail: normalized };
}

export function sendQueuedVerificationEmail(rawToken: string, targetEmail: string) {
  const verifyUrl = buildEmailVerificationUrl(rawToken);
  void sendVerificationEmail(targetEmail, verifyUrl).catch((e) => {
    console.error("[email-verification] send failed:", e);
  });
}

export type EmailVerificationPurpose = "registration" | "email_change";

export function completeEmailVerification(
  userId: number,
  pendingEmail: string | null,
): EmailVerificationPurpose {
  if (pendingEmail) {
    const normalized = pendingEmail.trim().toLowerCase();
    db.prepare(
      `UPDATE User SET
        email = ?,
        pendingEmail = NULL,
        emailVerified = 1,
        emailVerifyTokenHash = NULL,
        emailVerifyExpiresAt = NULL
      WHERE id = ?`,
    ).run(normalized, userId);
    db.prepare("UPDATE Profile SET email = ? WHERE userId = ?").run(normalized, userId);
    return "email_change";
  }

  db.prepare(
    `UPDATE User SET
      emailVerified = 1,
      emailVerifyTokenHash = NULL,
      emailVerifyExpiresAt = NULL
    WHERE id = ?`,
  ).run(userId);
  return "registration";
}
