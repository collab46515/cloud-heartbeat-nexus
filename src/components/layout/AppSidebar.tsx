import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Users,
  ShieldAlert,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/claims", label: "Claims", icon: FileText, badge: "142" },
  { path: "/patients", label: "Patient Access", icon: Users, disabled: true, phase: 2 },
  { path: "/denials", label: "Denials", icon: ShieldAlert, disabled: true, phase: 3 },
  { path: "/analytics", label: "Analytics", icon: BarChart3, disabled: true, phase: 4 },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <Activity className="h-6 w-6 shrink-0 text-sidebar-primary" />
        {!collapsed && (
          <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
            RCM<span className="text-sidebar-primary">360</span>
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.path);
          const Icon = item.icon;

          if (item.disabled) {
            return (
              <div
                key={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm opacity-40 cursor-not-allowed",
                  "text-sidebar-foreground"
                )}
                title={`Phase ${item.phase} — Coming soon`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    <span className="rounded bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-medium text-sidebar-accent-foreground">
                      P{item.phase}
                    </span>
                  </>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="rounded-full bg-sidebar-primary px-1.5 py-0.5 text-[10px] font-semibold text-sidebar-primary-foreground">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex h-10 items-center justify-center border-t border-sidebar-border text-sidebar-foreground hover:text-sidebar-accent-foreground"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
}
