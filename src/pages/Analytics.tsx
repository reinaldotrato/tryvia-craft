import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Bot, TrendingUp, MessageSquare, Zap, Users, Download } from "lucide-react";
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

const conversationsData = [
  { date: "01/12", conversations: 45 },
  { date: "02/12", conversations: 52 },
  { date: "03/12", conversations: 48 },
  { date: "04/12", conversations: 61 },
  { date: "05/12", conversations: 55 },
  { date: "06/12", conversations: 67 },
  { date: "07/12", conversations: 72 },
];

const messagesPerAgent = [
  { name: "Vendas IA", messages: 1240 },
  { name: "Suporte 24h", messages: 956 },
  { name: "Agendamento", messages: 420 },
];

const sentimentData = [
  { name: "Positivo", value: 65, color: "#10B981" },
  { name: "Neutro", value: 25, color: "#64748B" },
  { name: "Negativo", value: 10, color: "#EF4444" },
];

const peakHours = [
  { hour: "09:00", count: 45 },
  { hour: "10:00", count: 62 },
  { hour: "11:00", count: 78 },
  { hour: "14:00", count: 85 },
  { hour: "15:00", count: 72 },
];

const agentMetrics = [
  {
    agent: "Vendas IA",
    conversations: 125,
    messages: 1240,
    avgTime: "1.2s",
    transfers: 8,
    successRate: "94%",
  },
  {
    agent: "Suporte 24h",
    conversations: 89,
    messages: 956,
    avgTime: "0.8s",
    transfers: 3,
    successRate: "97%",
  },
  {
    agent: "Agendamento",
    conversations: 45,
    messages: 420,
    avgTime: "1.5s",
    transfers: 2,
    successRate: "91%",
  },
];

export default function Analytics() {
  const [dateRange, setDateRange] = useState("7d");
  const [selectedAgent, setSelectedAgent] = useState("all");

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
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger className="w-[180px]">
              <Bot className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Agentes</SelectItem>
              <SelectItem value="vendas">Vendas IA</SelectItem>
              <SelectItem value="suporte">Suporte 24h</SelectItem>
              <SelectItem value="agendamento">Agendamento</SelectItem>
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
          value="259"
          icon={MessageSquare}
          color="purple"
          trend={{ value: 15, isPositive: true }}
          delay={0}
        />
        <KpiCard
          title="Total de Mensagens"
          value="2.6k"
          icon={Zap}
          color="pink"
          trend={{ value: 8, isPositive: true }}
          delay={0.1}
        />
        <KpiCard
          title="Tokens Utilizados"
          value="125k"
          icon={TrendingUp}
          color="cyan"
          trend={{ value: 12, isPositive: false }}
          delay={0.2}
        />
        <KpiCard
          title="Taxa de Resolução"
          value="94%"
          icon={Users}
          color="green"
          trend={{ value: 3, isPositive: true }}
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
              <LineChart data={conversationsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(26, 26, 46, 0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
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
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={messagesPerAgent}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(26, 26, 46, 0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                  }}
                />
                <Bar
                  dataKey="messages"
                  fill="url(#colorGradient)"
                  radius={[8, 8, 0, 0]}
                />
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C3AED" />
                    <stop offset="100%" stopColor="#EC4899" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
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
                    backgroundColor: "rgba(26, 26, 46, 0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
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

        {/* Peak Hours */}
        <GlassCard className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Horários de Pico
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHours} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis type="number" stroke="#64748B" fontSize={12} />
                <YAxis dataKey="hour" type="category" stroke="#64748B" fontSize={12} width={60} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(26, 26, 46, 0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#06B6D4"
                  radius={[0, 8, 8, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Detailed Table */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Métricas por Agente
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
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
                <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">
                  Taxa Sucesso
                </th>
              </tr>
            </thead>
            <tbody>
              {agentMetrics.map((metric) => (
                <tr
                  key={metric.agent}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple to-pink flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary-foreground" />
                      </div>
                      <span className="font-medium text-foreground">{metric.agent}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right text-foreground">{metric.conversations}</td>
                  <td className="py-3 px-4 text-right text-foreground">{metric.messages}</td>
                  <td className="py-3 px-4 text-right text-foreground">{metric.avgTime}</td>
                  <td className="py-3 px-4 text-right text-foreground">{metric.transfers}</td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-success font-semibold">{metric.successRate}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
