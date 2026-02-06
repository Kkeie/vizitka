import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { me } from "../api";

export default function Home() {
  const location = useLocation();
  const [checking, setChecking] = React.useState(true);
  const [authed, setAuthed] = React.useState(false);

  React.useEffect(() => {
    // Проверяем, что мы действительно на главной странице, а не на публичной
    // Убрали проверку на /index и /index.html, так как они больше не являются маршрутами
    if (location.pathname !== "/") {
      setChecking(false);
      return;
    }

    (async () => {
      try {
        await me();
        setAuthed(true);
      } catch {
        setAuthed(false);
      } finally {
        setChecking(false);
      }
    })();
  }, [location.pathname]);

  // Если мы не на главной странице, не делаем редирект
  if (location.pathname !== "/") {
    return null;
  }

  if (checking) {
    return (
      <div className="container" style={{ paddingTop: 80, paddingBottom: 80, textAlign: "center" }}>
        <div className="muted">Загрузка...</div>
      </div>
    );
  }

  // Редирект на Editor если авторизован, иначе на Login
  return <Navigate to={authed ? "/editor" : "/login"} replace />;
}
