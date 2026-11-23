import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { CalendarDays, ClipboardList, History, LayoutDashboard, ListChecks, LogOut, Menu, PlusCircle, Recycle, UserCog, UserRound, Users, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../utils/constants";

const NAV = {
  resident: [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/requests/new", label: "New request", icon: PlusCircle },
    { to: "/requests", label: "My requests", icon: ClipboardList, end: true },
    { to: "/history", label: "History", icon: History },
    { to: "/profile", label: "Profile", icon: UserRound },
  ],
  staff: [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/requests", label: "Requests", icon: ClipboardList },
    { to: "/schedule", label: "Schedule", icon: CalendarDays },
    { to: "/tasks", label: "Tasks", icon: ListChecks },
    { to: "/history", label: "History", icon: History },
    { to: "/profile", label: "Profile", icon: UserRound },
  ],
};

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);

  const items = [...(user.role === "resident" ? NAV.resident : NAV.staff)];
  if (user.role === "admin") items.splice(items.length - 1, 0, { to: "/admin/users", label: "Users", icon: Users });

  return (
    <div className="shell">
      <header className="topbar">
        <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu size={22} aria-hidden="true" />
        </button>
        <span className="brand">
          <Recycle size={20} aria-hidden="true" /> Waste Collection
        </span>
      </header>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? "is-open" : ""}`} aria-label="Main navigation">
        <div className="sidebar-head">
          <span className="brand">
            <Recycle size={22} aria-hidden="true" /> Waste Collection
          </span>
          <button className="icon-btn sidebar-close" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <nav>
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end ?? to === "/dashboard"} className="nav-link">
              <Icon size={18} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <span className="avatar" aria-hidden="true">
            {user.full_name.charAt(0).toUpperCase()}
          </span>
          <div>
            <strong>{user.full_name}</strong>
            <small>{ROLES[user.role]}</small>
          </div>
          <button className="icon-btn" onClick={signOut} aria-label="Sign out">
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </aside>
      <main className="content" key={pathname}>
        <Outlet />
      </main>
    </div>
  );
}
