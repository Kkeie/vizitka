import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, useLocation } from "react-router-dom";
import "./index.css";
import "./styles.css";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Editor from "./pages/Editor";
import Public from "./pages/Public";
import { me, setToken, type User } from "./api";

function Shell() {
  const [user, setUser] = React.useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = React.useState(true);

  // Обработка редиректа с 404.html: восстанавливаем путь из URL параметра
  React.useEffect(() => {
    const currentPath = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const pathParam = searchParams.get('__path');
    
    if (pathParam && (currentPath === "/index.html" || currentPath === "/index")) {
      const decodedPath = decodeURIComponent(pathParam);
      console.log('[Shell] Restoring path from URL param:', decodedPath);
      // Очищаем флаг редиректа
      sessionStorage.removeItem('404Redirected');
      // Используем replace для полной перезагрузки страницы с правильным путем
      // Это предотвращает попытки браузера загрузить несуществующие файлы
      window.location.replace(decodedPath);
      return;
    }
    
    // Если попали на /index.html без параметра, редиректим на главную
    if (currentPath === "/index.html" || currentPath === "/index") {
      console.log('[Shell] On /index.html without path param, redirecting to /');
      sessionStorage.removeItem('404Redirected');
      window.location.replace('/');
    }
  }, []);

  React.useEffect(() => {
    (async () => {
      try { 
        const u = await me(); 
        setUser(u);
      } catch { 
        setUser(null);
      } finally {
        setCheckingAuth(false);
      }
    })();
  }, []);

  // Prevent accidental navigation when user drags an image/file onto the page
  React.useEffect(() => {
    const stop = (e: DragEvent) => { e.preventDefault(); };
    window.addEventListener('dragover', stop, false);
    window.addEventListener('drop', stop, false);
    return () => {
      window.removeEventListener('dragover', stop, false);
      window.removeEventListener('drop', stop, false);
    };
  }, []);

  const onLogout = () => { setToken(null); setUser(null); };

  const withNav = (el: React.ReactNode) => (
    <>
      <Navbar user={user} onLogout={onLogout} />
      <main style={{ width: "100%", maxWidth: "100%" }}>
        {el}
      </main>
    </>
  );

  // Компонент-обертка для Home, который проверяет путь перед рендерингом
  function HomeWrapper() {
    const location = useLocation();
    // Если путь не "/", не рендерим Home
    if (location.pathname !== "/") {
      return null;
    }
    return <Home />;
  }

  // Компонент-обертка для Editor, который проверяет путь перед рендерингом
  function EditorWrapper() {
    const location = useLocation();
    // Если путь не "/editor", не рендерим Editor
    if (location.pathname !== "/editor") {
      return null;
    }
    return <Editor />;
  }

  const router = createBrowserRouter([
    { path: "/", element: withNav(<HomeWrapper />) },
    { path: "/index.html", element: withNav(<HomeWrapper />) }, // Обрабатываем /index.html как главную
    { path: "/login", element: withNav(<Login onAuthed={(u)=>setUser(u)} />) },
    { path: "/register", element: withNav(<Register onAuthed={(u)=>setUser(u)} />) },
    { path: "/editor", element: withNav(<EditorWrapper />) },
    // Публичные страницы должны быть ПЕРЕД catch-all маршрутом
    { path: "/public/:username", element: withNav(<Public />) }, // Публичная страница: /public/username
    { path: "/u/:username", element: withNav(<Public />) }, // Старый формат для обратной совместимости
    { path: "/:username", element: withNav(<Public />) }, // Обратная совместимость: /username (публичная страница, доступна всем)
    { path: "*", element: withNav(<div className="p-6">404</div>) },
  ]);

  return (
    <div className="page-bg min-h-screen">
      <RouterProvider router={router} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<Shell />);
