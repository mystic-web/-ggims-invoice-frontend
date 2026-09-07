import { useState, useEffect, useCallback } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

const API = import.meta.env.VITE_API_URL || "/api";

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("ggims_token"));
  const [user,  setUser]  = useState(() => {
    try { return JSON.parse(localStorage.getItem("ggims_user")); } catch { return null; }
  });

  const login = (token, user) => {
    localStorage.setItem("ggims_token", token);
    localStorage.setItem("ggims_user", JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const logout = async () => {
    try {
      await fetch(`${API}/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch {}
    localStorage.removeItem("ggims_token");
    localStorage.removeItem("ggims_user");
    setToken(null);
    setUser(null);
  };

  if (!token) return <Login onLogin={login} api={API} />;
  return <Dashboard token={token} user={user} onLogout={logout} api={API} />;
}
