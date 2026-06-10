import { useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.jsx";
import AppNav from "./AppNav.jsx";
import Footer from "./Footer.jsx";
import { CapcomIcon } from "../icons/capcomIcons.jsx";

function getPageTitle(pathname) {
  if (pathname === "/companies") return "Companies";
  if (pathname === "/admin") return "Admin";
  if (pathname === "/profile") return "Profile";
  if (pathname.includes("/days/") && pathname.endsWith("/details")) return "Schedule Details";
  if (pathname.endsWith("/days")) return "Schedule Days";
  if (pathname.startsWith("/events/")) return "Event";
  return "Events";
}

export default function Layout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarBrandName, setSidebarBrandName] = useState(null);
  const [topbarConfig, setTopbarConfig] = useState(null);
  const { userProfile, activeClient, isSuperAdmin } = useAuth();
  const { pathname } = useLocation();
  const pageTitle = getPageTitle(pathname);
  const outletContext = useMemo(() => ({ setSidebarBrandName, setTopbarConfig }), []);
  const visibleSidebarBrandName = sidebarBrandName
    || (isSuperAdmin ? "Flair Ltd" : activeClient?.clientName || userProfile?.clientName || "Flair Ltd");
  const topbarClassName = [
    "app-topbar",
    topbarConfig?.variant ? `app-topbar-${topbarConfig.variant}` : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={isSidebarCollapsed ? "app-shell sidebar-collapsed" : "app-shell"}>
      <aside className="desktop-sidebar" aria-label="Primary navigation">
        <div className="sidebar-header">
          <Link className="brand client-brand" to="/events" title={visibleSidebarBrandName}>
            <span className="brand-client-name">{visibleSidebarBrandName}</span>
          </Link>
          <button
            className="sidebar-collapse-button"
            type="button"
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isSidebarCollapsed}
            onClick={() => setIsSidebarCollapsed((current) => !current)}
          >
            <CapcomIcon
              name={isSidebarCollapsed ? "caretDoubleRight" : "caretDoubleLeft"}
              size={16}
              weight="bold"
            />
          </button>
        </div>
        <AppNav variant="desktop" collapsed={isSidebarCollapsed} />
        <Footer />
      </aside>

      <header className={topbarClassName}>
        {topbarConfig?.content || <h1 className="app-topbar-title">{pageTitle}</h1>}
      </header>

      <main className="app-main">
        <Outlet context={outletContext} />
      </main>

      <nav className="mobile-bottom-nav" aria-label="Primary navigation">
        <AppNav variant="mobile" />
      </nav>
    </div>
  );
}
