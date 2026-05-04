import React from "react";
import { login } from "../api";
import { useNavigate, Link, Navigate } from "react-router-dom";
import AuthSocialCollage from "../components/AuthSocialCollage";
import { useSession } from "../sessionContext";
import "./LoginPage.css";

export default function Login() {
  const { user, authReady, setUser: onAuthed } = useSession();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const nav = useNavigate();

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const { user } = await login(email, password);
      onAuthed(user);
      nav("/editor");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "login_failed";

      if (errorMessage === "backend_api_not_configured") {
        setErr("Frontend is built without VITE_BACKEND_API_URL. Set the full backend API URL (ending with /api) for production.");
      } else if (errorMessage === "api_returned_html") {
        setErr("The API returned HTML instead of JSON. Check the backend URL and proxy settings.");
      } else if (errorMessage === "network_error") {
        setErr("Could not connect to the API. Make sure the backend is running and reachable.");
      } else {
        setErr("Wrong email or password");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!authReady) {
    return (
      <div className="login-bento min-h-screen" aria-busy="true">
        <div className="login-bento__inner">
          <p className="login-bento__subtitle">Checking your session…</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/editor" replace />;
  }

  return (
    <div className="login-bento min-h-screen">
      <div className="login-bento__inner">
        <div className="login-bento__form-col">
          <h1 className="login-bento__title">Log in to your Bento</h1>
          <p className="login-bento__subtitle">Good to have you back!</p>

          <form onSubmit={submit} noValidate>
            {err && (
              <p className="login-bento__error" role="alert">
                {err}
              </p>
            )}
            <div className="login-bento__row">
              <input
                className="login-bento__input"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                spellCheck={false}
              />
              <input
                className="login-bento__input"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button className="login-bento__submit" type="submit" disabled={loading}>
              {loading ? "Logging in…" : "Log in"}
            </button>
          </form>

          <p className="login-bento__foot">
            or{" "}
            <Link to="/register">sign up</Link>
          </p>
        </div>

        <AuthSocialCollage />
      </div>
    </div>
  );
}
