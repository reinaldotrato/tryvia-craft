import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { 
  AppRole, 
  Permission, 
  PermissionsContextType, 
  ROLE_PERMISSIONS 
} from "@/types/permissions";

interface ExtendedPermissionsContextType extends PermissionsContextType {
  isSuperAdmin: boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<ExtendedPermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  const fetchUserRole = useCallback(async () => {
    if (!user) {
      setRole(null);
      setTenantId(null);
      setIsSuperAdmin(false);
      setUserPermissions([]);
      setLoading(false);
      return;
    }

    try {
      // Check if user is super admin
      const { data: superAdminData } = await supabase
        .from("super_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      setIsSuperAdmin(!!superAdminData);

      // Get tenant role
      const { data, error } = await supabase
        .from("tenant_users")
        .select("tenant_id, role")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role:", error);
        setRole(null);
        setTenantId(null);
        return;
      }

      setTenantId(data?.tenant_id || null);
      setRole(data?.role as AppRole || null);

      // Fetch granular permissions for the user
      if (data?.tenant_id) {
        const { data: perms } = await supabase
          .from("user_permissions")
          .select("permission")
          .eq("user_id", user.id)
          .eq("tenant_id", data.tenant_id);

        setUserPermissions((perms || []).map((p) => p.permission));
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      setRole(null);
      setTenantId(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserRole();
  }, [fetchUserRole]);

  const hasPermission = useCallback((permission: Permission): boolean => {
    // Super admins have all permissions
    if (isSuperAdmin) return true;
    
    // Check granular permissions first
    if (userPermissions.includes(permission)) return true;

    // Check role-based permissions
    if (!role) return false;
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
  }, [role, isSuperAdmin, userPermissions]);

  const hasAnyPermission = useCallback((permissions: Permission[]): boolean => {
    return permissions.some(p => hasPermission(p));
  }, [hasPermission]);

  const hasAllPermissions = useCallback((permissions: Permission[]): boolean => {
    return permissions.every(p => hasPermission(p));
  }, [hasPermission]);

  // Computed convenience flags
  const isOwner = role === "owner";
  const isAdmin = role === "admin" || isSuperAdmin;
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
        isSuperAdmin,
        refreshPermissions: fetchUserRole,
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
