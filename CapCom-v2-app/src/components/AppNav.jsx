import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.jsx";
import { CapcomIcon } from "../icons/capcomIcons.jsx";

const navItems = [
  { to: "/events", label: "Events", icon: "event" },
  { to: "/companies", label: "Companies", icon: "company" },
  { to: "/admin", label: "Admin", icon: "admin", requiresAdmin: true },
  { to: "/profile", label: "Profile", icon: "profile" },
];

export default function AppNav({ variant, collapsed = false }) {
  const { isSuperAdmin, isAdmin, user, userProfile } = useAuth();
  const canAccessAdmin = isSuperAdmin || isAdmin;
  const visibleNavItems = navItems.filter((item) => !item.requiresAdmin || canAccessAdmin);
  const loggedInName = userProfile?.displayName || user?.displayName || userProfile?.email || user?.email || "";

  return (
    <div
      className={`app-nav app-nav-${variant}`}
      style={{ "--nav-item-count": visibleNavItems.length }}
    >
      {visibleNavItems.map((item) => (
        <NavLink
          className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
          key={item.to}
          to={item.to}
          title={collapsed ? item.label : undefined}
        >
          <CapcomIcon name={item.icon} size={22} weight="duotone" />
          <span>{item.label}</span>
        </NavLink>
      ))}
      {variant === "desktop" && loggedInName ? (
        <p className="sidebar-login-meta">Logged in as {loggedInName}</p>
      ) : null}
    </div>
  );
}
