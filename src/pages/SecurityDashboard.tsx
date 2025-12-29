import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";
import { KpiCard } from "@/components/ui/KpiCard";
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Users, 
  Eye,
  Trash2,
  Edit,
  Plus,
  Clock,
  TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";
import { format, subDays, startOfDay, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  LineChart,
  Line,
  Legend
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface ActivityLog {
  id: string;
  action: string;
  entity_type: string | null;
  user_id: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface UserActivity {
  user_id: string;
  user_name: string;
  action_count: number;
  last_action: string;
}

interface SuspiciousActivity {
  id: string;
  type: "high_volume" | "unusual_hour" | "mass_delete" | "rapid_changes";
  description: string;
  severity: "low" | "medium" | "high";
  user_id: string | null;
  user_name: string;
  timestamp: string;
}

const COLORS = ["hsl(262, 83%, 58%)", "hsl(330, 81%, 60%)", "hsl(189, 94%, 43%)", "hsl(160, 84%, 39%)"];

export default function SecurityDashboard() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, string>>({});
  const [metrics, setMetrics] = useState({
    totalActions: 0,
    activeUsers: 0,
    insertsToday: 0,
    deletesToday: 0,
  });
  const [actionsByType, setActionsByType] = useState<{ name: string; value: number }[]>([]);
  const [actionsByEntity, setActionsByEntity] = useState<{ name: string; value: number }[]>([]);
  const [activityTimeline, setActivityTimeline] = useState<{ date: string; actions: number }[]>([]);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [suspiciousActivities, setSuspiciousActivities] = useState<SuspiciousActivity[]>([]);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      // Load activity logs from secure view
      const { data: logsData, error: logsError } = await supabase
        .from("activity_logs_secure")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (logsError) throw logsError;

      const activityLogs = (logsData || []) as ActivityLog[];
      setLogs(activityLogs);

      // Load user profiles for names
      const userIds = [...new Set(activityLogs.map(l => l.user_id).filter(Boolean))] as string[];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        const profileMap: Record<string, string> = {};
        profiles?.forEach(p => {
          profileMap[p.id] = p.full_name || "Usuário";
        });
        setUserProfiles(profileMap);
      }

      // Calculate metrics
      const today = startOfDay(new Date());
      const todayLogs = activityLogs.filter(l => isAfter(new Date(l.created_at), today));
      
      setMetrics({
        totalActions: activityLogs.length,
        activeUsers: new Set(activityLogs.map(l => l.user_id).filter(Boolean)).size,
        insertsToday: todayLogs.filter(l => l.action === "insert").length,
        deletesToday: todayLogs.filter(l => l.action === "delete").length,
      });

      // Actions by type
      const actionCounts: Record<string, number> = {};
      activityLogs.forEach(l => {
        actionCounts[l.action] = (actionCounts[l.action] || 0) + 1;
      });
      setActionsByType(Object.entries(actionCounts).map(([name, value]) => ({ name, value })));

      // Actions by entity
      const entityCounts: Record<string, number> = {};
      activityLogs.forEach(l => {
        const entity = l.entity_type || "unknown";
        entityCounts[entity] = (entityCounts[entity] || 0) + 1;
      });
      setActionsByEntity(Object.entries(entityCounts).map(([name, value]) => ({ name, value })));

      // Activity timeline (last 7 days)
      const timeline: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const date = format(subDays(new Date(), i), "dd/MM");
        timeline[date] = 0;
      }
      activityLogs.forEach(l => {
        const date = format(new Date(l.created_at), "dd/MM");
        if (timeline[date] !== undefined) {
          timeline[date]++;
        }
      });
      setActivityTimeline(Object.entries(timeline).map(([date, actions]) => ({ date, actions })));

      // User activities
      const userActions: Record<string, { count: number; lastAction: string }> = {};
      activityLogs.forEach(l => {
        if (l.user_id) {
          if (!userActions[l.user_id]) {
            userActions[l.user_id] = { count: 0, lastAction: l.created_at };
          }
          userActions[l.user_id].count++;
        }
      });
      
      const userProfileMap = userProfiles;
      setUserActivities(
        Object.entries(userActions)
          .map(([user_id, data]) => ({
            user_id,
            user_name: userProfileMap[user_id] || "Usuário",
            action_count: data.count,
            last_action: data.lastAction,
          }))
          .sort((a, b) => b.action_count - a.action_count)
          .slice(0, 10)
      );

      // Detect suspicious activities
      detectSuspiciousActivities(activityLogs, userProfileMap);

    } catch (error) {
      console.error("Error loading security data:", error);
    } finally {
      setLoading(false);
    }
  };

  const detectSuspiciousActivities = (
    logs: ActivityLog[], 
    profiles: Record<string, string>
  ) => {
    const suspicious: SuspiciousActivity[] = [];

    // Group logs by user and hour
    const userHourlyActions: Record<string, Record<string, number>> = {};
    const userDeleteCounts: Record<string, number> = {};

    logs.forEach(log => {
      if (!log.user_id) return;

      const hour = format(new Date(log.created_at), "yyyy-MM-dd HH");
      
      if (!userHourlyActions[log.user_id]) {
        userHourlyActions[log.user_id] = {};
        userDeleteCounts[log.user_id] = 0;
      }
      
      userHourlyActions[log.user_id][hour] = (userHourlyActions[log.user_id][hour] || 0) + 1;
      
      if (log.action === "delete") {
        userDeleteCounts[log.user_id]++;
      }
    });

    // Check for high volume (>50 actions per hour)
    Object.entries(userHourlyActions).forEach(([userId, hours]) => {
      Object.entries(hours).forEach(([hour, count]) => {
        if (count > 50) {
          suspicious.push({
            id: `high_volume_${userId}_${hour}`,
            type: "high_volume",
            description: `${count} ações em uma hora`,
            severity: count > 100 ? "high" : "medium",
            user_id: userId,
            user_name: profiles[userId] || "Usuário",
            timestamp: hour,
          });
        }
      });
    });

    // Check for mass deletes (>10 deletes by same user)
    Object.entries(userDeleteCounts).forEach(([userId, count]) => {
      if (count > 10) {
        suspicious.push({
          id: `mass_delete_${userId}`,
          type: "mass_delete",
          description: `${count} exclusões realizadas`,
          severity: count > 20 ? "high" : "medium",
          user_id: userId,
          user_name: profiles[userId] || "Usuário",
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Check for unusual hours (actions between 2-6 AM)
    const unusualHourLogs = logs.filter(l => {
      const hour = new Date(l.created_at).getHours();
      return hour >= 2 && hour <= 6;
    });

    if (unusualHourLogs.length > 0) {
      const userUnusualActions: Record<string, number> = {};
      unusualHourLogs.forEach(l => {
        if (l.user_id) {
          userUnusualActions[l.user_id] = (userUnusualActions[l.user_id] || 0) + 1;
        }
      });

      Object.entries(userUnusualActions).forEach(([userId, count]) => {
        if (count > 5) {
          suspicious.push({
            id: `unusual_hour_${userId}`,
            type: "unusual_hour",
            description: `${count} ações em horário incomum (2h-6h)`,
            severity: "low",
            user_id: userId,
            user_name: profiles[userId] || "Usuário",
            timestamp: new Date().toISOString(),
          });
        }
      });
    }

    setSuspiciousActivities(suspicious.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    }));
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "insert": return <Plus className="w-4 h-4 text-success" />;
      case "update": return <Edit className="w-4 h-4 text-cyan" />;
      case "delete": return <Trash2 className="w-4 h-4 text-error" />;
      default: return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "bg-error/20 text-error border-error/30";
      case "medium": return "bg-warning/20 text-warning border-warning/30";
      case "low": return "bg-muted text-muted-foreground border-border";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-purple" />
          <h1 className="text-3xl font-bold text-foreground">Dashboard de Segurança</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="flex items-center gap-3"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="p-3 rounded-xl bg-purple/20">
          <Shield className="w-8 h-8 text-purple" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard de Segurança</h1>
          <p className="text-muted-foreground">
            Monitore atividades, acessos e alertas de segurança
          </p>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total de Ações"
          value={metrics.totalActions.toLocaleString()}
          icon={Activity}
          color="purple"
          delay={0.1}
        />
        <KpiCard
          title="Usuários Ativos"
          value={metrics.activeUsers}
          icon={Users}
          color="cyan"
          delay={0.2}
        />
        <KpiCard
          title="Criações Hoje"
          value={metrics.insertsToday}
          icon={Plus}
          color="green"
          delay={0.3}
        />
        <KpiCard
          title="Exclusões Hoje"
          value={metrics.deletesToday}
          icon={Trash2}
          color="pink"
          delay={0.4}
        />
      </div>

      {/* Suspicious Activities Alert */}
      {suspiciousActivities.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <GlassCard className="p-6 border-warning/30">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-warning" />
              <h2 className="text-xl font-semibold text-foreground">
                Alertas de Atividade Suspeita ({suspiciousActivities.length})
              </h2>
            </div>
            <ScrollArea className="h-48">
              <div className="space-y-3">
                {suspiciousActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={getSeverityColor(activity.severity)}>
                        {activity.severity === "high" ? "Alto" : activity.severity === "medium" ? "Médio" : "Baixo"}
                      </Badge>
                      <div>
                        <p className="font-medium text-foreground">{activity.description}</p>
                        <p className="text-sm text-muted-foreground">
                          Usuário: {activity.user_name}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {activity.type === "high_volume" && "Alto volume"}
                      {activity.type === "mass_delete" && "Exclusões em massa"}
                      {activity.type === "unusual_hour" && "Horário incomum"}
                      {activity.type === "rapid_changes" && "Mudanças rápidas"}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </GlassCard>
        </motion.div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-5 h-5 text-cyan" />
              <h2 className="text-lg font-semibold text-foreground">
                Atividade (Últimos 7 dias)
              </h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="actions"
                    stroke="hsl(189, 94%, 43%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(189, 94%, 43%)" }}
                    name="Ações"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </motion.div>

        {/* Actions by Type */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-5 h-5 text-purple" />
              <h2 className="text-lg font-semibold text-foreground">
                Ações por Tipo
              </h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={actionsByType}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {actionsByType.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actions by Entity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-5 h-5 text-pink" />
              <h2 className="text-lg font-semibold text-foreground">
                Ações por Entidade
              </h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={actionsByEntity} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(330, 81%, 60%)" radius={[0, 4, 4, 0]} name="Ações" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </motion.div>

        {/* Top Users */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-5 h-5 text-green-500" />
              <h2 className="text-lg font-semibold text-foreground">
                Usuários Mais Ativos
              </h2>
            </div>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {userActivities.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma atividade registrada
                  </p>
                ) : (
                  userActivities.map((user, index) => (
                    <div
                      key={user.user_id}
                      className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple/20 flex items-center justify-center text-purple font-semibold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{user.user_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Última ação: {format(new Date(user.last_action), "dd/MM HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-purple/20 text-purple">
                        {user.action_count} ações
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </GlassCard>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-5 h-5 text-cyan" />
            <h2 className="text-lg font-semibold text-foreground">
              Atividade Recente
            </h2>
          </div>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {logs.slice(0, 20).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-background/50 border border-border"
                >
                  {getActionIcon(log.action)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {log.action.toUpperCase()} em {log.entity_type || "desconhecido"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.user_id ? userProfiles[log.user_id] || "Usuário" : "Sistema"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </GlassCard>
      </motion.div>
    </div>
  );
}
