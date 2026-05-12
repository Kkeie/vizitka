import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { resendVerificationEmail } from "../api";
import "./LoginPage.css";

export default function RegisterPending() {
  const [searchParams] = useSearchParams();
  const email = (searchParams.get("email") || "").trim();
  const [status, setStatus] = React.useState<"idle" | "sending" | "sent" | "error" | "rate_limited">("idle");

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
