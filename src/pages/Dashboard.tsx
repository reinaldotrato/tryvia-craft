import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Bot, MessageSquare, Send, CheckCircle, ArrowUpRight, Clock, Users, Loader2 } from "lucide-react";
import { KpiCard } from "@/components/ui/KpiCard";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

interface DashboardStats {
  totalAgents: number;
  activeAgents: number;
  totalConversations: number;
  todayConversations: number;
  totalMessages: number;
  todayMessages: number;
  teamMembers: number;
  tenantName: string;
}

interface RecentConversation {
  id: string;
  contact_name: string | null;
  phone: string;
  last_message_at: string | null;
  status: string | null;
  agent?: { name: string } | null;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalAgents: 0,
    activeAgents: 0,
    totalConversations: 0,
    todayConversations: 0,
    totalMessages: 0,
    todayMessages: 0,
    teamMembers: 0,
    tenantName: "",
  });
  const [recentConversations, setRecentConversations] = useState<RecentConversation[]>([]);
  const [messagesData, setMessagesData] = useState<{ day: string; received: number; sent: number }[]>([]);
  const [agentPerformance, setAgentPerformance] = useState<{ name: string; responseTime: number }[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    try {
      // Get tenant info
      const { data: tenantUser, error: tenantError } = await supabase
        .from("tenant_users")
        .select("tenant_id, tenants(name)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (tenantError) {
        console.error("Error fetching tenant:", tenantError);
        throw new Error("Erro ao buscar workspace. Tente fazer logout e login novamente.");
      }

      if (!tenantUser) {
        throw new Error("Você não está associado a nenhum workspace. Entre em contato com um administrador.");
      }

      const tenantId = tenantUser.tenant_id;
      const tenantName = (tenantUser.tenants as any)?.name || "Meu Workspace";

      // Parallel queries for stats
      const [
        agentsRes,
        conversationsRes,
        todayConversationsRes,
        teamRes,
        recentConvsRes,
        agentsWithStatsRes,
      ] = await Promise.all([
        supabase.from("agents").select("id, status").eq("tenant_id", tenantId),
        supabase.from("conversations").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase
          .from("conversations")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .gte("created_at", new Date().toISOString().split("T")[0]),
        supabase
          .from("tenant_users")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("status", "active"),
        supabase
          .from("conversations")
          .select("id, contact_name, phone, last_message_at, status, agents(name)")
          .eq("tenant_id", tenantId)
          .order("last_message_at", { ascending: false })
          .limit(5),
        supabase
          .from("agents")
          .select("name, avg_response_time_ms")
          .eq("tenant_id", tenantId)
          .not("avg_response_time_ms", "is", null)
          .limit(5),
      ]);

      const agents = agentsRes.data || [];
      const activeAgents = agents.filter((a) => a.status === "active").length;

      setStats({
        totalAgents: agents.length,
        activeAgents,
        totalConversations: conversationsRes.count || 0,
        todayConversations: todayConversationsRes.count || 0,
        totalMessages: 0,
        todayMessages: 0,
        teamMembers: teamRes.count || 0,
        tenantName,
      });

      setRecentConversations(
        (recentConvsRes.data || []).map((c) => ({
          ...c,
          agent: c.agents as any,
        }))
      );

      // Agent performance data
      setAgentPerformance(
        (agentsWithStatsRes.data || []).map((a) => ({
          name: a.name,
          responseTime: (a.avg_response_time_ms || 0) / 1000,
        }))
      );

      // Generate sample weekly data (in production, query agent_analytics)
      const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
      setMessagesData(
        days.map((day) => ({
          day,
          received: Math.floor(Math.random() * 50) + 20,
          sent: Math.floor(Math.random() * 45) + 15,
        }))
      );
    } catch (err) {
      console.error("Error loading dashboard:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar dados do dashboard");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Agora";
    if (diffMins < 60) return `${diffMins} min`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return `${Math.floor(diffMins / 1440)}d`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-foreground mb-2">Não foi possível carregar o dashboard</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={loadDashboardData} variant="outline">
              Tentar novamente
            </Button>
            <Button onClick={() => window.location.reload()}>
              Recarregar página
            </Button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <motion.h1
            className="text-2xl font-bold text-foreground"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Dashboard
          </motion.h1>
          <motion.p
            className="text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            Visão geral dos seus agentes de IA
          </motion.p>
        </div>
        <Button>
          <Bot className="w-4 h-4" />
          Novo Agente
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Agentes Ativos"
          value={stats.activeAgents}
          icon={Bot}
          color="purple"
          trend={stats.totalAgents > 0 ? { value: Math.round((stats.activeAgents / stats.totalAgents) * 100), isPositive: true } : undefined}
          delay={0}
        />
        <KpiCard
          title="Conversas Hoje"
          value={stats.todayConversations}
          icon={MessageSquare}
          color="cyan"
          delay={0.1}
        />
        <KpiCard
          title="Total Conversas"
          value={stats.totalConversations}
          icon={Send}
          color="pink"
          delay={0.2}
        />
        <KpiCard
          title="Membros da Equipe"
          value={stats.teamMembers}
          icon={Users}
          color="green"
          delay={0.3}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages Chart */}
        <GlassCard className="p-6" glow="purple">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Mensagens por Dia
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={messagesData}>
                <defs>
                  <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EC4899" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EC4899" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="day" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(26, 26, 46, 0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#fff" }}
                />
                <Area
                  type="monotone"
                  dataKey="received"
                  stroke="#EC4899"
                  fillOpacity={1}
                  fill="url(#colorReceived)"
                  name="Recebidas"
                />
                <Area
                  type="monotone"
                  dataKey="sent"
                  stroke="#7C3AED"
                  fillOpacity={1}
                  fill="url(#colorSent)"
                  name="Enviadas"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Agent Performance */}
        <GlassCard className="p-6" glow="cyan">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Tempo de Resposta por Agente
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agentPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis type="number" stroke="#64748B" fontSize={12} unit="s" />
                <YAxis dataKey="name" type="category" stroke="#64748B" fontSize={12} width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(26, 26, 46, 0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`${value}s`, "Tempo médio"]}
                />
                <Bar
                  dataKey="responseTime"
                  fill="url(#barGradient)"
                  radius={[0, 8, 8, 0]}
                />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#06B6D4" />
                    <stop offset="100%" stopColor="#7C3AED" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Recent Conversations & Integrations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Conversations */}
        <GlassCard className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              Últimas Conversas
            </h3>
            <Button variant="ghost" size="sm" className="text-purple">
              Ver todas
              <ArrowUpRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="space-y-3">
            {recentConversations.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Nenhuma conversa recente</p>
            ) : (
              recentConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple to-pink flex items-center justify-center text-primary-foreground font-bold text-sm">
                    {(conversation.contact_name || conversation.phone || "?").charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">
                        {conversation.contact_name || conversation.phone}
                      </p>
                      {conversation.status === "active" && (
                        <span className="w-2 h-2 bg-success rounded-full" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conversation.phone}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(conversation.last_message_at)}
                    </p>
                    {conversation.agent?.name && (
                      <p className="text-xs text-purple mt-1">{conversation.agent.name}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        {/* Integration Status */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Integrações
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                  <span className="text-lg">📱</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">Z-API</p>
                  <p className="text-xs text-muted-foreground">WhatsApp</p>
                </div>
              </div>
              <StatusBadge status="active" pulse />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                  <span className="text-lg">⚡</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">N8N</p>
                  <p className="text-xs text-muted-foreground">Automação</p>
                </div>
              </div>
              <StatusBadge status="active" />
            </div>

            <Button variant="outline" className="w-full mt-4">
              Configurar Integrações
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
