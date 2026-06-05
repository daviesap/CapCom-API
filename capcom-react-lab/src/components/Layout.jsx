import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.jsx";

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/events">
          CapCom v2
        </Link>
        <div className="user-bar">
          <span>{user?.email}</span>
          <button className="button secondary" type="button" onClick={logout}>
            Sign Out
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
