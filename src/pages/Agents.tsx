import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  Bot,
  MoreVertical,
  MessageSquare,
  Zap,
  Pause,
  Copy,
  Trash2,
  Search,
  SlidersHorizontal,
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

const mockAgents = [
  {
    id: "1",
    name: "Vendas IA",
    description: "Agente especializado em qualificação de leads e vendas de produtos digitais com abordagem consultiva.",
    model: "GPT-4o",
    status: "active" as const,
    conversations: 125,
    messages: 1240,
    avatarColor: "from-purple to-pink",
  },
  {
    id: "2",
    name: "Suporte 24h",
    description: "Atendimento automatizado para dúvidas frequentes e suporte técnico de primeiro nível.",
    model: "GPT-4o Mini",
    status: "active" as const,
    conversations: 89,
    messages: 956,
    avatarColor: "from-cyan to-blue-500",
  },
  {
    id: "3",
    name: "Agendamento",
    description: "Assistente para agendamento de consultas e reuniões integrado ao Google Calendar.",
    model: "Claude 3 Haiku",
    status: "paused" as const,
    conversations: 45,
    messages: 320,
    avatarColor: "from-pink to-orange-500",
  },
  {
    id: "4",
    name: "Onboarding",
    description: "Guia novos usuários através do processo de cadastro e primeiros passos na plataforma.",
    model: "GPT-4o Mini",
    status: "draft" as const,
    conversations: 0,
    messages: 0,
    avatarColor: "from-green-500 to-cyan",
  },
];

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

export default function Agents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredAgents = mockAgents.filter((agent) => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || agent.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
        <Button asChild>
          <Link to="/agents/new">
            <Plus className="w-4 h-4" />
            Novo Agente
          </Link>
        </Button>
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
          {filteredAgents.map((agent) => (
            <motion.div key={agent.id} variants={item}>
              <GlassCard className="p-6 h-full flex flex-col" glow="purple">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${agent.avatarColor} flex items-center justify-center`}
                    >
                      <Bot className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{agent.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-muted-foreground">
                        {agent.model}
                      </span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/agents/${agent.id}/edit`}>
                          <Zap className="w-4 h-4 mr-2" />
                          Editar
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Pause className="w-4 h-4 mr-2" />
                        Pausar
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-error focus:text-error">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 flex-1 mb-4">
                  {agent.description}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      {agent.conversations}
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="w-4 h-4" />
                      {agent.messages >= 1000
                        ? `${(agent.messages / 1000).toFixed(1)}k`
                        : agent.messages}
                    </span>
                  </div>
                  <StatusBadge status={agent.status} />
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
          <Button asChild>
            <Link to="/agents/new">
              <Plus className="w-4 h-4" />
              Criar Primeiro Agente
            </Link>
          </Button>
        </motion.div>
      )}
    </div>
  );
}
