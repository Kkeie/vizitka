import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, useLocation } from "react-router-dom";
import "./index.css";
import "./styles.css";
import "./styles/drag-reorder.css";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Editor from "./pages/Editor";
import Public from "./pages/Public";
import { getToken, me, setToken, subscribeAuthToken, type User } from "./api";
import { SessionContext } from "./sessionContext";

function Shell() {
  const [user, setUser] = React.useState<User | null>(null);
  const [authReady, setAuthReady] = React.useState(false);

  const sessionValue = React.useMemo(
    () => ({ user, authReady, setUser }),
    [user, authReady],
  );

  React.useEffect(() => {
    let alive = true;
    let firstAuthResolve = true;

    const loadCurrentUser = async () => {
      const requestToken = getToken();
      if (!requestToken) {
        if (alive) setUser(null);
        if (alive && firstAuthResolve) {
          setAuthReady(true);
          firstAuthResolve = false;
        }
        return;
      }

      try {
        const u = await me();
        if (alive && getToken() === requestToken) {
          setUser(u);
        }
      } catch {
        if (alive && getToken() === requestToken) {
          setUser(null);
        }
      } finally {
        if (alive && firstAuthResolve) {
          setAuthReady(true);
          firstAuthResolve = false;
        }
      }
    };

    loadCurrentUser();
    const unsubscribe = subscribeAuthToken((nextToken) => {
      if (!nextToken) {
        if (alive) setUser(null);
        return;
      }
      loadCurrentUser();
    });

    return () => {
      alive = false;
      unsubscribe();
    };
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
    { path: "/login", element: withNav(<Login />) },
    { path: "/register", element: withNav(<Register />) },
    { path: "/editor", element: withNav(<EditorWrapper />) },
    // Публичные страницы должны быть ПЕРЕД catch-all маршрутом
    { path: "/public/:username", element: withNav(<Public />) }, // Публичная страница: /public/username
    { path: "/u/:username", element: withNav(<Public />) }, // Старый формат для обратной совместимости
    { path: "/:username", element: withNav(<Public />) }, // Обратная совместимость: /username (публичная страница, доступна всем)
    { path: "*", element: withNav(<div className="p-6">404</div>) },
  ]);

  return (
    <SessionContext.Provider value={sessionValue}>
      <div className="page-bg min-h-screen">
        <RouterProvider router={router} />
      </div>
    </SessionContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<Shell />);
