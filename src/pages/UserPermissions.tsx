import { useState, useEffect, forwardRef } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Search,
  Loader2,
  Save,
  User,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/contexts/PermissionsContext";
import { supabase } from "@/integrations/supabase/client";
import { Permission, ROLE_PERMISSIONS, AppRole } from "@/types/permissions";
import { cn } from "@/lib/utils";

interface UserWithPermissions {
  id: string;
  user_id: string;
  role: AppRole;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  customPermissions: string[];
}

const ALL_PERMISSIONS: { category: string; permissions: { key: Permission; label: string }[] }[] = [
  {
    category: "Agentes",
    permissions: [
      { key: "agents.view", label: "Visualizar agentes" },
      { key: "agents.create", label: "Criar agentes" },
      { key: "agents.edit", label: "Editar agentes" },
      { key: "agents.delete", label: "Excluir agentes" },
    ],
  },
  {
    category: "Conversas",
    permissions: [
      { key: "conversations.view", label: "Visualizar conversas" },
      { key: "conversations.manage", label: "Gerenciar conversas" },
      { key: "conversations.view_phone", label: "Ver telefone completo" },
    ],
  },
  {
    category: "Analytics",
    permissions: [
      { key: "analytics.view", label: "Visualizar analytics" },
      { key: "analytics.export", label: "Exportar dados" },
    ],
  },
  {
    category: "Equipe",
    permissions: [
      { key: "team.view", label: "Visualizar equipe" },
      { key: "team.invite", label: "Convidar membros" },
      { key: "team.manage", label: "Gerenciar membros" },
      { key: "team.remove", label: "Remover membros" },
    ],
  },
  {
    category: "Configurações",
    permissions: [
      { key: "settings.view", label: "Visualizar configurações" },
      { key: "settings.edit", label: "Editar configurações" },
      { key: "settings.billing", label: "Gerenciar faturamento" },
    ],
  },
  {
    category: "API Keys",
    permissions: [
      { key: "api_keys.view", label: "Visualizar API keys" },
      { key: "api_keys.create", label: "Criar API keys" },
      { key: "api_keys.delete", label: "Revogar API keys" },
    ],
  },
  {
    category: "Logs",
    permissions: [
      { key: "activity_logs.view", label: "Visualizar logs" },
      { key: "activity_logs.view_sensitive", label: "Ver dados sensíveis" },
    ],
  },
  {
    category: "Segurança",
    permissions: [
      { key: "security.view", label: "Visualizar segurança" },
      { key: "security.manage", label: "Gerenciar segurança" },
    ],
  },
  {
    category: "Notificações",
    permissions: [
      { key: "notifications.view", label: "Ver notificações" },
      { key: "notifications.manage", label: "Gerenciar notificações" },
    ],
  },
];

const roleLabels: Record<AppRole, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Membro",
  viewer: "Visualizador",
};

