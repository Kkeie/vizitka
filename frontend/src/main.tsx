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

  // Обработка редиректа с 404.html для GitHub Pages
  React.useEffect(() => {
    const currentPath = window.location.pathname;
    
    // Если попали на /index или /index.html, редиректим на главную
    if (currentPath === "/index" || currentPath === "/index.html") {
      window.history.replaceState(null, '', "/");
      return;
    }
    
    // Не делаем редирект если текущий путь - это публичная страница (не системный маршрут)
    const SYSTEM_PATHS = ["/", "/login", "/register", "/editor", "/index", "/index.html"];
    const isPublicPage = !SYSTEM_PATHS.includes(currentPath) &&
                        !currentPath.startsWith("/api") &&
                        !currentPath.startsWith("/u/");
    
    // Редирект с 404.html только для системных маршрутов, не для публичных страниц
    const redirect = sessionStorage.redirect;
    if (redirect && redirect !== window.location.href && !isPublicPage) {
      delete sessionStorage.redirect;
      window.history.replaceState(null, '', redirect);
    } else if (redirect) {
      // Если есть редирект для публичной страницы, просто удаляем его
      delete sessionStorage.redirect;
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
    // Если путь не "/", "/index" или "/index.html", не рендерим Home
    if (location.pathname !== "/" && location.pathname !== "/index" && location.pathname !== "/index.html") {
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
    { path: "/login", element: withNav(<Login onAuthed={(u)=>setUser(u)} />) },
    { path: "/register", element: withNav(<Register onAuthed={(u)=>setUser(u)} />) },
    { path: "/editor", element: withNav(<EditorWrapper />) },
    { path: "/index", element: withNav(<HomeWrapper />) }, // Редирект /index на главную
    { path: "/index.html", element: withNav(<HomeWrapper />) }, // Редирект /index.html на главную
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
