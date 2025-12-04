import React from "react";
import { Navigate } from "react-router-dom";

export default function Home() {
  const authed = Boolean(localStorage.getItem("token"));
  
  // Редирект на Editor если авторизован, иначе на Login
  return <Navigate to={authed ? "/editor" : "/login"} replace />;
}
