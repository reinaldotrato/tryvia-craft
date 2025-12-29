import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Building2, 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2,
  Users,
  Bot,
  MessageSquare,
  Loader2,
  Crown,
  Mail,
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
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/contexts/PermissionsContext";
import { cn } from "@/lib/utils";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  max_agents: number;
  max_messages_month: number;
  logo_url: string | null;
  created_at: string;
  _count?: {
    users: number;
    agents: number;
    conversations: number;
  };
}

const planColors: Record<string, string> = {
  starter: "bg-muted text-muted-foreground",
  pro: "bg-purple/20 text-purple",
  enterprise: "bg-pink/20 text-pink",
};

const statusColors: Record<string, string> = {
  active: "bg-success/20 text-success",
  inactive: "bg-muted text-muted-foreground",
  suspended: "bg-destructive/20 text-destructive",
};

export default function Tenants() {
  const { toast } = useToast();
  const { isSuperAdmin } = usePermissions();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    plan: "starter",
    status: "active",
    max_agents: 3,
    max_messages_month: 1000,
    ownerEmail: "",
  });

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    setLoading(true);
    try {
      // Super admins can see all tenants, regular users see their own
      const { data, error } = await supabase
        .from("tenants_secure")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get counts for each tenant
      const tenantsWithCounts = await Promise.all(
        (data || []).map(async (tenant) => {
          const [usersRes, agentsRes, conversationsRes] = await Promise.all([
            supabase
              .from("tenant_users")
              .select("id", { count: "exact", head: true })
              .eq("tenant_id", tenant.id),
            supabase
              .from("agents")
              .select("id", { count: "exact", head: true })
              .eq("tenant_id", tenant.id),
            supabase
              .from("conversations_secure")
              .select("id", { count: "exact", head: true })
              .eq("tenant_id", tenant.id),
          ]);

          return {
            ...tenant,
            _count: {
              users: usersRes.count || 0,
              agents: agentsRes.count || 0,
              conversations: conversationsRes.count || 0,
            },
          };
        })
      );

      setTenants(tenantsWithCounts);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao carregar clientes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: selectedTenant ? prev.slug : generateSlug(name),
    }));
  };

  const openCreateDialog = () => {
    setSelectedTenant(null);
    setFormData({
      name: "",
      slug: "",
      plan: "starter",
      status: "active",
      max_agents: 3,
      max_messages_month: 1000,
      ownerEmail: "",
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setFormData({
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan || "starter",
      status: tenant.status || "active",
      max_agents: tenant.max_agents || 3,
      max_messages_month: tenant.max_messages_month || 1000,
      ownerEmail: "",
    });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.slug) {
      toast({
        title: "Erro",
        description: "Nome e slug são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setFormLoading(true);

    try {
      if (isSuperAdmin) {
        // Super admins use the edge function
        const { data, error } = await supabase.functions.invoke("manage-tenant", {
          body: {
            action: selectedTenant ? "update" : "create",
            tenant_id: selectedTenant?.id,
            tenant: {
              name: formData.name,
              slug: formData.slug,
              plan: formData.plan,
              status: formData.status,
              max_agents: formData.max_agents,
              max_messages_month: formData.max_messages_month,
            },
            owner: formData.ownerEmail ? { email: formData.ownerEmail } : undefined,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        toast({
          title: "Sucesso",
          description: selectedTenant ? "Cliente atualizado com sucesso!" : "Cliente criado com sucesso!",
        });
      } else {
        // Regular admins can only update their own tenant
        if (selectedTenant) {
          const { error } = await supabase
            .from("tenants")
            .update({
              name: formData.name,
              slug: formData.slug,
              plan: formData.plan,
              status: formData.status,
              max_agents: formData.max_agents,
              max_messages_month: formData.max_messages_month,
            })
            .eq("id", selectedTenant.id);

          if (error) throw error;

          toast({
            title: "Sucesso",
            description: "Cliente atualizado com sucesso!",
          });
        }
      }

      setIsDialogOpen(false);
      loadTenants();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar cliente.",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTenant) return;

    setFormLoading(true);

    try {
      if (isSuperAdmin) {
        const { data, error } = await supabase.functions.invoke("manage-tenant", {
          body: {
            action: "delete",
            tenant_id: selectedTenant.id,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      } else {
        // Regular users cannot delete tenants
        throw new Error("Você não tem permissão para excluir clientes.");
      }

      toast({
        title: "Sucesso",
        description: "Cliente excluído com sucesso!",
      });

      setIsDeleteDialogOpen(false);
      loadTenants();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir cliente.",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const filteredTenants = tenants.filter(
    (tenant) =>
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.slug.toLowerCase().includes(searchQuery.toLowerCase())
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
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
            {isSuperAdmin && (
              <Badge className="bg-pink/20 text-pink">
                <Crown className="w-3 h-3 mr-1" />
                Super Admin
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            {isSuperAdmin 
              ? "Gerencie todos os clientes (tenants) da plataforma" 
              : "Visualize as informações do seu workspace"}
          </p>
        </div>
        {isSuperAdmin && (
          <Button
            onClick={openCreateDialog}
            className="bg-gradient-to-r from-purple to-pink hover:opacity-90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Cliente
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
          placeholder="Buscar clientes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-background/50"
        />
      </motion.div>

      {/* Tenants Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple" />
        </div>
      ) : filteredTenants.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-12 text-center"
        >
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum cliente encontrado</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery
              ? "Tente uma busca diferente"
              : "Comece criando seu primeiro cliente"}
          </p>
          {!searchQuery && isSuperAdmin && (
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Cliente
            </Button>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {filteredTenants.map((tenant, index) => (
            <motion.div
              key={tenant.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 * index }}
              className="glass-card p-6 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple to-pink flex items-center justify-center text-primary-foreground font-bold text-lg">
                    {tenant.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{tenant.name}</h3>
                    <p className="text-sm text-muted-foreground">@{tenant.slug}</p>
                  </div>
                </div>
                {isSuperAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(tenant)}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openDeleteDialog(tenant)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <div className="flex gap-2">
                <Badge className={cn("font-medium", planColors[tenant.plan || "starter"])}>
                  {tenant.plan || "Starter"}
                </Badge>
                <Badge className={cn("font-medium", statusColors[tenant.status || "active"])}>
                  {tenant.status === "active" ? "Ativo" : tenant.status === "inactive" ? "Inativo" : "Suspenso"}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    <span className="text-lg font-semibold text-foreground">
                      {tenant._count?.users || 0}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Usuários</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <Bot className="w-3.5 h-3.5" />
                    <span className="text-lg font-semibold text-foreground">
                      {tenant._count?.agents || 0}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Agentes</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="text-lg font-semibold text-foreground">
                      {tenant._count?.conversations || 0}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Conversas</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedTenant ? "Editar Cliente" : "Novo Cliente"}
            </DialogTitle>
            <DialogDescription>
              {selectedTenant
                ? "Atualize as informações do cliente"
                : "Preencha as informações para criar um novo cliente"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Nome do cliente"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, slug: e.target.value }))
                }
                placeholder="slug-do-cliente"
              />
              <p className="text-xs text-muted-foreground">
                URL: app.tryvia.com.br/{formData.slug}
              </p>
            </div>

            {!selectedTenant && isSuperAdmin && (
              <div className="space-y-2">
                <Label htmlFor="ownerEmail">Email do Proprietário (opcional)</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="ownerEmail"
                    type="email"
                    value={formData.ownerEmail}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, ownerEmail: e.target.value }))
                    }
                    placeholder="owner@empresa.com"
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Se informado, o usuário será adicionado como proprietário do tenant.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plano</Label>
                <Select
                  value={formData.plan}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, plan: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="suspended">Suspenso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Máx. Agentes</Label>
                <Input
                  type="number"
                  value={formData.max_agents}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, max_agents: parseInt(e.target.value) || 3 }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Máx. Mensagens/Mês</Label>
                <Input
                  type="number"
                  value={formData.max_messages_month}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, max_messages_month: parseInt(e.target.value) || 1000 }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={formLoading}>
              {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedTenant ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{selectedTenant?.name}"? 
              Esta ação não pode ser desfeita e todos os dados do cliente serão permanentemente removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={formLoading}
            >
              {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
