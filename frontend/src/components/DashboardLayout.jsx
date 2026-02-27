import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import Logo from "./Logo";

const ICONS = {
  dashboard: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 12h7V3H3zM14 21h7v-9h-7zM14 10h7V3h-7zM3 21h7v-5H3z" />
    </svg>
  ),
  live: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 19h16M7 16V8m5 8V5m5 11v-6" />
    </svg>
  ),
  wallet: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 7h18v10H3z" />
      <path d="M16 12h5" />
      <circle cx="16" cy="12" r="1.5" />
    </svg>
  ),
  myAuctions: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 6h16v12H4zM8 10h8M8 14h5" />
    </svg>
  ),
  create: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z" />
      <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1 0 1.4l-1.2 1.2a1 1 0 0 1-1.4 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1 1 0 0 1-1 1h-1.6a1 1 0 0 1-1-1v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1 1 0 0 1-1.4 0l-1.2-1.2a1 1 0 0 1 0-1.4l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a1 1 0 0 1-1-1v-1.6a1 1 0 0 1 1-1h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1 1 0 0 1 0-1.4L6 4.5a1 1 0 0 1 1.4 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a1 1 0 0 1 1-1h1.6a1 1 0 0 1 1 1v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1 1 0 0 1 1.4 0l1.2 1.2a1 1 0 0 1 0 1.4l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1h-.2a1 1 0 0 0-.9.6z" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </svg>
  )
};

export default function DashboardLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const readStoredUser = () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return {
        role: user?.role || localStorage.getItem("role") || "",
        customerId: user?.customerId || localStorage.getItem("customerId") || "BG------"
      };
    } catch {
      return {
        role: localStorage.getItem("role") || "",
        customerId: localStorage.getItem("customerId") || "BG------"
      };
    }
  };

  const storedUser = readStoredUser();
  const [role] = useState(storedUser.role);
  const [customerId] = useState(storedUser.customerId);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = useMemo(
    () => (role === "seller"
      ? [
          { key: "dashboard", label: "Dashboard", path: "/seller/dashboard" },
          { key: "myAuctions", label: "My Auctions", path: "/my-auctions" },
          { key: "create", label: "Create Auction", path: "/create" },
          { key: "wallet", label: "Wallet", path: "/wallet" },
          { key: "settings", label: "Settings", path: "/settings" }
        ]
      : [
          { key: "dashboard", label: "Dashboard", path: "/dashboard" },
          { key: "live", label: "Live Auctions", path: "/live" },
          { key: "wallet", label: "Wallet", path: "/wallet" },
          { key: "settings", label: "Settings", path: "/settings" }
        ]),
    [role]
  );

  const isActive = (path) => {
    if (path === "/live" && location.pathname.startsWith("/auction/")) return true;
    return location.pathname === path;
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="ai-page-bg min-h-screen bg-[#0F172A] text-slate-100">
      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-[#111827]/85 px-4 backdrop-blur-xl lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-lg border border-white/10 bg-white/5 p-2 transition-all duration-300 hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <Logo compact />
        <div className="rounded-lg border border-white/10 bg-[#0F172A] px-3 py-1.5 text-xs">{customerId}</div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 bg-black/60 transition-all duration-300 lg:hidden" onClick={() => setMobileOpen(false)} />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 hidden border-r border-white/10 bg-[#111827]/92 backdrop-blur-xl transition-all duration-300 lg:block ${
          collapsed ? "w-[72px]" : "w-[240px]"
        }`}
      >
        <SidebarContent
          collapsed={collapsed}
          items={items}
          customerId={customerId}
          isActive={isActive}
          onNavigate={navigate}
          onLogout={handleLogout}
          onToggle={() => setCollapsed((prev) => !prev)}
        />
      </aside>

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[240px] border-r border-white/10 bg-[#111827]/96 backdrop-blur-xl transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent
          collapsed={false}
          items={items}
          customerId={customerId}
          isActive={isActive}
          onNavigate={(path) => {
            navigate(path);
            setMobileOpen(false);
          }}
          onLogout={handleLogout}
          onToggle={() => setMobileOpen(false)}
          mobile
        />
      </aside>

      <main className={`px-4 pb-10 pt-24 transition-all duration-300 lg:px-6 lg:pt-8 ${collapsed ? "lg:ml-[72px]" : "lg:ml-[240px]"}`}>
        {children || <Outlet />}
      </main>
    </div>
  );
}

function SidebarContent({ collapsed, items, customerId, isActive, onNavigate, onLogout, onToggle, mobile = false }) {
  return (
    <div className="flex h-full flex-col">
      <div className={`border-b border-white/10 px-4 py-4 ${collapsed ? "grid place-items-center" : ""}`}>
        <Logo compact={collapsed} />
        {!collapsed ? (
          <p className="mt-2 w-fit rounded-lg border border-white/10 bg-[#0F172A] px-2 py-1 text-xs">{customerId}</p>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 px-2 py-3">
        {items.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => onNavigate(item.path)}
              title={collapsed ? item.label : ""}
              className={`group flex w-full items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm transition-all duration-300 ${
                active
                  ? "border-l-[#7C3AED] bg-[#7C3AED]/20 text-white shadow-[0_0_20px_rgba(124,58,237,0.25)]"
                  : "border-l-transparent text-slate-300 hover:bg-white/5 hover:text-white"
              } ${collapsed ? "justify-center px-2" : ""}`}
            >
              <span className="shrink-0">{ICONS[item.key]}</span>
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </button>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-white/10 p-2">
        <button
          onClick={onLogout}
          title={collapsed ? "Logout" : ""}
          className={`flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#7C3AED] via-[#4F46E5] to-[#EC4899] px-3 py-2 text-sm transition-all duration-300 hover:opacity-95 ${
            collapsed ? "px-2" : ""
          }`}
        >
          {collapsed ? ICONS.logout : "Logout"}
        </button>
        <button
          onClick={onToggle}
          className={`flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition-all duration-300 hover:bg-white/10 ${
            mobile ? "hidden" : ""
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          {!collapsed ? <span>Collapse</span> : null}
        </button>
      </div>
    </div>
  );
}
