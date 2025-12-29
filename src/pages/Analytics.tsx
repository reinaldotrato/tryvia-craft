import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Bot, TrendingUp, MessageSquare, Zap, Users, Download, Loader2 } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/GlassCard";
import { KpiCard } from "@/components/ui/KpiCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface AnalyticsData {
  totalConversations: number;
  totalMessages: number;
  tokensUsed: number;
  avgResponseTime: number;
  conversationsTrend: number;
  messagesTrend: number;
}

interface AgentMetric {
  id: string;
  name: string;
  conversations: number;
  messages: number;
  avgTime: string;
  transfers: number;
  successRate: string;
}

interface DailyData {
  date: string;
  conversations: number;
  messages: number;
}

interface SentimentData {
  name: string;
  value: number;
  color: string;
}

export default function Analytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("7d");
  const [selectedAgent, setSelectedAgent] = useState("all");
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [stats, setStats] = useState<AnalyticsData>({
    totalConversations: 0,
    totalMessages: 0,
    tokensUsed: 0,
    avgResponseTime: 0,
    conversationsTrend: 0,
    messagesTrend: 0,
  });
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [agentMetrics, setAgentMetrics] = useState<AgentMetric[]>([]);
  const [sentimentData, setSentimentData] = useState<SentimentData[]>([]);
  const [messagesPerAgent, setMessagesPerAgent] = useState<{ name: string; messages: number }[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [user, dateRange, selectedAgent]);

  const getDateRange = () => {
    const end = endOfDay(new Date());
    let start: Date;

    switch (dateRange) {
      case "today":
        start = startOfDay(new Date());
        break;
      case "7d":
        start = startOfDay(subDays(new Date(), 7));
        break;
      case "30d":
        start = startOfDay(subDays(new Date(), 30));
        break;
      default:
        start = startOfDay(subDays(new Date(), 7));
    }

    return { start, end };
  };

  const loadAnalytics = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Get tenant
      const { data: tenantUser } = await supabase
        .from("tenant_users")
        .select("tenant_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      if (!tenantUser) throw new Error("Tenant not found");

      const tenantId = tenantUser.tenant_id;
      const { start, end } = getDateRange();

      // Load agents for dropdown
      const { data: agentsData } = await supabase
        .from("agents")
        .select("id, name")
        .eq("tenant_id", tenantId);

      setAgents(agentsData || []);

      // Build query filters - use secure view (masks phone for non-admins)
      let conversationsQuery = supabase
        .from("conversations_secure")
        .select("id, created_at, status, sentiment, agent_id")
        .eq("tenant_id", tenantId)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      if (selectedAgent !== "all") {
        conversationsQuery = conversationsQuery.eq("agent_id", selectedAgent);
      }

      const { data: conversations } = await conversationsQuery;

      // Get analytics data
      let analyticsQuery = supabase
        .from("agent_analytics")
        .select("*")
        .eq("tenant_id", tenantId)
        .gte("date", format(start, "yyyy-MM-dd"))
        .lte("date", format(end, "yyyy-MM-dd"));

      if (selectedAgent !== "all") {
        analyticsQuery = analyticsQuery.eq("agent_id", selectedAgent);
      }

      const { data: analytics } = await analyticsQuery;

      // Calculate totals
      const totalConversations = conversations?.length || 0;
      let totalMessages = 0;
      let tokensUsed = 0;
      let totalResponseTime = 0;
      let responseTimeCount = 0;

      (analytics || []).forEach((a) => {
        totalMessages += (a.messages_sent || 0) + (a.messages_received || 0);
        tokensUsed += a.tokens_used || 0;
        if (a.avg_response_time_ms) {
          totalResponseTime += a.avg_response_time_ms;
          responseTimeCount++;
        }
      });

      const avgResponseTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;

      // Calculate sentiment distribution
      const sentiments = { positive: 0, neutral: 0, negative: 0 };
      (conversations || []).forEach((c) => {
        if (c.sentiment === "positive") sentiments.positive++;
        else if (c.sentiment === "negative") sentiments.negative++;
        else sentiments.neutral++;
      });

      const totalSentiment = sentiments.positive + sentiments.neutral + sentiments.negative || 1;
      setSentimentData([
        { name: "Positivo", value: Math.round((sentiments.positive / totalSentiment) * 100), color: "#10B981" },
        { name: "Neutro", value: Math.round((sentiments.neutral / totalSentiment) * 100), color: "#64748B" },
        { name: "Negativo", value: Math.round((sentiments.negative / totalSentiment) * 100), color: "#EF4444" },
      ]);

      // Daily data for chart
      const dailyMap = new Map<string, { conversations: number; messages: number }>();
      const days = dateRange === "today" ? 1 : dateRange === "7d" ? 7 : 30;

      for (let i = 0; i < days; i++) {
        const date = format(subDays(new Date(), days - 1 - i), "dd/MM");
        dailyMap.set(date, { conversations: 0, messages: 0 });
      }

      (conversations || []).forEach((c) => {
        const date = format(new Date(c.created_at), "dd/MM");
        const existing = dailyMap.get(date);
        if (existing) {
          existing.conversations++;
        }
      });

      (analytics || []).forEach((a) => {
        const date = format(new Date(a.date), "dd/MM");
        const existing = dailyMap.get(date);
        if (existing) {
          existing.messages += (a.messages_sent || 0) + (a.messages_received || 0);
        }
      });

      setDailyData(
        Array.from(dailyMap.entries()).map(([date, data]) => ({
          date,
          ...data,
        }))
      );

      // Agent metrics - only show selected agent or all
      const agentStatsMap = new Map<string, AgentMetric>();
      const agentsToProcess = selectedAgent !== "all" 
        ? (agentsData || []).filter(a => a.id === selectedAgent)
        : (agentsData || []);
      
      agentsToProcess.forEach((agent) => {
        agentStatsMap.set(agent.id, {
          id: agent.id,
          name: agent.name,
          conversations: 0,
          messages: 0,
          avgTime: "0s",
          transfers: 0,
          successRate: "0%",
        });
      });

      (conversations || []).forEach((c) => {
        if (c.agent_id && agentStatsMap.has(c.agent_id)) {
          const stats = agentStatsMap.get(c.agent_id)!;
          stats.conversations++;
        }
      });

      (analytics || []).forEach((a) => {
        if (agentStatsMap.has(a.agent_id)) {
          const stats = agentStatsMap.get(a.agent_id)!;
          stats.messages += (a.messages_sent || 0) + (a.messages_received || 0);
          stats.transfers += a.transfers_to_human || 0;
          if (a.avg_response_time_ms) {
            stats.avgTime = `${(a.avg_response_time_ms / 1000).toFixed(1)}s`;
          }
        }
      });

      const agentMetricsArray = Array.from(agentStatsMap.values());
      setAgentMetrics(agentMetricsArray);
      setMessagesPerAgent(
        agentMetricsArray
          .filter((a) => a.messages > 0)
          .map((a) => ({ name: a.name, messages: a.messages }))
      );

      setStats({
        totalConversations,
        totalMessages,
        tokensUsed,
        avgResponseTime,
        conversationsTrend: 12, // Would calculate from previous period
        messagesTrend: 8,
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

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
            Analytics
          </motion.h1>
          <motion.p
            className="text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            Métricas e desempenho dos seus agentes
          </motion.p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger className="w-[180px]">
              <Bot className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Agentes</SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total de Conversas"
          value={stats.totalConversations.toLocaleString()}
          icon={MessageSquare}
          color="purple"
          trend={{ value: stats.conversationsTrend, isPositive: true }}
          delay={0}
        />
        <KpiCard
          title="Total de Mensagens"
          value={stats.totalMessages.toLocaleString()}
          icon={Zap}
          color="pink"
          trend={{ value: stats.messagesTrend, isPositive: true }}
          delay={0.1}
        />
        <KpiCard
          title="Tokens Utilizados"
          value={stats.tokensUsed.toLocaleString()}
          icon={TrendingUp}
          color="cyan"
          delay={0.2}
        />
        <KpiCard
          title="Tempo Médio Resposta"
          value={`${(stats.avgResponseTime / 1000).toFixed(1)}s`}
          icon={Users}
          color="green"
          delay={0.3}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversations Over Time */}
        <GlassCard className="p-6" glow="purple">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Conversas ao Longo do Tempo
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="conversations"
                  stroke="#7C3AED"
                  strokeWidth={2}
                  dot={{ fill: "#7C3AED", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#EC4899" }}
                  name="Conversas"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Messages Per Agent */}
        <GlassCard className="p-6" glow="cyan">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Mensagens por Agente
          </h3>
          <div className="h-64">
            {messagesPerAgent.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={messagesPerAgent}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                  <YAxis stroke="#64748B" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar
                    dataKey="messages"
                    fill="url(#colorGradient)"
                    radius={[8, 8, 0, 0]}
                    name="Mensagens"
                  />
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7C3AED" />
                      <stop offset="100%" stopColor="#EC4899" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sentiment Distribution */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Distribuição de Sentimento
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {sentimentData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-muted-foreground">
                  {item.name} ({item.value}%)
                </span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Agent Performance Table */}
        <GlassCard className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Métricas por Agente
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Agente
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Conversas
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Mensagens
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Tempo Médio
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Transferências
                  </th>
                </tr>
              </thead>
              <tbody>
                {agentMetrics.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      Nenhum agente encontrado
                    </td>
                  </tr>
                ) : (
                  agentMetrics.map((metric) => (
                    <tr
                      key={metric.id}
                      className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple to-pink flex items-center justify-center">
                            <Bot className="w-4 h-4 text-primary-foreground" />
                          </div>
                          <span className="font-medium text-foreground">{metric.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-foreground">{metric.conversations}</td>
                      <td className="py-3 px-4 text-right text-foreground">{metric.messages}</td>
                      <td className="py-3 px-4 text-right text-foreground">{metric.avgTime}</td>
                      <td className="py-3 px-4 text-right text-foreground">{metric.transfers}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
