import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { 
  AppRole, 
  Permission, 
  PermissionsContextType, 
  ROLE_PERMISSIONS 
} from "@/types/permissions";

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setTenantId(null);
      setLoading(false);
      return;
    }

    const fetchUserRole = async () => {
      try {
        const { data, error } = await supabase
          .from("tenant_users")
          .select("tenant_id, role")
          .eq("user_id", user.id)
          .eq("status", "active")
          .single();

        if (error) throw error;

        setTenantId(data?.tenant_id || null);
        setRole(data?.role as AppRole || null);
      } catch (error) {
        console.error("Error fetching user role:", error);
        setRole(null);
        setTenantId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!role) return false;
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
  }, [role]);

  const hasAnyPermission = useCallback((permissions: Permission[]): boolean => {
    return permissions.some(p => hasPermission(p));
  }, [hasPermission]);

  const hasAllPermissions = useCallback((permissions: Permission[]): boolean => {
    return permissions.every(p => hasPermission(p));
  }, [hasPermission]);

  // Computed convenience flags
  const isOwner = role === "owner";
  const isAdmin = role === "admin";
  const isMember = role === "member";
  const isViewer = role === "viewer";
  const canManageTeam = hasAnyPermission(["team.invite", "team.manage", "team.remove"]);
  const canManageSettings = hasPermission("settings.edit");
  const canManageAgents = hasAnyPermission(["agents.create", "agents.edit", "agents.delete"]);
  const canViewSensitiveData = hasPermission("activity_logs.view_sensitive");

  return (
    <PermissionsContext.Provider 
      value={{ 
        role, 
        tenantId,
        loading,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        isOwner,
        isAdmin,
        isMember,
        isViewer,
        canManageTeam,
        canManageSettings,
        canManageAgents,
        canViewSensitiveData,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error("usePermissions must be used within a PermissionsProvider");
  }
  return context;
}
