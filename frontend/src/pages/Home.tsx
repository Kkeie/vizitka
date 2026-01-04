import React from "react";
import { Navigate } from "react-router-dom";
import { me } from "../api";

export default function Home() {
  const [checking, setChecking] = React.useState(true);
  const [authed, setAuthed] = React.useState(false);

  React.useEffect(() => {
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
  }, []);

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
