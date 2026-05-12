import React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { verifyEmailWithToken } from "../api";
import { useSession } from "../sessionContext";
import "./LoginPage.css";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser: onAuthed } = useSession();
  const token = (searchParams.get("token") || "").trim();
  const [state, setState] = React.useState<"working" | "ok" | "bad">("working");
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const guardKey = token ? `bento-email-verify:${token}` : "";
    if (guardKey && typeof sessionStorage !== "undefined" && sessionStorage.getItem(guardKey) === "done") {
      navigate("/editor", { replace: true });
      return;
    }
    (async () => {
      if (!token) {
        setState("bad");
        setMessage("В ссылке нет кода подтверждения. Откройте ссылку из письма.");
        return;
      }
      try {
        const { user } = await verifyEmailWithToken(token);
        if (cancelled) return;
        if (guardKey) sessionStorage.setItem(guardKey, "done");
        onAuthed(user);
        setState("ok");
        navigate("/editor", { replace: true });
      } catch (e) {
        if (cancelled) return;
        setState("bad");
        const code = e instanceof Error ? e.message : "verify_failed";
        if (code === "invalid_or_expired_token") {
          setMessage("Ссылка недействительна или устарела. Запросите новое письмо на экране регистрации или войдите, если уже подтверждали.");
        } else if (code === "network_error") {
          setMessage("Нет соединения с сервером. Проверьте сеть и попробуйте снова.");
        } else {
          setMessage("Не удалось подтвердить email. Попробуйте ещё раз.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, navigate, onAuthed]);

  return (
    <div className="login-bento min-h-screen">
      <div className="login-bento__inner">
        <div className="login-bento__form-col">
          <h1 className="login-bento__title">Подтверждение email</h1>
          {state === "working" && <p className="login-bento__subtitle">Подождите…</p>}
          {state === "bad" && message && (
            <p className="login-bento__error" role="alert">
              {message}
            </p>
          )}
          <p className="login-bento__foot">
            <Link to="/login">На страницу входа</Link>
            {" · "}
            <Link to="/register">Регистрация</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
