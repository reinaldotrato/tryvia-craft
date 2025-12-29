import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Mail,
  Shield,
  Trash2,
  Loader2,
  UserPlus,
  Crown,
  ShieldCheck,
  UserCheck,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface TeamMember {
  id: string;
  user_id: string;
  tenant_id: string;
  role: AppRole;
  status: string;
  invited_at: string | null;
  accepted_at: string | null;
  created_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  email?: string;
}

const roleIcons: Record<AppRole, React.ElementType> = {
  owner: Crown,
  admin: ShieldCheck,
  member: UserCheck,
  viewer: Eye,
};

const roleLabels: Record<AppRole, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Membro",
  viewer: "Visualizador",
};

const roleColors: Record<AppRole, string> = {
  owner: "bg-pink/20 text-pink",
  admin: "bg-purple/20 text-purple",
  member: "bg-cyan/20 text-cyan",
  viewer: "bg-muted text-muted-foreground",
};

const statusColors: Record<string, string> = {
  active: "bg-success/20 text-success",
  pending: "bg-warning/20 text-warning",
  inactive: "bg-muted text-muted-foreground",
};

export default function Team() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<AppRole | null>(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("member");

  // Role change state
  const [newRole, setNewRole] = useState<AppRole>("member");

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    setLoading(true);
    try {
      // Get current user's tenant and role
      const { data: tenantUser, error: tenantError } = await supabase
        .from("tenant_users")
        .select("tenant_id, role")
        .eq("user_id", user?.id)
        .eq("status", "active")
        .single();

      if (tenantError) throw tenantError;
      
      setCurrentUserRole(tenantUser.role);

      // Get all members of the tenant
      const { data: membersData, error: membersError } = await supabase
        .from("tenant_users")
        .select("*")
        .eq("tenant_id", tenantUser.tenant_id)
        .order("created_at", { ascending: true });

      if (membersError) throw membersError;

      // Get profiles for all members
      const userIds = membersData.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      // Merge profiles with members
      const membersWithProfiles = membersData.map((member) => ({
        ...member,
        profile: profiles?.find((p) => p.id === member.user_id) || null,
      }));

      setMembers(membersWithProfiles);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao carregar equipe.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const canManageMembers = currentUserRole === "owner" || currentUserRole === "admin";

  const handleInvite = async () => {
    if (!inviteEmail) {
      toast({
        title: "Erro",
        description: "Por favor, insira um email.",
        variant: "destructive",
      });
      return;
    }

    setFormLoading(true);

    try {
      // For now, show a message that invites need backend implementation
      // In a real implementation, you'd call an edge function to send invite emails
      toast({
        title: "Funcionalidade em desenvolvimento",
        description: "O sistema de convites requer configuração de email. Por enquanto, adicione usuários diretamente após eles se cadastrarem.",
      });

      setIsInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("member");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar convite.",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleRoleChange = async () => {
    if (!selectedMember) return;

    // Prevent changing owner role
    if (selectedMember.role === "owner") {
      toast({
        title: "Erro",
        description: "Não é possível alterar o role do proprietário.",
        variant: "destructive",
      });
      return;
    }

    setFormLoading(true);

    try {
      const { error } = await supabase
        .from("tenant_users")
        .update({ role: newRole })
        .eq("id", selectedMember.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Permissão atualizada com sucesso!",
      });

      setIsRoleDialogOpen(false);
      loadTeamMembers();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar permissão.",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!selectedMember) return;

    // Prevent removing owner
    if (selectedMember.role === "owner") {
      toast({
        title: "Erro",
        description: "Não é possível remover o proprietário.",
        variant: "destructive",
      });
      return;
    }

    // Prevent self-removal
    if (selectedMember.user_id === user?.id) {
      toast({
        title: "Erro",
        description: "Você não pode remover a si mesmo.",
        variant: "destructive",
      });
      return;
    }

    setFormLoading(true);

    try {
      const { error } = await supabase
        .from("tenant_users")
        .delete()
        .eq("id", selectedMember.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Membro removido com sucesso!",
      });

      setIsRemoveDialogOpen(false);
      loadTeamMembers();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao remover membro.",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const openRoleDialog = (member: TeamMember) => {
    setSelectedMember(member);
    setNewRole(member.role);
    setIsRoleDialogOpen(true);
  };

  const openRemoveDialog = (member: TeamMember) => {
    setSelectedMember(member);
    setIsRemoveDialogOpen(true);
  };

  const filteredMembers = members.filter(
    (member) =>
      member.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">Equipe</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os membros da sua equipe
          </p>
        </div>
        {canManageMembers && (
          <Button
            onClick={() => setIsInviteDialogOpen(true)}
            className="bg-gradient-to-r from-purple to-pink hover:opacity-90"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Convidar Membro
          </Button>
        )}
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="relative max-w-md"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar membros..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-background/50"
        />
      </motion.div>

      {/* Team Members List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple" />
        </div>
      ) : filteredMembers.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-12 text-center"
        >
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum membro encontrado</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? "Tente uma busca diferente" : "Comece convidando membros para sua equipe"}
          </p>
          {!searchQuery && canManageMembers && (
            <Button onClick={() => setIsInviteDialogOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Convidar Membro
            </Button>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="glass-card divide-y divide-border"
        >
          {filteredMembers.map((member, index) => {
            const RoleIcon = roleIcons[member.role];
            const isCurrentUser = member.user_id === user?.id;
            const isOwner = member.role === "owner";

            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * index }}
                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple to-pink flex items-center justify-center text-primary-foreground font-bold text-lg">
                    {member.profile?.full_name?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">
                        {member.profile?.full_name || "Usuário"}
                      </p>
                      {isCurrentUser && (
                        <Badge variant="outline" className="text-xs">
                          Você
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {member.user_id.slice(0, 8)}...
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Badge className={cn("font-medium", roleColors[member.role])}>
                      <RoleIcon className="w-3.5 h-3.5 mr-1" />
                      {roleLabels[member.role]}
                    </Badge>
                    <Badge className={cn("font-medium", statusColors[member.status || "active"])}>
                      {member.status === "active" ? "Ativo" : member.status === "pending" ? "Pendente" : "Inativo"}
                    </Badge>
                  </div>

                  {canManageMembers && !isOwner && !isCurrentUser && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openRoleDialog(member)}>
                          <Shield className="w-4 h-4 mr-2" />
                          Alterar Permissão
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => openRemoveDialog(member)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Invite Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar Membro</DialogTitle>
            <DialogDescription>
              Envie um convite por email para adicionar um novo membro à equipe
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Permissão</Label>
              <Select
                value={inviteRole}
                onValueChange={(value) => setInviteRole(value as AppRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      Administrador
                    </div>
                  </SelectItem>
                  <SelectItem value="member">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4" />
                      Membro
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Visualizador
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsInviteDialogOpen(false)}
              disabled={formLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleInvite}
              disabled={formLoading}
              className="bg-gradient-to-r from-purple to-pink hover:opacity-90"
            >
              {formLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Enviar Convite"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Change Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Permissão</DialogTitle>
            <DialogDescription>
              Altere a permissão de {selectedMember?.profile?.full_name || "este membro"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nova Permissão</Label>
              <Select
                value={newRole}
                onValueChange={(value) => setNewRole(value as AppRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      Administrador
                    </div>
                  </SelectItem>
                  <SelectItem value="member">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4" />
                      Membro
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Visualizador
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRoleDialogOpen(false)}
              disabled={formLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRoleChange}
              disabled={formLoading}
              className="bg-gradient-to-r from-purple to-pink hover:opacity-90"
            >
              {formLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <AlertDialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Membro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover{" "}
              <strong>{selectedMember?.profile?.full_name || "este membro"}</strong> da equipe?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={formLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={formLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {formLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Remover"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
