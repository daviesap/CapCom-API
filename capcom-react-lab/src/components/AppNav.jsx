import { NavLink } from "react-router-dom";
import { CapcomIcon } from "../icons/capcomIcons.jsx";

const navItems = [
  { to: "/events", label: "Events", icon: "event" },
  { to: "/admin", label: "Admin", icon: "admin" },
  { to: "/profile", label: "Profile", icon: "profile" },
];

export default function AppNav({ variant }) {
  return (
    <div className={`app-nav app-nav-${variant}`}>
      {navItems.map((item) => (
        <NavLink
          className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
          key={item.to}
          to={item.to}
        >
          <CapcomIcon name={item.icon} size={22} weight="duotone" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </div>
  );
}
