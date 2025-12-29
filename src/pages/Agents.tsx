import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  Bot,
  MoreVertical,
  MessageSquare,
  Zap,
  Pause,
  Play,
  Copy,
  Trash2,
  Search,
  SlidersHorizontal,
  FileEdit,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { supabase } from "@/integrations/supabase/client";

interface Agent {
  id: string;
  name: string;
  description: string | null;
  model: string | null;
  status: string | null;
  total_conversations: number | null;
  total_messages: number | null;
  avatar_url: string | null;
  created_at: string | null;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const avatarColors = [
  "from-purple to-pink",
  "from-cyan to-blue-500",
  "from-pink to-orange-500",
  "from-green-500 to-cyan",
  "from-amber-500 to-red-500",
];

export default function Agents() {
  const { user } = useAuth();
  const { tenantId, hasPermission } = usePermissions();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadAgents();
  }, [user, tenantId]);

  const loadAgents = async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAgents(data || []);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao carregar agentes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (agent: Agent, newStatus: string) => {
    setActionLoading(agent.id);
    try {
      const { error } = await supabase
        .from("agents")
        .update({ status: newStatus })
        .eq("id", agent.id);

      if (error) throw error;

      setAgents((prev) =>
        prev.map((a) => (a.id === agent.id ? { ...a, status: newStatus } : a))
      );

      const statusLabels: Record<string, string> = {
        active: "ativado",
        paused: "pausado",
        draft: "salvo como rascunho",
      };

      toast({
        title: "Sucesso",
        description: `Agente ${statusLabels[newStatus] || "atualizado"}!`,
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar status.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDuplicate = async (agent: Agent) => {
    setActionLoading(agent.id);
    try {
      // Get full agent data
      const { data: fullAgent, error: fetchError } = await supabase
        .from("agents")
        .select("*")
        .eq("id", agent.id)
        .single();

      if (fetchError) throw fetchError;

      // Create duplicate
      const { id, created_at, updated_at, total_conversations, total_messages, avg_response_time_ms, ...agentData } = fullAgent;
      
      const { data: newAgent, error } = await supabase
        .from("agents")
        .insert({
          ...agentData,
          name: `${agent.name} (cópia)`,
          status: "draft",
          total_conversations: 0,
          total_messages: 0,
          avg_response_time_ms: 0,
        })
        .select()
        .single();

      if (error) throw error;

      setAgents((prev) => [newAgent, ...prev]);

      toast({
        title: "Sucesso",
        description: "Agente duplicado com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao duplicar agente.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!agentToDelete) return;

    setActionLoading(agentToDelete.id);
    try {
      const { error } = await supabase
        .from("agents")
        .delete()
        .eq("id", agentToDelete.id);

      if (error) throw error;

      setAgents((prev) => prev.filter((a) => a.id !== agentToDelete.id));

      toast({
        title: "Sucesso",
        description: "Agente excluído com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir agente.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
      setDeleteDialogOpen(false);
      setAgentToDelete(null);
    }
  };

  const openDeleteDialog = (agent: Agent) => {
    setAgentToDelete(agent);
    setDeleteDialogOpen(true);
  };

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || agent.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getAvatarColor = (index: number) => avatarColors[index % avatarColors.length];

  const canCreate = hasPermission("agents.create");
  const canEdit = hasPermission("agents.edit");
  const canDelete = hasPermission("agents.delete");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <motion.h1
            className="text-2xl font-bold text-foreground"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Agentes
          </motion.h1>
          <motion.p
            className="text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            Gerencie seus assistentes de IA
          </motion.p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link to="/agents/new">
              <Plus className="w-4 h-4" />
              Novo Agente
            </Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <motion.div
        className="flex flex-col sm:flex-row gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar agentes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="paused">Pausados</SelectItem>
            <SelectItem value="draft">Rascunhos</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Agent Grid */}
      {filteredAgents.length > 0 ? (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {filteredAgents.map((agent, index) => (
            <motion.div key={agent.id} variants={item}>
              <GlassCard className="p-6 h-full flex flex-col" glow="purple">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getAvatarColor(index)} flex items-center justify-center`}
                    >
                      <Bot className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{agent.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-muted-foreground">
                        {agent.model || "GPT-4o Mini"}
                      </span>
                    </div>
                  </div>
                  {(canEdit || canDelete) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          disabled={actionLoading === agent.id}
                        >
                          {actionLoading === agent.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <MoreVertical className="w-4 h-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEdit && (
                          <DropdownMenuItem asChild>
                            <Link to={`/agents/${agent.id}/edit`}>
                              <Zap className="w-4 h-4 mr-2" />
                              Editar
                            </Link>
                          </DropdownMenuItem>
                        )}
                        {canEdit && agent.status !== "draft" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(agent, "draft")}>
                            <FileEdit className="w-4 h-4 mr-2" />
                            Rascunho
                          </DropdownMenuItem>
                        )}
                        {canEdit && agent.status !== "active" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(agent, "active")}>
                            <Play className="w-4 h-4 mr-2" />
                            Ativar
                          </DropdownMenuItem>
                        )}
                        {canEdit && agent.status !== "paused" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(agent, "paused")}>
                            <Pause className="w-4 h-4 mr-2" />
                            Pausar
                          </DropdownMenuItem>
                        )}
                        {canEdit && (
                          <DropdownMenuItem onClick={() => handleDuplicate(agent)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-error focus:text-error"
                              onClick={() => openDeleteDialog(agent)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 flex-1 mb-4">
                  {agent.description || "Sem descrição"}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      {agent.total_conversations || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="w-4 h-4" />
                      {(agent.total_messages || 0) >= 1000
                        ? `${((agent.total_messages || 0) / 1000).toFixed(1)}k`
                        : agent.total_messages || 0}
                    </span>
                  </div>
                  <StatusBadge status={(agent.status as "active" | "paused" | "draft") || "draft"} />
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          className="flex flex-col items-center justify-center py-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-4">
            <Bot className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Nenhum agente encontrado
          </h3>
          <p className="text-muted-foreground text-center max-w-sm mb-6">
            {searchQuery || statusFilter !== "all"
              ? "Tente ajustar seus filtros de busca"
              : "Crie seu primeiro agente de IA para começar a automatizar conversas"}
          </p>
          {canCreate && (
            <Button asChild>
              <Link to="/agents/new">
                <Plus className="w-4 h-4" />
                Criar Primeiro Agente
              </Link>
            </Button>
          )}
        </motion.div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Agente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o agente "{agentToDelete?.name}"? 
              Esta ação não pode ser desfeita e todas as conversas associadas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
