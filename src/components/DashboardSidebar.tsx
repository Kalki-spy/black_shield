import { LayoutDashboard, Search, Bell, Radio, FlaskConical, Monitor, Bot, User, Settings, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useTeamMode, TeamMode } from "@/contexts/TeamModeContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { Swords, ShieldCheck, Compass } from "lucide-react";

const menuItems = [
  { title: "Dashboard",    url: "/dashboard",              icon: LayoutDashboard },
  { title: "Profile",      url: "/dashboard/profile",      icon: User },
  { title: "Tools",        url: "/dashboard/tools",        icon: Search },
  { title: "CTFs",         url: "/dashboard/ctf",          icon: Bell },
  { title: "Scenarios",    url: "/dashboard/scenarios",    icon: Radio },
  { title: "AI Assistant", url: "/dashboard/ai-assistant", icon: Bot },
  { title: "Settings",     url: "/dashboard/settings",     icon: Settings },
];

const modeConfig: Record<TeamMode, { label: string; icon: typeof Swords; color: string; activeClass: string }> = {
  red:      { label: "Red",      icon: Swords,      color: "text-red-500",     activeClass: "bg-red-500/20 text-red-400 border-red-500/50" },
  blue:     { label: "Blue",     icon: ShieldCheck, color: "text-blue-500",    activeClass: "bg-blue-500/20 text-blue-400 border-blue-500/50" },
  explorer: { label: "Explorer", icon: Compass,     color: "text-emerald-400", activeClass: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50" },
};

export function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { mode, setMode } = useTeamMode();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="pt-4">
        {/* Mode Switcher */}
        {!collapsed && (
          <SidebarGroup>
            <SidebarGroupLabel className="font-mono text-[10px] text-muted-foreground tracking-[0.2em] uppercase">
              Active Mode
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="flex gap-1 px-2 pt-1 pb-3">
                {(Object.keys(modeConfig) as TeamMode[]).map((key) => {
                  const cfg = modeConfig[key];
                  const active = mode === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setMode(key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono border transition-all ${
                        active ? cfg.activeClass : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <cfg.icon className="h-3.5 w-3.5" />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="hover:bg-muted/50 text-muted-foreground"
                      activeClassName={`${modeConfig[mode].activeClass} font-medium`}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span className="font-mono text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout */}
        <div className="mt-auto px-3 pb-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-mono text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/30 transition-all"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && "Logout"}
          </button>
          {!collapsed && (
            <p className="text-[10px] font-mono text-muted-foreground tracking-wider mt-3 px-1">SANDBOXED ENV · v1.0</p>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
