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
  UserPlus,
  Shield,
  Eye,
  EyeOff,
  ChevronRight,
  X,
  Settings,
  Wifi,
  WifiOff,
  Copy,
  Clock,
  Send,
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
  DropdownMenuSeparator,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/contexts/PermissionsContext";
import { cn } from "@/lib/utils";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

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

interface TenantMember {
  id: string;
  user_id: string;
  role: AppRole;
  status: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
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
  
  // Team management state
  const [isTeamSheetOpen, setIsTeamSheetOpen] = useState(false);
  const [teamTenant, setTeamTenant] = useState<Tenant | null>(null);
  const [teamMembers, setTeamMembers] = useState<TenantMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("member");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<{
    id: string;
    email: string;
    role: AppRole;
    token: string;
    expires_at: string;
  }[]>([]);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);

  // Integrations management state
  const [isIntegrationsSheetOpen, setIsIntegrationsSheetOpen] = useState(false);
  const [integrationsTenant, setIntegrationsTenant] = useState<Tenant | null>(null);
  const [integrationsConfig, setIntegrationsConfig] = useState({
    zapi_instance_id: "",
    zapi_token: "",
    zapi_client_token: "",
    zapi_webhook_url: "",
    n8n_api_key: "",
    n8n_webhook_base: "",
  });
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [savingIntegrations, setSavingIntegrations] = useState(false);
  const [testingZapi, setTestingZapi] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

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
      // Verify session is valid
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        toast({
          title: "Sessão expirada",
          description: "Por favor, faça login novamente.",
          variant: "destructive",
        });
        return;
      }

      if (selectedTenant) {
        // UPDATE - same logic for super admins and regular admins
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
      } else if (isSuperAdmin) {
        // CREATE - only super admins can create new tenants
        const { data: newTenant, error: createError } = await supabase
          .from("tenants")
          .insert({
            name: formData.name,
            slug: formData.slug,
            plan: formData.plan,
            status: formData.status,
            max_agents: formData.max_agents,
            max_messages_month: formData.max_messages_month,
          })
          .select()
          .single();

        if (createError) throw createError;

        // If owner email was provided, create an invitation
        if (formData.ownerEmail && newTenant) {
          const token = crypto.randomUUID();
          const { error: inviteError } = await supabase
            .from("invitations")
            .insert({
              tenant_id: newTenant.id,
              email: formData.ownerEmail,
              role: "owner" as AppRole,
              token,
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            });

          if (inviteError) {
            console.error("Erro ao criar convite:", inviteError);
            toast({
              title: "Cliente criado",
              description: "Cliente criado, mas houve erro ao enviar convite ao proprietário.",
              variant: "default",
            });
          } else {
            toast({
              title: "Sucesso",
              description: "Cliente criado e convite enviado ao proprietário!",
            });
          }
        } else {
          toast({
            title: "Sucesso",
            description: "Cliente criado com sucesso!",
          });
        }
      } else {
        throw new Error("Você não tem permissão para criar clientes.");
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
      // Verify session is valid
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        toast({
          title: "Sessão expirada",
          description: "Por favor, faça login novamente.",
          variant: "destructive",
        });
        return;
      }

      if (!isSuperAdmin) {
        throw new Error("Você não tem permissão para excluir clientes.");
      }

      // Super admin deletes directly via query
      const { error } = await supabase
        .from("tenants")
        .delete()
        .eq("id", selectedTenant.id);

      if (error) throw error;

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

  const openTeamSheet = async (tenant: Tenant) => {
    setTeamTenant(tenant);
    setIsTeamSheetOpen(true);
    setTeamLoading(true);
    
    try {
      // Load team members for this tenant
      const { data: membersData, error: membersError } = await supabase
        .from("tenant_users")
        .select("*")
        .eq("tenant_id", tenant.id)
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

      setTeamMembers(membersWithProfiles);

      // Load pending invitations for this tenant
      const { data: invitesData, error: invitesError } = await supabase
        .from("invitations")
        .select("id, email, role, token, expires_at")
        .eq("tenant_id", tenant.id)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (invitesError) throw invitesError;
      setPendingInvites(invitesData || []);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao carregar membros.",
        variant: "destructive",
      });
    } finally {
      setTeamLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail || !teamTenant) {
      toast({
        title: "Erro",
        description: "Por favor, insira um email.",
        variant: "destructive",
      });
      return;
    }

    setInviteLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      // Check if email already has pending invitation for this tenant
      const { data: existingInvite } = await supabase
        .from("invitations")
        .select("id")
        .eq("tenant_id", teamTenant.id)
        .eq("email", inviteEmail.toLowerCase())
        .eq("status", "pending")
        .single();

      if (existingInvite) {
        throw new Error("Este email já possui um convite pendente para este cliente");
      }

      // Generate unique token
      const token = crypto.randomUUID();

      // Create invitation record directly in the database
      const { error: inviteError } = await supabase
        .from("invitations")
        .insert({
          tenant_id: teamTenant.id,
          email: inviteEmail.toLowerCase(),
          role: inviteRole as AppRole,
          token,
          invited_by: user.id,
          status: "pending",
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });

      if (inviteError) throw inviteError;

      // Get inviter profile name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const inviterName = profile?.full_name || user.email || "Administrador";

      // Send invitation email via edge function (Lovable Cloud)
      try {
        const cloudSupabaseUrl = "https://pfsmikupgqyezsroqigf.supabase.co";
        const cloudAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmc21pa3VwZ3F5ZXpzcm9xaWdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMjI0ODYsImV4cCI6MjA4MjU5ODQ4Nn0.-xNL64aZIFPPF3TMFjCdi_umLEitXjJ0NY84-FAfy8M";
        
        const emailResponse = await fetch(`${cloudSupabaseUrl}/functions/v1/send-invite-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": cloudAnonKey,
          },
          body: JSON.stringify({
            email: inviteEmail.toLowerCase(),
            role: inviteRole,
            tenantName: teamTenant.name,
            inviterName,
            token,
          }),
        });

        if (emailResponse.ok) {
          toast({
            title: "Convite enviado!",
            description: `Um email foi enviado para ${inviteEmail}.`,
          });
        } else {
          const errorData = await emailResponse.json();
          console.error("Email error:", errorData);
          toast({
            title: "Convite criado!",
            description: `Convite criado para ${inviteEmail}, mas o email não pôde ser enviado. Use o botão "Copiar Link" para compartilhar.`,
          });
        }
      } catch (emailError) {
        console.error("Email sending error:", emailError);
        toast({
          title: "Convite criado!",
          description: `Convite criado para ${inviteEmail}, mas o email não pôde ser enviado. Use o botão "Copiar Link" para compartilhar.`,
        });
      }

      setIsInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("member");
      
      // Reload team
      if (teamTenant) {
        openTeamSheet(teamTenant);
      }
    } catch (error: any) {
      console.error("Invite error:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar convite.",
        variant: "destructive",
      });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleResendInviteEmail = async (invite: { id: string; email: string; role: AppRole; token: string }) => {
    if (!teamTenant) return;
    
    setResendingEmail(invite.id);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const inviterName = profile?.full_name || user.email || "Administrador";

      const cloudSupabaseUrl = "https://pfsmikupgqyezsroqigf.supabase.co";
      const cloudAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmc21pa3VwZ3F5ZXpzcm9xaWdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMjI0ODYsImV4cCI6MjA4MjU5ODQ4Nn0.-xNL64aZIFPPF3TMFjCdi_umLEitXjJ0NY84-FAfy8M";
      
      const emailResponse = await fetch(`${cloudSupabaseUrl}/functions/v1/send-invite-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": cloudAnonKey,
        },
        body: JSON.stringify({
          email: invite.email,
          role: invite.role,
          tenantName: teamTenant.name,
          inviterName,
          token: invite.token,
        }),
      });

      if (emailResponse.ok) {
        toast({
          title: "Email reenviado!",
          description: `Um novo email foi enviado para ${invite.email}.`,
        });
      } else {
        const errorData = await emailResponse.json();
        console.error("Email error:", errorData);
        throw new Error("Falha ao enviar email");
      }
    } catch (error: any) {
      console.error("Resend email error:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao reenviar email.",
        variant: "destructive",
      });
    } finally {
      setResendingEmail(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("tenant_users")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Membro removido com sucesso!",
      });

      // Reload team
      if (teamTenant) {
        openTeamSheet(teamTenant);
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao remover membro.",
        variant: "destructive",
      });
    }
  };

  // Integrations management functions
  const openIntegrationsSheet = async (tenant: Tenant) => {
    setIntegrationsTenant(tenant);
    setIsIntegrationsSheetOpen(true);
    setIntegrationsLoading(true);
    setShowSecrets({});

    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("zapi_instance_id, zapi_token, zapi_client_token, zapi_webhook_url, n8n_api_key, n8n_webhook_base")
        .eq("id", tenant.id)
        .single();

      if (error) throw error;

      setIntegrationsConfig({
        zapi_instance_id: data?.zapi_instance_id || "",
        zapi_token: data?.zapi_token || "",
        zapi_client_token: data?.zapi_client_token || "",
        zapi_webhook_url: data?.zapi_webhook_url || "",
        n8n_api_key: data?.n8n_api_key || "",
        n8n_webhook_base: data?.n8n_webhook_base || "",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao carregar configurações.",
        variant: "destructive",
      });
    } finally {
      setIntegrationsLoading(false);
    }
  };

  const handleSaveIntegrations = async () => {
    if (!integrationsTenant) return;

    setSavingIntegrations(true);
    try {
      const { error } = await supabase
        .from("tenants")
        .update({
          zapi_instance_id: integrationsConfig.zapi_instance_id || null,
          zapi_token: integrationsConfig.zapi_token || null,
          zapi_client_token: integrationsConfig.zapi_client_token || null,
          zapi_webhook_url: integrationsConfig.zapi_webhook_url || null,
          n8n_api_key: integrationsConfig.n8n_api_key || null,
          n8n_webhook_base: integrationsConfig.n8n_webhook_base || null,
        })
        .eq("id", integrationsTenant.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Integrações salvas com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar integrações.",
        variant: "destructive",
      });
    } finally {
      setSavingIntegrations(false);
    }
  };

  const handleTestZapiConnection = async () => {
    if (!integrationsConfig.zapi_instance_id || !integrationsConfig.zapi_token) {
      toast({
        title: "Erro",
        description: "Preencha o Instance ID e Token para testar.",
        variant: "destructive",
      });
      return;
    }

    setTestingZapi(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (integrationsConfig.zapi_client_token) {
        headers["Client-Token"] = integrationsConfig.zapi_client_token;
      }
      
      const response = await fetch(
        `https://api.z-api.io/instances/${integrationsConfig.zapi_instance_id}/token/${integrationsConfig.zapi_token}/status`,
        { method: "GET", headers }
      );

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Conexão bem-sucedida!",
          description: `Status: ${data.connected ? "Conectado" : "Desconectado"}`,
        });
      } else {
        throw new Error("Falha na conexão com Z-API");
      }
    } catch (error: any) {
      toast({
        title: "Erro de conexão",
        description: error.message || "Não foi possível conectar à Z-API.",
        variant: "destructive",
      });
    } finally {
      setTestingZapi(false);
    }
  };

  const toggleSecret = (field: string) => {
    setShowSecrets((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const updateIntegrationsConfig = (field: keyof typeof integrationsConfig, value: string) => {
    setIntegrationsConfig((prev) => ({ ...prev, [field]: value }));
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
                      <DropdownMenuItem onClick={() => openTeamSheet(tenant)}>
                        <Users className="w-4 h-4 mr-2" />
                        Gerenciar Equipe
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openIntegrationsSheet(tenant)}>
                        <Settings className="w-4 h-4 mr-2" />
                        Gerenciar Integrações
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
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

      {/* Team Management Sheet */}
      <Sheet open={isTeamSheetOpen} onOpenChange={setIsTeamSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Equipe - {teamTenant?.name}
            </SheetTitle>
            <SheetDescription>
              Gerencie os membros da equipe deste cliente
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Add Member Button */}
            <Button 
              onClick={() => setIsInviteDialogOpen(true)} 
              className="w-full bg-gradient-to-r from-purple to-pink hover:opacity-90"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Convidar Membro
            </Button>

            {/* Members List */}
            {teamLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple" />
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum membro na equipe.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple to-pink flex items-center justify-center text-primary-foreground font-bold">
                        {member.profile?.full_name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {member.profile?.full_name || "Usuário"}
                        </p>
                        <Badge className={cn("font-medium text-xs", roleColors[member.role])}>
                          {roleLabels[member.role]}
                        </Badge>
                      </div>
                    </div>
                    {member.role !== "owner" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Pending Invites Section */}
            {!teamLoading && pendingInvites.length > 0 && (
              <div className="space-y-3 mt-6">
                <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Convites Pendentes ({pendingInvites.length})
                </h4>
                {pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-dashed border-border"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">
                          {invite.email}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge className={cn("font-medium text-xs", roleColors[invite.role])}>
                            {roleLabels[invite.role]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Expira em {new Date(invite.expires_at).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResendInviteEmail(invite)}
                        disabled={resendingEmail === invite.id}
                      >
                        {resendingEmail === invite.id ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-1" />
                        )}
                        Reenviar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const inviteUrl = `${window.location.origin}/accept-invite?token=${invite.token}`;
                          navigator.clipboard.writeText(inviteUrl);
                          toast({
                            title: "Link copiado!",
                            description: "O link do convite foi copiado para a área de transferência.",
                          });
                        }}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copiar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Invite Member Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar Membro</DialogTitle>
            <DialogDescription>
              Envie um convite para um novo membro da equipe
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="inviteEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@empresa.com"
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
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="member">Membro</SelectItem>
                  <SelectItem value="viewer">Visualizador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleInviteMember} disabled={inviteLoading}>
              {inviteLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enviar Convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Integrations Management Sheet */}
      <Sheet open={isIntegrationsSheetOpen} onOpenChange={setIsIntegrationsSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Integrações - {integrationsTenant?.name}
            </SheetTitle>
            <SheetDescription>
              Configure as integrações Z-API e N8N para este cliente
            </SheetDescription>
          </SheetHeader>

          {integrationsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple" />
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {/* Z-API Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-success/20 flex items-center justify-center">
                    <Wifi className="w-4 h-4 text-success" />
                  </div>
                  <h3 className="font-semibold text-foreground">Z-API</h3>
                  {integrationsConfig.zapi_instance_id && integrationsConfig.zapi_token && (
                    <Badge className="bg-success/20 text-success">Configurado</Badge>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Instance ID</Label>
                    <Input
                      value={integrationsConfig.zapi_instance_id}
                      onChange={(e) => updateIntegrationsConfig("zapi_instance_id", e.target.value)}
                      placeholder="ID da instância Z-API"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Token</Label>
                    <div className="relative">
                      <Input
                        type={showSecrets["zapi_token"] ? "text" : "password"}
                        value={integrationsConfig.zapi_token}
                        onChange={(e) => updateIntegrationsConfig("zapi_token", e.target.value)}
                        placeholder="Token de autenticação"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => toggleSecret("zapi_token")}
                      >
                        {showSecrets["zapi_token"] ? (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Client Token (Segurança)</Label>
                    <div className="relative">
                      <Input
                        type={showSecrets["zapi_client_token"] ? "text" : "password"}
                        value={integrationsConfig.zapi_client_token}
                        onChange={(e) => updateIntegrationsConfig("zapi_client_token", e.target.value)}
                        placeholder="Token de segurança da conta"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => toggleSecret("zapi_client_token")}
                      >
                        {showSecrets["zapi_client_token"] ? (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Obrigatório se "Segurança da Conta" estiver ativo
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Webhook URL</Label>
                    <Input
                      value={integrationsConfig.zapi_webhook_url}
                      onChange={(e) => updateIntegrationsConfig("zapi_webhook_url", e.target.value)}
                      placeholder="URL do webhook para receber mensagens"
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestZapiConnection}
                    disabled={testingZapi}
                    className="w-full"
                  >
                    {testingZapi ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Wifi className="w-4 h-4 mr-2" />
                    )}
                    Testar Conexão
                  </Button>
                </div>
              </div>

              {/* N8N Section */}
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-orange-500/20 flex items-center justify-center">
                    <Settings className="w-4 h-4 text-orange-500" />
                  </div>
                  <h3 className="font-semibold text-foreground">N8N</h3>
                  {integrationsConfig.n8n_api_key && integrationsConfig.n8n_webhook_base && (
                    <Badge className="bg-orange-500/20 text-orange-500">Configurado</Badge>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <div className="relative">
                      <Input
                        type={showSecrets["n8n_api_key"] ? "text" : "password"}
                        value={integrationsConfig.n8n_api_key}
                        onChange={(e) => updateIntegrationsConfig("n8n_api_key", e.target.value)}
                        placeholder="Chave de API do N8N"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => toggleSecret("n8n_api_key")}
                      >
                        {showSecrets["n8n_api_key"] ? (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Webhook Base URL</Label>
                    <Input
                      value={integrationsConfig.n8n_webhook_base}
                      onChange={(e) => updateIntegrationsConfig("n8n_webhook_base", e.target.value)}
                      placeholder="https://seu-n8n.com/webhook"
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t border-border">
                <Button
                  onClick={handleSaveIntegrations}
                  disabled={savingIntegrations}
                  className="w-full bg-gradient-to-r from-purple to-pink hover:opacity-90"
                >
                  {savingIntegrations && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar Integrações
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