const UserPermissions = forwardRef<HTMLDivElement>((_, ref) => {
  const { toast } = useToast();
  const { tenantId, isOwner, isAdmin } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (tenantId) {
      loadUsers();
    }
  }, [tenantId]);

  const loadUsers = async () => {
    if (!tenantId) return;
    setLoading(true);

    try {
      // Get all tenant users
      const { data: usersData, error: usersError } = await supabase
        .from("tenant_users")
        .select("id, user_id, role")
        .eq("tenant_id", tenantId)
        .eq("status", "active");

      if (usersError) throw usersError;

      // Get profiles
      const userIds = usersData?.map((u) => u.user_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      // Get custom permissions
      const { data: permsData } = await supabase
        .from("user_permissions")
        .select("user_id, permission")
        .eq("tenant_id", tenantId);

      const permsByUser: Record<string, string[]> = {};
      permsData?.forEach((p) => {
        if (!permsByUser[p.user_id]) permsByUser[p.user_id] = [];
        permsByUser[p.user_id].push(p.permission);
      });

      const usersWithProfiles = (usersData || []).map((user) => ({
        ...user,
        profile: profiles?.find((p) => p.id === user.user_id),
        customPermissions: permsByUser[user.user_id] || [],
      }));

      setUsers(usersWithProfiles);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao carregar usuários.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openPermissionsDialog = (user: UserWithPermissions) => {
    setSelectedUser(user);
    // Start with custom permissions
    setSelectedPermissions(new Set(user.customPermissions));
    setIsDialogOpen(true);
  };

  const togglePermission = (permission: string) => {
    const newSet = new Set(selectedPermissions);
    if (newSet.has(permission)) {
      newSet.delete(permission);
    } else {
      newSet.add(permission);
    }
    setSelectedPermissions(newSet);
  };

  const savePermissions = async () => {
    if (!selectedUser || !tenantId) return;
    setSaving(true);

    try {
      // Delete existing custom permissions
      await supabase
        .from("user_permissions")
        .delete()
        .eq("user_id", selectedUser.user_id)
        .eq("tenant_id", tenantId);

      // Insert new permissions
      if (selectedPermissions.size > 0) {
        const permissionsToInsert = Array.from(selectedPermissions).map((p) => ({
          user_id: selectedUser.user_id,
          tenant_id: tenantId,
          permission: p,
        }));

        const { error } = await supabase
          .from("user_permissions")
          .insert(permissionsToInsert);

        if (error) throw error;
      }

      toast({
        title: "Sucesso",
        description: "Permissões atualizadas com sucesso!",
      });

      setIsDialogOpen(false);
      loadUsers();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar permissões.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getRolePermissions = (role: AppRole): Permission[] => {
    return ROLE_PERMISSIONS[role] || [];
  };

  const hasRolePermission = (role: AppRole, permission: Permission): boolean => {
    return getRolePermissions(role).includes(permission);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.user_id.includes(searchQuery)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple to-cyan flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Permissões de Usuários</h1>
            <p className="text-muted-foreground">
              Gerencie permissões granulares para cada usuário
            </p>
          </div>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative max-w-md"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar usuários..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-background/50"
        />
      </motion.div>

      {/* Users Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      >
        {filteredUsers.map((user) => {
          const rolePerms = getRolePermissions(user.role);
          const totalPerms = rolePerms.length + user.customPermissions.length;

          return (
            <GlassCard key={user.id} className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple to-pink flex items-center justify-center text-primary-foreground font-bold">
                  {user.profile?.full_name?.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {user.profile?.full_name || "Usuário"}
                  </p>
                  <Badge className={cn(
                    "mt-1",
                    user.role === "owner"
                      ? "bg-pink/20 text-pink"
                      : user.role === "admin"
                      ? "bg-purple/20 text-purple"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {roleLabels[user.role]}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">
                    {totalPerms} permissões
                    {user.customPermissions.length > 0 && (
                      <span className="text-cyan"> (+{user.customPermissions.length} customizadas)</span>
                    )}
                  </p>
                </div>
              </div>
              {(isOwner || isAdmin) && user.role !== "owner" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4"
                  onClick={() => openPermissionsDialog(user)}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Gerenciar Permissões
                </Button>
              )}
            </GlassCard>
          );
        })}
      </motion.div>

      {/* Permissions Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Permissões de {selectedUser?.profile?.full_name || "Usuário"}
            </DialogTitle>
            <DialogDescription>
              Permissões do role <strong>{selectedUser && roleLabels[selectedUser.role]}</strong> estão marcadas em roxo.
              Adicione permissões extras marcando as caixas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {ALL_PERMISSIONS.map((category) => (
              <div key={category.category}>
                <h4 className="text-sm font-semibold text-foreground mb-3">
                  {category.category}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {category.permissions.map((perm) => {
                    const hasFromRole = selectedUser
                      ? hasRolePermission(selectedUser.role, perm.key)
                      : false;
                    const hasCustom = selectedPermissions.has(perm.key);
                    const isEnabled = hasFromRole || hasCustom;

                    return (
                      <div
                        key={perm.key}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg border transition-colors",
                          hasFromRole
                            ? "border-purple/30 bg-purple/5"
                            : hasCustom
                            ? "border-cyan/30 bg-cyan/5"
                            : "border-border"
                        )}
                      >
                        <Checkbox
                          id={perm.key}
                          checked={isEnabled}
                          disabled={hasFromRole}
                          onCheckedChange={() => !hasFromRole && togglePermission(perm.key)}
                        />
                        <label
                          htmlFor={perm.key}
                          className={cn(
                            "text-sm cursor-pointer flex-1",
                            hasFromRole ? "text-purple" : "text-foreground"
                          )}
                        >
                          {perm.label}
                        </label>
                        {hasFromRole && (
                          <Badge variant="outline" className="text-xs text-purple border-purple/30">
                            Role
                          </Badge>
                        )}
                        {hasCustom && !hasFromRole && (
                          <Badge variant="outline" className="text-xs text-cyan border-cyan/30">
                            Custom
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={savePermissions} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Permissões
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default UserPermissions;
