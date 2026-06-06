import { Link, Outlet } from "react-router-dom";
import AppNav from "./AppNav.jsx";
import ConnectionStatus from "./ConnectionStatus.jsx";

export default function Layout() {
  return (
    <div className="app-shell">
      <aside className="desktop-sidebar" aria-label="Primary navigation">
        <Link className="brand" to="/events">
          CapCom v2
        </Link>
        <AppNav variant="desktop" />
        <div className="sidebar-footer">
          <ConnectionStatus />
        </div>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>

      <nav className="mobile-bottom-nav" aria-label="Primary navigation">
        <AppNav variant="mobile" />
      </nav>
    </div>
  );
}
