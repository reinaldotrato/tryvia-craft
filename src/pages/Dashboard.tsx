import { motion } from "framer-motion";
import { Bot, MessageSquare, Send, CheckCircle, ArrowUpRight, Clock } from "lucide-react";
import { KpiCard } from "@/components/ui/KpiCard";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
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

const messagesData = [
  { day: "Seg", received: 45, sent: 38 },
  { day: "Ter", received: 52, sent: 48 },
  { day: "Qua", received: 68, sent: 62 },
  { day: "Qui", received: 54, sent: 51 },
  { day: "Sex", received: 82, sent: 75 },
  { day: "Sáb", received: 34, sent: 30 },
  { day: "Dom", received: 28, sent: 25 },
];

const agentPerformance = [
  { name: "Vendas IA", responseTime: 1.2 },
  { name: "Suporte 24h", responseTime: 0.8 },
  { name: "Agendamento", responseTime: 1.5 },
];

const recentConversations = [
  {
    id: 1,
    name: "Maria Silva",
    phone: "+55 91 9****-1234",
    agent: "Vendas IA",
    lastMessage: "Obrigado pelas informações! Vou pensar e retorno.",
    time: "5 min",
    status: "active" as const,
    unread: true,
  },
  {
    id: 2,
    name: "João Santos",
    phone: "+55 91 9****-5678",
    agent: "Suporte 24h",
    lastMessage: "Consegui resolver com as instruções. Muito obrigado!",
    time: "12 min",
    status: "active" as const,
    unread: false,
  },
  {
    id: 3,
    name: "Ana Costa",
    phone: "+55 91 9****-9012",
    agent: "Agendamento",
    lastMessage: "Perfeito, confirmado para sexta às 14h",
    time: "25 min",
    status: "active" as const,
    unread: false,
  },
];

export default function Dashboard() {
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
          value={3}
          icon={Bot}
          color="purple"
          trend={{ value: 50, isPositive: true }}
          delay={0}
        />
        <KpiCard
          title="Conversas Hoje"
          value={47}
          icon={MessageSquare}
          color="cyan"
          trend={{ value: 12, isPositive: true }}
          delay={0.1}
        />
        <KpiCard
          title="Mensagens 24h"
          value="1.2k"
          icon={Send}
          color="pink"
          trend={{ value: 8, isPositive: true }}
          delay={0.2}
        />
        <KpiCard
          title="Taxa de Resolução"
          value="94%"
          icon={CheckCircle}
          color="green"
          trend={{ value: 3, isPositive: true }}
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
            {recentConversations.map((conversation) => (
              <div
                key={conversation.id}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple to-pink flex items-center justify-center text-primary-foreground font-bold text-sm">
                  {conversation.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{conversation.name}</p>
                    {conversation.unread && (
                      <span className="w-2 h-2 bg-pink rounded-full" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {conversation.lastMessage}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {conversation.time}
                  </p>
                  <p className="text-xs text-purple mt-1">{conversation.agent}</p>
                </div>
              </div>
            ))}
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
