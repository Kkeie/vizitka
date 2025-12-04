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
import MyBento from "./pages/MyBento";
import Public from "./pages/Public";
import { me, setToken, type User } from "./api";

function Shell() {
  const [user, setUser] = React.useState<User | null>(null);

  React.useEffect(() => {
    (async () => {
      try { const u = await me(); setUser(u); } catch { setUser(null); }
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
      <main className="max-w-6xl mx-auto px-6 py-8">
        {el}
      </main>
    </>
  );

  const router = createBrowserRouter([
    { path: "/", element: withNav(<Home />) },
    { path: "/login", element: withNav(<Login onAuthed={(u)=>setUser(u)} />) },
    { path: "/register", element: withNav(<Register onAuthed={(u)=>setUser(u)} />) },
    { path: "/editor", element: withNav(<Editor />) },
    { path: "/mybento", element: withNav(<MyBento />) },
    { path: "/u/:username", element: withNav(<Public />) }, // Старый формат для обратной совместимости
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
