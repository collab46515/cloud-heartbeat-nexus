import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard, FileText, Users, ShieldAlert, BarChart3,
  ChevronLeft, ChevronRight, Activity, LogOut, Shield, Package, Zap,
  Inbox, ClipboardList, DollarSign, Handshake, Receipt, Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/claims", label: "Claims", icon: FileText },
  { path: "/patients", label: "Patient Access", icon: Users },
  { path: "/scrubbing", label: "Scrubbing", icon: Shield },
  { path: "/batches", label: "Batches", icon: Package },
  { path: "/rta", label: "Real-Time Adj.", icon: Zap },
  { path: "/denials", label: "Denials", icon: ShieldAlert },
  { path: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <aside className={cn("flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300", collapsed ? "w-16" : "w-60")}>
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <Activity className="h-6 w-6 shrink-0 text-sidebar-primary" />
        {!collapsed && <span className="text-sm font-bold tracking-tight text-sidebar-foreground">RCM<span className="text-sidebar-primary">360</span></span>}
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);
          const Icon = item.icon;

          return (
            <Link key={item.path} to={item.path} className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors", isActive ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")}>
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="flex-1">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-2">
        <button onClick={signOut} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>

      <button onClick={() => setCollapsed(!collapsed)} className="flex h-10 items-center justify-center border-t border-sidebar-border text-sidebar-foreground hover:text-sidebar-accent-foreground">
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
}
