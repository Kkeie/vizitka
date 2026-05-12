import React, { useCallback } from "react";
import ReactDOM from "react-dom/client";
import { flushSync } from "react-dom";
import { createBrowserRouter, RouterProvider, useLocation, useNavigate } from "react-router-dom";
import "./index.css";
import "./styles.css";
import "./styles/drag-reorder.css";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import RegisterPending from "./pages/RegisterPending";
import VerifyEmail from "./pages/VerifyEmail";
import Editor from "./pages/Editor";
import Public from "./pages/Public";
import { getToken, me, setToken, subscribeAuthToken, type User } from "./api";
import { SessionContext, useSession } from "./sessionContext";

function NavLayout({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ width: "100%", maxWidth: "100%" }}>{children}</main>
  );
}

function HomeWrapper() {
  const location = useLocation();
  if (location.pathname !== "/") {
    return null;
  }
  return <Home />;
}

function EditorWrapper() {
  const location = useLocation();
  const { user, setUser } = useSession();
  const navigate = useNavigate();
  const onLogout = useCallback(() => {
    setToken(null);
    flushSync(() => {
      setUser(null);
    });
    navigate("/login", { replace: true });
  }, [setUser, navigate]);

  if (location.pathname !== "/editor") return null;
  return <Editor onLogout={onLogout} />;
}

/** Один экземпляр на всё приложение: иначе при каждом setUser RouterProvider сбрасывался и ломались /login и редиректы. */
const router = createBrowserRouter([
  { path: "/", element: <NavLayout><HomeWrapper /></NavLayout> },
  { path: "/index.html", element: <NavLayout><HomeWrapper /></NavLayout> },
  { path: "/login", element: <NavLayout><Login /></NavLayout> },
  { path: "/register", element: <NavLayout><Register /></NavLayout> },
  { path: "/register/pending", element: <NavLayout><RegisterPending /></NavLayout> },
  { path: "/verify-email", element: <NavLayout><VerifyEmail /></NavLayout> },
  { path: "/editor", element: <NavLayout><EditorWrapper /></NavLayout> },
  { path: "/public/:username", element: <NavLayout><Public /></NavLayout> },
  { path: "/u/:username", element: <NavLayout><Public /></NavLayout> },
  { path: "/:username", element: <NavLayout><Public /></NavLayout> },
  { path: "*", element: <NavLayout><div className="p-6">404</div></NavLayout> },
]);

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

  React.useEffect(() => {
    const stop = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener("dragover", stop, false);
    window.addEventListener("drop", stop, false);
    return () => {
      window.removeEventListener("dragover", stop, false);
      window.removeEventListener("drop", stop, false);
    };
  }, []);

  return (
    <SessionContext.Provider value={sessionValue}>
      <div className="page-bg min-h-screen">
        <RouterProvider router={router} />
      </div>
    </SessionContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<Shell />);
