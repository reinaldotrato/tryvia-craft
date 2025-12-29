import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Activity, 
  Search, 
  Calendar,
  User,
  Bot,
  Settings,
  MessageSquare,
  Users,
  Shield,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GlassCard } from "@/components/ui/GlassCard";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ActivityLog {
  id: string;
  tenant_id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  old_values: unknown;
  new_values: unknown;
  metadata: unknown;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_profile?: {
    full_name: string | null;
  };
}

const actionIcons: Record<string, React.ElementType> = {
  create: Activity,
  update: Settings,
  delete: Activity,
  login: User,
  logout: User,
  invite: Users,
  agent_created: Bot,
  agent_updated: Bot,
  agent_deleted: Bot,
  conversation_started: MessageSquare,
  conversation_closed: MessageSquare,
  role_changed: Shield,
  default: Activity,
};

const actionColors: Record<string, string> = {
  create: "bg-success/20 text-success",
  update: "bg-cyan/20 text-cyan",
  delete: "bg-destructive/20 text-destructive",
  login: "bg-purple/20 text-purple",
  logout: "bg-muted text-muted-foreground",
  invite: "bg-pink/20 text-pink",
  default: "bg-muted text-muted-foreground",
};

const entityLabels: Record<string, string> = {
  agent: "Agente",
  conversation: "Conversa",
  tenant: "Tenant",
  user: "Usuário",
  message: "Mensagem",
  invitation: "Convite",
  api_key: "API Key",
};

const ITEMS_PER_PAGE = 20;

export default function ActivityLogs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("7d");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadLogs();
  }, [user, actionFilter, entityFilter, dateFilter, page]);

  const getDateRange = () => {
    const end = new Date();
    let start: Date;

    switch (dateFilter) {
      case "today":
        start = new Date();
        start.setHours(0, 0, 0, 0);
        break;
      case "7d":
        start = subDays(new Date(), 7);
        break;
      case "30d":
        start = subDays(new Date(), 30);
        break;
      case "90d":
        start = subDays(new Date(), 90);
        break;
      default:
        start = subDays(new Date(), 7);
    }

    return { start, end };
  };

  const loadLogs = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Check if user is admin/owner
      const { data: tenantUser } = await supabase
        .from("tenant_users")
        .select("tenant_id, role")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      if (!tenantUser) throw new Error("Tenant não encontrado");

      const userIsAdmin = tenantUser.role === "owner" || tenantUser.role === "admin";
      setIsAdmin(userIsAdmin);

      const { start, end } = getDateRange();
      const offset = (page - 1) * ITEMS_PER_PAGE;

      // Use secure view for reading logs (hides IP/user_agent for non-admins)
      let query = supabase
        .from("activity_logs_secure")
        .select("*", { count: "exact" })
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: false })
        .range(offset, offset + ITEMS_PER_PAGE - 1);

      if (actionFilter !== "all") {
        query = query.ilike("action", `%${actionFilter}%`);
      }

      if (entityFilter !== "all") {
        query = query.eq("entity_type", entityFilter);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // Get user profiles for logs
      const userIds = [...new Set((data || []).filter(l => l.user_id).map(l => l.user_id))];
      let profiles: Record<string, { full_name: string | null }> = {};

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds as string[]);

        profiles = (profilesData || []).reduce((acc, p) => {
          acc[p.id] = { full_name: p.full_name };
          return acc;
        }, {} as Record<string, { full_name: string | null }>);
      }

      const logsWithProfiles = (data || []).map(log => ({
        ...log,
        user_profile: log.user_id ? profiles[log.user_id] : undefined,
      }));

      setLogs(logsWithProfiles);
      setTotalCount(count || 0);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao carregar logs.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.entity_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.user_profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const getIcon = (action: string) => {
    const Icon = actionIcons[action] || actionIcons.default;
    return Icon;
  };

  const getActionColor = (action: string) => {
    if (action.includes("create") || action.includes("created")) return actionColors.create;
    if (action.includes("update") || action.includes("updated")) return actionColors.update;
    if (action.includes("delete") || action.includes("deleted")) return actionColors.delete;
    if (action.includes("login")) return actionColors.login;
    if (action.includes("logout")) return actionColors.logout;
    if (action.includes("invite")) return actionColors.invite;
    return actionColors.default;
  };

  const formatAction = (action: string) => {
    return action
      .replace(/_/g, " ")
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-bold text-foreground">Logs de Atividade</h1>
        <p className="text-muted-foreground mt-1">
          Histórico de ações realizadas no sistema
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background/50"
          />
        </div>

        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[160px]">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>

        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Entidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="agent">Agentes</SelectItem>
            <SelectItem value="conversation">Conversas</SelectItem>
            <SelectItem value="user">Usuários</SelectItem>
            <SelectItem value="invitation">Convites</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-purple" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalCount}</p>
              <p className="text-sm text-muted-foreground">Total de logs</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-cyan" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {new Set(logs.map(l => l.user_id).filter(Boolean)).size}
              </p>
              <p className="text-sm text-muted-foreground">Usuários ativos</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pink/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-pink" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {isAdmin ? "Admin" : "Membro"}
              </p>
              <p className="text-sm text-muted-foreground">Seu acesso</p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Logs List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-12 text-center"
        >
          <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum log encontrado</h3>
          <p className="text-muted-foreground">
            Não há atividades registradas no período selecionado.
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="glass-card divide-y divide-border overflow-hidden"
        >
          {filteredLogs.map((log, index) => {
            const Icon = getIcon(log.action);
            
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: 0.02 * index }}
                className="p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                    getActionColor(log.action)
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">
                        {formatAction(log.action)}
                      </span>
                      {log.entity_type && (
                        <Badge variant="outline" className="text-xs">
                          {entityLabels[log.entity_type] || log.entity_type}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <span>
                        {log.user_profile?.full_name || "Sistema"}
                      </span>
                      <span>•</span>
                      <span>
                        {format(new Date(log.created_at), "dd MMM yyyy, HH:mm", { locale: ptBR })}
                      </span>
                    </div>

                    {/* Show IP/User Agent only for admins */}
                    {isAdmin && (log.ip_address || log.user_agent) && (
                      <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded p-2">
                        {log.ip_address && (
                          <span className="mr-4">IP: {log.ip_address}</span>
                        )}
                        {log.user_agent && (
                          <span className="truncate block">UA: {log.user_agent}</span>
                        )}
                      </div>
                    )}

                    {/* Show metadata changes */}
                    {(log.old_values || log.new_values) && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          Ver detalhes
                        </summary>
                        <div className="mt-2 text-xs bg-muted/50 rounded p-2 overflow-x-auto">
                          <pre className="text-muted-foreground">
                            {JSON.stringify({ old: log.old_values, new: log.new_values }, null, 2)}
                          </pre>
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-2"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </motion.div>
      )}
    </div>
  );
}