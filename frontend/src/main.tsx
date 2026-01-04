import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
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
    const redirect = sessionStorage.redirect;
    delete sessionStorage.redirect;
    if (redirect && redirect !== window.location.href) {
      window.history.replaceState(null, '', redirect);
    }
  }, []);

  React.useEffect(() => {
    (async () => {
      const currentPath = window.location.pathname;
      // Публичные страницы (/:username) не требуют авторизации и не должны редиректить
      const isPublicPage = currentPath !== "/" && 
                          currentPath !== "/login" && 
                          currentPath !== "/register" && 
                          currentPath !== "/editor" &&
                          !currentPath.startsWith("/api") &&
                          !currentPath.startsWith("/u/");
      
      try { 
        const u = await me(); 
        setUser(u);
        // Редирект на /editor только если пользователь на главной странице, /login или /register
        // НЕ редиректим если это публичная страница
        if (u && !isPublicPage && (currentPath === "/" || currentPath === "/login" || currentPath === "/register")) {
          window.location.href = "/editor";
        }
      } catch { 
        setUser(null);
        // Редирект на /login только если пользователь пытается зайти на /editor без авторизации
        // НЕ редиректим если это публичная страница
        if (!isPublicPage && currentPath === "/editor") {
          window.location.href = "/login";
        }
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

  const router = createBrowserRouter([
    { path: "/", element: withNav(<Home />) },
    { path: "/login", element: withNav(<Login onAuthed={(u)=>setUser(u)} />) },
    { path: "/register", element: withNav(<Register onAuthed={(u)=>setUser(u)} />) },
    { path: "/editor", element: withNav(<Editor />) },
    { path: "/u/:username", element: withNav(<Public />) }, // Старый формат для обратной совместимости
    // Маршрут /:username должен быть перед catch-all маршрутом, но после всех конкретных маршрутов
    { path: "/:username", element: withNav(<Public />) }, // Новый формат: /username (публичная страница, доступна всем)
    { path: "*", element: withNav(<div className="p-6">404</div>) },
  ]);

  return (
    <div className="page-bg min-h-screen">
      <RouterProvider router={router} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<Shell />);
