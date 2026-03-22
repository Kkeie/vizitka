import React from "react";
import { register, type User } from "../api";
import { useNavigate, Link } from "react-router-dom";
import UsernameInput from '../components/UsernameInput';

export default function Register({ onAuthed }: { onAuthed: (u: User) => void }) {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || username.length < 3) {
      setErr("Username должен содержать минимум 3 символа");
      return;
    }
    if (!password || password.length < 4) {
      setErr("Пароль должен содержать минимум 4 символа");
      return;
    }
    
    setErr(null);   
    setLoading(true); 
    try {
      const { user } = await register(username, password);
      onAuthed(user);
      nav("/editor");
    } catch (error: any) {
      const errorMessage = error?.message || "register_failed";
      let message = "Не удалось создать аккаунт.";

      if (errorMessage === "username_taken") {
        message = "Этот username уже занят. Выберите другой.";
      } else if (errorMessage === "username_too_short") {
        message = "Username должен содержать минимум 3 символа.";
      } else if (errorMessage === "password_too_short") {
        message = "Пароль должен содержать минимум 4 символа.";
      } else if (errorMessage === "username_and_password_required") {
        message = "Заполните все поля.";
      } else if (errorMessage === "internal_error") {
        message = "Ошибка сервера. Попробуйте позже.";
      } else if (errorMessage === "backend_api_not_configured") {
        message = "Frontend собран без VITE_BACKEND_API_URL. Для Render укажите полный URL backend с /api на конце.";
      } else if (errorMessage === "api_returned_html") {
        message = "API вернул HTML вместо JSON. Проверьте URL backend и настройку прокси.";
      } else if (errorMessage === "network_error") {
        message = "Не удалось подключиться к API. Проверьте, что backend запущен и доступен.";
      } else {
        console.error("Registration error:", errorMessage);
        message = `Ошибка: ${errorMessage}`;
      }

      setErr(message);
    } finally { 
      setLoading(false); 
    }
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setUsername(suggestion);
    // setTimeout(() => {
    //   const form = document.querySelector("form");
    //   if (form) form.requestSubmit();
    // }, 100);
  };

  return (
    <div className="page-bg min-h-screen" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="reveal reveal-in" style={{ width: "100%", maxWidth: 420 }}>
        <form onSubmit={submit} className="card" style={{ padding: 40 }}>
          <div style={{ marginBottom: 32, textAlign: "center" }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 12 }}>
              Регистрация
            </h1>
            <p style={{ fontSize: 16, color: "var(--muted)", lineHeight: 1.6 }}>
              Создайте аккаунт и начните создавать свою страницу
            </p>
          </div>

          {/* Компонент для username со встроенными предложениями */}
          <UsernameInput
            value={username}
            onChange={setUsername}
            onSelectSuggestion={handleSuggestionSelect}
            disabled={loading}
          />
          
          <div className="field" style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
              Password
            </label>
            <input 
              className="input" 
              placeholder="Придумайте password" 
              type="password" 
              value={password} 
              onChange={(e)=>setPassword(e.target.value)}
              required
              minLength={4}
              style={{ fontSize: 15 }}
            />
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
              Минимум 4 символа
            </p>
          </div>
          
          {err && (
            <div className="ribbon error" style={{ marginBottom: 20 }}>
              {err}
            </div>
          )}
          
          <button 
            disabled={loading} 
            className="btn btn-primary" 
            style={{ width: "100%", fontSize: 15, padding: "14px 24px" }}
            type="submit"
          >
            {loading ? "Создание..." : "Создать аккаунт"}
          </button>
          
          <div style={{ textAlign: "center", marginTop: 24, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
            <p style={{ fontSize: 14, color: "var(--muted)" }}>
              Уже есть аккаунт?{" "}
              <Link 
                to="/login" 
                style={{ 
                  color: "var(--text)", 
                  fontWeight: 600, 
                  textDecoration: "none",
                  borderBottom: "1.5px solid currentColor",
                  paddingBottom: 2
                }}
              >
                Войти
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
