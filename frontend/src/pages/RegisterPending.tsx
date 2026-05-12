import React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  DEVICE_RESUME_SESSION_STORAGE_KEY,
  resendVerificationEmail,
  resumeRegistrationAfterVerify,
} from "../api";
import { useSession } from "../sessionContext";
import "./LoginPage.css";

const RESUME_POLL_MS = 2000;

export default function RegisterPending() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser: onAuthed } = useSession();
  const email = (searchParams.get("email") || "").trim();
  const [status, setStatus] = React.useState<"idle" | "sending" | "sent" | "error" | "rate_limited">("idle");
  const [resumeError, setResumeError] = React.useState<string | null>(null);
  const [hasResumeToken, setHasResumeToken] = React.useState(() => {
    try {
      return !!sessionStorage.getItem(DEVICE_RESUME_SESSION_STORAGE_KEY);
    } catch {
      return false;
    }
  });

  const resend = async () => {
    if (!email) return;
    setStatus("sending");
    try {
      await resendVerificationEmail(email);
      setStatus("sent");
    } catch (e) {
      if (e instanceof Error && e.message === "rate_limited") {
        setStatus("rate_limited");
      } else {
        setStatus("error");
      }
    }
  };

  React.useEffect(() => {
    let cancelled = false;
    let token: string | null = null;
    try {
      token = sessionStorage.getItem(DEVICE_RESUME_SESSION_STORAGE_KEY);
    } catch {
      token = null;
    }
    if (!token) {
      setHasResumeToken(false);
      return;
    }
    setHasResumeToken(true);

    const tick = async () => {
      if (cancelled) return;
      try {
        const out = await resumeRegistrationAfterVerify(token!);
        if (cancelled) return;
        if (out.ready) {
          onAuthed(out.user);
          navigate("/editor", { replace: true });
        }
      } catch (e) {
        if (cancelled) return;
        const code = e instanceof Error ? e.message : "resume_failed";
        if (code === "invalid_or_expired_device_resume" || code === "device_resume_token_required") {
          setResumeError(
            "Сессия ожидания устарела. Подтвердите почту по ссылке и войдите с паролем или зарегистрируйтесь снова.",
          );
          try {
            sessionStorage.removeItem(DEVICE_RESUME_SESSION_STORAGE_KEY);
          } catch {
            /* ignore */
          }
          return;
        }
        if (code === "network_error") {
          /* продолжаем опрос */
        }
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), RESUME_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [navigate, onAuthed]);

  return (
    <div className="login-bento min-h-screen">
      <div className="login-bento__inner">
        <div className="login-bento__form-col">
          <h1 className="login-bento__title">Проверьте почту</h1>
          <p className="login-bento__subtitle">
            Мы отправили письмо со ссылкой для подтверждения
            {email ? (
              <>
                {" "}
                на <strong>{email}</strong>
              </>
            ) : (
              ""
            )}
            . Перейдите по ссылке, чтобы завершить регистрацию.
          </p>

          {hasResumeToken && !resumeError && (
            <p className="login-bento__subtitle" role="status">
              Когда подтвердите почту, эта страница сама откроет редактор — не закрывайте вкладку.
            </p>
          )}
          {!hasResumeToken && !resumeError && (
            <p className="login-bento__subtitle" role="status">
              Чтобы вход подхватился автоматически, завершите регистрацию в этом же браузере или войдите после
              подтверждения.
            </p>
          )}

          {resumeError && (
            <p className="login-bento__error" role="alert">
              {resumeError}
            </p>
          )}

          {status === "sent" && (
            <p className="login-bento__subtitle" role="status">
              Письмо отправлено ещё раз.
            </p>
          )}
          {status === "rate_limited" && (
            <p className="login-bento__error" role="alert">
              Слишком частые запросы. Подождите около минуты.
            </p>
          )}
          {status === "error" && (
            <p className="login-bento__error" role="alert">
              Не удалось отправить письмо. Попробуйте позже.
            </p>
          )}

          <button
            type="button"
            className="login-bento__submit"
            onClick={resend}
            disabled={!email || status === "sending"}
          >
            {status === "sending" ? "Отправка…" : "Отправить письмо снова"}
          </button>

          <p className="login-bento__foot">
            <Link to="/login">Уже подтвердили? Войти</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
