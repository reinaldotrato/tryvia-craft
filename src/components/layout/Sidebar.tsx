import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Bot,
  MessageSquare,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronDown,
  LogOut,
  User,
  Sparkles,
  Building2,
  Users,
  Activity,
  Shield,
  Plug,
  Crown,
  Key,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { useProfile } from "@/contexts/ProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { Permission } from "@/types/permissions";
import tryviaLogo from "@/assets/tryvia-logo.png";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  badge?: number;
  permission?: Permission;
  children?: NavItem[];
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { hasPermission, role, isSuperAdmin, tenantId } = usePermissions();
  const { fullName: profileFullName, avatarUrl } = useProfile();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [conversationCount, setConversationCount] = useState(0);
  const [agentCount, setAgentCount] = useState(0);

  // Load real counts
  useEffect(() => {
    if (tenantId) {
      loadCounts();
    }
  }, [tenantId]);

  const loadCounts = async () => {
    if (!tenantId) return;

    try {
      // Count active conversations
      const { count: convCount } = await supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "active");

      setConversationCount(convCount || 0);

      // Count agents
      const { count: agCount } = await supabase
        .from("agents")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId);

      setAgentCount(agCount || 0);
    } catch (error) {
      console.error("Error loading counts:", error);
    }
  };

  // Main navigation items (without settings submenu items)
  const mainNavItems: NavItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Bot, label: "Agentes", path: "/agents", badge: agentCount > 0 ? agentCount : undefined, permission: "agents.view" },
    { icon: MessageSquare, label: "Conversas", path: "/conversations", badge: conversationCount > 0 ? conversationCount : undefined, permission: "conversations.view" },
    { icon: Users, label: "Equipe", path: "/team", permission: "team.view" },
    { icon: Building2, label: "Clientes", path: "/tenants", permission: "settings.view" },
    { icon: BarChart3, label: "Analytics", path: "/analytics", permission: "analytics.view" },
    { icon: Plug, label: "Integrações", path: "/integrations", permission: "settings.view" },
  ];

  // Settings submenu items
  const settingsSubItems: NavItem[] = [
    { icon: Settings, label: "Geral", path: "/settings", permission: "settings.view" },
    { icon: Activity, label: "Logs", path: "/activity-logs", permission: "activity_logs.view" },
    { icon: Shield, label: "Segurança", path: "/security", permission: "security.view" },
    { icon: Key, label: "Permissões", path: "/user-permissions", permission: "team.manage" },
  ];

  // Super Admin nav item (only visible to super admins)
  const superAdminItem: NavItem = {
    icon: Crown,
    label: "Super Admin",
    path: "/super-admin",
  };

  // Filter items based on permissions
  const filteredMainItems = mainNavItems.filter(item => 
    !item.permission || hasPermission(item.permission)
  );

  const filteredSettingsItems = settingsSubItems.filter(item =>
    !item.permission || hasPermission(item.permission)
  );

  const hasSettingsAccess = filteredSettingsItems.length > 0;

  // Check if any settings path is active
  const isSettingsActive = settingsSubItems.some(item => location.pathname === item.path);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  // Use profile context for name (falls back to user metadata)
  const effectiveFullName = profileFullName || user?.user_metadata?.full_name || "Usuário";
  
  const userInitials = effectiveFullName
    ? effectiveFullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || "??";

  // Get first and second name
  const nameParts = effectiveFullName.split(" ");
  const displayName = nameParts.length >= 2 
    ? `${nameParts[0]} ${nameParts[1]}` 
    : nameParts[0];

  // Get role label
  const getRoleLabel = () => {
    if (isSuperAdmin) return "Super Admin";
    if (!role) return "";
    const roleLabels: Record<string, string> = {
      owner: "Proprietário",
      admin: "Administrador",
      member: "Membro",
      viewer: "Visualizador",
    };
    return roleLabels[role] || "";
  };

  const roleLabel = getRoleLabel();

  return (
    <motion.aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border z-50 flex flex-col",
        "transition-all duration-300"
      )}
      initial={false}
      animate={{ width: collapsed ? 80 : 260 }}
    >
      {/* Logo Section */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.img
              key="logo-full"
              src={tryviaLogo}
              alt="Tryvia"
              className="h-8 w-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="text-sidebar-foreground hover:text-foreground"
        >
          <ChevronLeft
            className={cn(
              "w-5 h-5 transition-transform duration-300",
              collapsed && "rotate-180"
            )}
          />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {/* Super Admin link - only visible to super admins */}
        {isSuperAdmin && (
          <Link
            to={superAdminItem.path}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
              "group relative mb-2",
              location.pathname === superAdminItem.path
                ? "bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-foreground"
                : "text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
            )}
          >
            {location.pathname === superAdminItem.path && (
              <motion.div
                layoutId="activeIndicator"
                className="absolute left-0 w-1 h-6 bg-gradient-to-b from-amber-500 to-orange-500 rounded-r-full"
              />
            )}
            <Crown
              className={cn(
                "w-5 h-5 shrink-0 transition-colors",
                location.pathname === superAdminItem.path ? "text-amber-500" : "group-hover:text-amber-400"
              )}
            />
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.span
                  className="text-sm font-medium whitespace-nowrap"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                >
                  {superAdminItem.label}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        )}
        
        {/* Main nav items */}
        {filteredMainItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                "group relative",
                isActive
                  ? "bg-gradient-to-r from-purple/20 to-pink/10 text-foreground"
                  : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 w-1 h-6 bg-gradient-to-b from-pink to-purple rounded-r-full"
                />
              )}
              <item.icon
                className={cn(
                  "w-5 h-5 shrink-0 transition-colors",
                  isActive ? "text-purple" : "group-hover:text-purple"
                )}
              />
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    className="text-sm font-medium whitespace-nowrap"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {item.badge !== undefined && item.badge > 0 && !collapsed && (
                <span className="ml-auto bg-purple/20 text-purple text-xs font-semibold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        {/* Settings with submenu */}
        {hasSettingsAccess && !collapsed && (
          <Collapsible open={settingsOpen || isSettingsActive} onOpenChange={setSettingsOpen}>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                  "group relative",
                  isSettingsActive
                    ? "bg-gradient-to-r from-purple/20 to-pink/10 text-foreground"
                    : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                )}
              >
                {isSettingsActive && (
                  <motion.div
                    className="absolute left-0 w-1 h-6 bg-gradient-to-b from-pink to-purple rounded-r-full"
                  />
                )}
                <Settings
                  className={cn(
                    "w-5 h-5 shrink-0 transition-colors",
                    isSettingsActive ? "text-purple" : "group-hover:text-purple"
                  )}
                />
                <span className="text-sm font-medium whitespace-nowrap flex-1 text-left">
                  Configurações
                </span>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 transition-transform",
                    (settingsOpen || isSettingsActive) && "rotate-180"
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-6 mt-1 space-y-1">
              {filteredSettingsItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
                      "group",
                      isActive
                        ? "bg-purple/10 text-foreground"
                        : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "w-4 h-4 shrink-0 transition-colors",
                        isActive ? "text-purple" : "group-hover:text-purple"
                      )}
                    />
                    <span className="text-sm whitespace-nowrap">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Collapsed settings link */}
        {hasSettingsAccess && collapsed && (
          <Link
            to="/settings"
            className={cn(
              "flex items-center justify-center px-3 py-2.5 rounded-xl transition-all duration-200",
              "group relative",
              isSettingsActive
                ? "bg-gradient-to-r from-purple/20 to-pink/10 text-foreground"
                : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
            )}
          >
            <Settings
              className={cn(
                "w-5 h-5 shrink-0 transition-colors",
                isSettingsActive ? "text-purple" : "group-hover:text-purple"
              )}
            />
          </Link>
        )}
      </nav>

      {/* Plan Badge */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            className="mx-3 mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink" />
                <span className="text-xs font-semibold uppercase tracking-wider text-pink">
                  Plano Pro
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Mensagens</span>
                  <span className="text-foreground">750/1000</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-pink to-purple rounded-full"
                    style={{ width: "75%" }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Section */}
      <div className="p-3 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded-xl",
                "hover:bg-sidebar-accent transition-colors"
              )}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple to-pink flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0 overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  userInitials
                )}
              </div>
              <AnimatePresence>
                {!collapsed && (
                  <motion.div
                    className="flex-1 text-left"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <p className="text-sm font-medium text-foreground">{displayName}</p>
                    {roleLabel && (
                      <span className={cn(
                        "text-xs font-medium",
                        isSuperAdmin ? "text-amber-500" : "text-purple"
                      )}>
                        {roleLabel}
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link to="/profile">
                <User className="w-4 h-4 mr-2" />
                Perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings">
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-error focus:text-error">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.aside>
  );
}
