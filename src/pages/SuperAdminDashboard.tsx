import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Crown,
  Building2,
  Users,
  Bot,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Loader2,
  DollarSign,
  Activity,
  BarChart3,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { KpiCard } from "@/components/ui/KpiCard";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/contexts/PermissionsContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface TenantMetric {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  users: number;
  agents: number;
  conversations: number;
  messages: number;
}

interface GlobalMetrics {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  totalAgents: number;
  totalConversations: number;
  totalMessages: number;
}

const COLORS = ["#7c3aed", "#ec4899", "#06b6d4", "#22c55e", "#f59e0b"];

export default function SuperAdminDashboard() {
  const { toast } = useToast();
  const { isSuperAdmin, loading: permLoading } = usePermissions();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<GlobalMetrics>({
    totalTenants: 0,
    activeTenants: 0,
    totalUsers: 0,
    totalAgents: 0,
    totalConversations: 0,
    totalMessages: 0,
  });
  const [tenants, setTenants] = useState<TenantMetric[]>([]);
  const [planDistribution, setPlanDistribution] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    if (!permLoading && !isSuperAdmin) {
      toast({
        title: "Acesso negado",
        description: "Você precisa ser um Super Admin para acessar esta página.",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  }, [isSuperAdmin, permLoading, navigate, toast]);

  useEffect(() => {
    if (isSuperAdmin) {
      loadMetrics();
    }
  }, [isSuperAdmin]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      // Load all tenants
      const { data: tenantsData, error: tenantsError } = await supabase
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: false });

      if (tenantsError) throw tenantsError;

      // Calculate plan distribution
      const planCounts: Record<string, number> = {};
      tenantsData?.forEach((t) => {
        const plan = t.plan || "starter";
        planCounts[plan] = (planCounts[plan] || 0) + 1;
      });
      setPlanDistribution(
        Object.entries(planCounts).map(([name, value]) => ({ name, value }))
      );

      // Get counts for each tenant
      const tenantsWithCounts = await Promise.all(
        (tenantsData || []).slice(0, 10).map(async (tenant) => {
          const [usersRes, agentsRes, conversationsRes, messagesRes] = await Promise.all([
            supabase
              .from("tenant_users")
              .select("id", { count: "exact", head: true })
              .eq("tenant_id", tenant.id),
            supabase
              .from("agents")
              .select("id", { count: "exact", head: true })
              .eq("tenant_id", tenant.id),
            supabase
              .from("conversations")
              .select("id", { count: "exact", head: true })
              .eq("tenant_id", tenant.id),
            supabase
              .from("messages")
              .select("id", { count: "exact", head: true }),
          ]);

          return {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            plan: tenant.plan || "starter",
            status: tenant.status || "active",
            users: usersRes.count || 0,
            agents: agentsRes.count || 0,
            conversations: conversationsRes.count || 0,
            messages: messagesRes.count || 0,
          };
        })
      );

      setTenants(tenantsWithCounts);

      // Calculate global metrics
      const [totalUsersRes, totalAgentsRes, totalConversationsRes, totalMessagesRes] = await Promise.all([
        supabase.from("tenant_users").select("id", { count: "exact", head: true }),
        supabase.from("agents").select("id", { count: "exact", head: true }),
        supabase.from("conversations").select("id", { count: "exact", head: true }),
        supabase.from("messages").select("id", { count: "exact", head: true }),
      ]);

      setMetrics({
        totalTenants: tenantsData?.length || 0,
        activeTenants: tenantsData?.filter((t) => t.status === "active").length || 0,
        totalUsers: totalUsersRes.count || 0,
        totalAgents: totalAgentsRes.count || 0,
        totalConversations: totalConversationsRes.count || 0,
        totalMessages: totalMessagesRes.count || 0,
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao carregar métricas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (permLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink to-purple flex items-center justify-center">
          <Crown className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard Super Admin</h1>
          <p className="text-muted-foreground">Métricas globais da plataforma</p>
        </div>
        <Badge className="bg-pink/20 text-pink ml-auto">
          <Crown className="w-3 h-3 mr-1" />
          Super Admin
        </Badge>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          title="Total Clientes"
          value={metrics.totalTenants}
          icon={Building2}
          trend={{ value: 12, isPositive: true }}
        />
        <KpiCard
          title="Clientes Ativos"
          value={metrics.activeTenants}
          icon={Activity}
          trend={{ value: 5, isPositive: true }}
        />
        <KpiCard
          title="Total Usuários"
          value={metrics.totalUsers}
          icon={Users}
          trend={{ value: 8, isPositive: true }}
        />
        <KpiCard
          title="Total Agentes"
          value={metrics.totalAgents}
          icon={Bot}
        />
        <KpiCard
          title="Conversas"
          value={metrics.totalConversations}
          icon={MessageSquare}
        />
        <KpiCard
          title="Mensagens"
          value={metrics.totalMessages}
          icon={BarChart3}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Distribution */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Distribuição por Plano</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={planDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {planDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Top Tenants by Conversations */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Top Clientes por Conversas</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tenants.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="conversations" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Tenants Table */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Visão Geral dos Clientes</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Cliente</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Plano</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Usuários</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Agentes</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Conversas</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="border-b border-border/50 hover:bg-muted/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple to-pink flex items-center justify-center text-primary-foreground font-bold text-xs">
                        {tenant.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{tenant.name}</p>
                        <p className="text-xs text-muted-foreground">@{tenant.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      className={
                        tenant.plan === "enterprise"
                          ? "bg-pink/20 text-pink"
                          : tenant.plan === "pro"
                          ? "bg-purple/20 text-purple"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {tenant.plan}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      className={
                        tenant.status === "active"
                          ? "bg-success/20 text-success"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {tenant.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right text-foreground">{tenant.users}</td>
                  <td className="py-3 px-4 text-right text-foreground">{tenant.agents}</td>
                  <td className="py-3 px-4 text-right text-foreground">{tenant.conversations}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
