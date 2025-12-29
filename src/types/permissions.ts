// Tipos para o sistema de permissões granulares

export type AppRole = "owner" | "admin" | "member" | "viewer";

// Definição de todas as permissões do sistema
export type Permission = 
  // Agentes
  | "agents.view"
  | "agents.create"
  | "agents.edit"
  | "agents.delete"
  // Conversas
  | "conversations.view"
  | "conversations.manage"
  | "conversations.view_phone"
  // Analytics
  | "analytics.view"
  | "analytics.export"
  // Team
  | "team.view"
  | "team.invite"
  | "team.manage"
  | "team.remove"
  // Settings
  | "settings.view"
  | "settings.edit"
  | "settings.billing"
  // API Keys
  | "api_keys.view"
  | "api_keys.create"
  | "api_keys.delete"
  // Activity Logs
  | "activity_logs.view"
  | "activity_logs.view_sensitive"
  // Security
  | "security.view"
  | "security.manage"
  // Notifications
  | "notifications.view"
  | "notifications.manage";

// Mapeamento de roles para permissões
export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  owner: [
    // Acesso total
    "agents.view", "agents.create", "agents.edit", "agents.delete",
    "conversations.view", "conversations.manage", "conversations.view_phone",
    "analytics.view", "analytics.export",
    "team.view", "team.invite", "team.manage", "team.remove",
    "settings.view", "settings.edit", "settings.billing",
    "api_keys.view", "api_keys.create", "api_keys.delete",
    "activity_logs.view", "activity_logs.view_sensitive",
    "security.view", "security.manage",
    "notifications.view", "notifications.manage",
  ],
  admin: [
    // Quase tudo, exceto billing e algumas configurações sensíveis
    "agents.view", "agents.create", "agents.edit", "agents.delete",
    "conversations.view", "conversations.manage", "conversations.view_phone",
    "analytics.view", "analytics.export",
    "team.view", "team.invite", "team.manage",
    "settings.view", "settings.edit",
    "api_keys.view", "api_keys.create", "api_keys.delete",
    "activity_logs.view", "activity_logs.view_sensitive",
    "security.view", "security.manage",
    "notifications.view", "notifications.manage",
  ],
  member: [
    // Operações do dia-a-dia
    "agents.view", "agents.create", "agents.edit",
    "conversations.view", "conversations.manage",
    "analytics.view",
    "team.view",
    "settings.view",
    "activity_logs.view",
    "notifications.view",
  ],
  viewer: [
    // Apenas visualização
    "agents.view",
    "conversations.view",
    "analytics.view",
    "team.view",
    "notifications.view",
  ],
};

// Interface para o contexto de permissões
export interface PermissionsContextType {
  role: AppRole | null;
  tenantId: string | null;
  loading: boolean;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isMember: boolean;
  isViewer: boolean;
  canManageTeam: boolean;
  canManageSettings: boolean;
  canManageAgents: boolean;
  canViewSensitiveData: boolean;
}
