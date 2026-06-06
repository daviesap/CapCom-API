import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.jsx";
import useOnlineStatus from "../hooks/useOnlineStatus.js";

export default function Layout() {
  const { user, logout } = useAuth();
  const isOnline = useOnlineStatus();

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/events">
          CapCom v2
        </Link>
        <div className="user-bar">
          <span className={isOnline ? "connection-pill online" : "connection-pill offline"}>
            {isOnline ? "Online" : "Offline"}
          </span>
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
