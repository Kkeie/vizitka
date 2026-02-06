import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";
import type { User } from "./api";

type Props = {
  user: User | null;
  onLogout: () => void;
};

const App: React.FC<Props> = ({ user, onLogout }) => {
  return (
    <div className="page-bg min-h-screen">
      <Navbar user={user} onLogout={onLogout} />
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default App;
