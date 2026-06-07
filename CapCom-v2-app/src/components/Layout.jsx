import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import AppNav from "./AppNav.jsx";
import ConnectionStatus from "./ConnectionStatus.jsx";

export default function Layout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className={isSidebarCollapsed ? "app-shell sidebar-collapsed" : "app-shell"}>
      <aside className="desktop-sidebar" aria-label="Primary navigation">
        <div className="sidebar-header">
          <Link className="brand" to="/events" title={isSidebarCollapsed ? "CapCom v2" : undefined}>
            <span className="brand-short" aria-hidden={!isSidebarCollapsed}>CC</span>
            <span className="brand-full">CapCom v2</span>
          </Link>
          <button
            className="sidebar-collapse-button"
            type="button"
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isSidebarCollapsed}
            onClick={() => setIsSidebarCollapsed((current) => !current)}
          >
            {isSidebarCollapsed ? ">" : "<"}
          </button>
        </div>
        <AppNav variant="desktop" collapsed={isSidebarCollapsed} />
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
