import { ReactNode } from "react";
import { usePermissions } from "@/contexts/PermissionsContext";
import { Permission } from "@/types/permissions";
import { ShieldX } from "lucide-react";

interface PermissionGateProps {
  children: ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  fallback?: ReactNode;
  showDenied?: boolean;
}

/**
 * Componente para controle de acesso baseado em permissões.
 * 
 * @param permission - Permissão única necessária
 * @param permissions - Array de permissões (use com requireAll)
 * @param requireAll - Se true, requer todas as permissões. Se false (padrão), requer qualquer uma
 * @param fallback - Componente a ser renderizado quando não tem permissão
 * @param showDenied - Se true, mostra mensagem de acesso negado ao invés de ocultar
 */
export function PermissionGate({ 
  children, 
  permission,
  permissions = [],
  requireAll = false,
  fallback = null,
  showDenied = false,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions();

  if (loading) {
    return null;
  }

  const allPermissions = permission ? [permission, ...permissions] : permissions;
  
  const hasAccess = requireAll 
    ? hasAllPermissions(allPermissions)
    : allPermissions.length > 0 
      ? hasAnyPermission(allPermissions)
      : true;

  if (!hasAccess) {
    if (showDenied) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <ShieldX className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Acesso Restrito
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Você não tem permissão para acessar este recurso. 
            Entre em contato com um administrador se precisar de acesso.
          </p>
        </div>
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Hook para verificar permissão e retornar boolean
 */
export function useHasPermission(permission: Permission): boolean {
  const { hasPermission, loading } = usePermissions();
  if (loading) return false;
  return hasPermission(permission);
}
