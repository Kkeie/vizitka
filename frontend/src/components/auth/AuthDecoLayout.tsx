import React, { useEffect, useState } from "react";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import { AuthDecoContext, type DecoMode } from "./AuthDecoContext";
import DecoCards from "../onboarding/DecoCards";
import { useSession } from "../../sessionContext";
import "../../pages/LoginPage.css";

export default function AuthDecoLayout() {
  const { user, authReady } = useSession();
  const location = useLocation();

  const initMode: DecoMode =
    location.pathname === "/login" ? "floating-nopill" : "floating";
  const [mode, setMode] = useState<DecoMode>(initMode);
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (location.pathname === "/login") {
      setMode("floating-nopill");
      setUsername("");
    } else if (location.pathname.startsWith("/register")) {
      setMode("floating");
      setUsername("");
    }
  }, [location.pathname]);

  if (!authReady) {
    return (
      <div className="login-bento min-h-screen" aria-busy="true">
        <div className="login-bento__inner">
          <div className="login-bento__form-col">
            <p className="login-bento__subtitle">Проверяем сессию…</p>
          </div>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/editor" replace />;
  }

  return (
    <AuthDecoContext.Provider value={{ mode, username, setMode, setUsername }}>
      <div className="login-bento min-h-screen">
        <div className="login-bento__inner">
          <div className="login-bento__form-col">
            <Outlet />
          </div>
          <div className="step1-right">
            <DecoCards username={username} mode={mode} />
          </div>
        </div>
      </div>
    </AuthDecoContext.Provider>
  );
}
