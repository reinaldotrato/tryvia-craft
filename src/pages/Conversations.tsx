import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Phone,
  Bot,
  Clock,
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  User,
  Tag,
  Power,
  ArrowRightLeft,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const mockConversations = [
  {
    id: "1",
    name: "Maria Silva",
    phone: "+55 91 98765-1234",
    agent: "Vendas IA",
    lastMessage: "Obrigado pelas informações! Vou pensar e retorno.",
    time: "5 min",
    status: "active" as const,
    unread: true,
    photo: null,
  },
  {
    id: "2",
    name: "João Santos",
    phone: "+55 91 98765-5678",
    agent: "Suporte 24h",
    lastMessage: "Consegui resolver com as instruções. Muito obrigado!",
    time: "12 min",
    status: "active" as const,
    unread: false,
    photo: null,
  },
  {
    id: "3",
    name: "Ana Costa",
    phone: "+55 91 98765-9012",
    agent: "Agendamento",
    lastMessage: "Perfeito, confirmado para sexta às 14h",
    time: "25 min",
    status: "waiting" as const,
    unread: false,
    photo: null,
  },
  {
    id: "4",
    name: "Pedro Lima",
    phone: "+55 91 98765-3456",
    agent: "Vendas IA",
    lastMessage: "Qual o prazo de entrega?",
    time: "1h",
    status: "active" as const,
    unread: true,
    photo: null,
  },
];

const mockMessages = [
  {
    id: "1",
    role: "user" as const,
    content: "Olá, gostaria de saber mais sobre o produto X",
    time: "14:30",
    status: "read",
  },
  {
    id: "2",
    role: "assistant" as const,
    content:
      "Olá Maria! 👋 Fico feliz em ajudar! O Produto X é nossa solução mais completa para automação de marketing. Ele inclui:\n\n• Gestão de campanhas\n• Análise de dados\n• Integração com WhatsApp\n• Relatórios automatizados\n\nQual dessas funcionalidades te interessa mais?",
    time: "14:30",
    status: "read",
    isBot: true,
  },
  {
    id: "3",
    role: "user" as const,
    content: "Integração com WhatsApp parece interessante. Como funciona?",
    time: "14:32",
    status: "read",
  },
  {
    id: "4",
    role: "assistant" as const,
    content:
      "Excelente escolha! 🚀 Nossa integração com WhatsApp permite:\n\n1. **Mensagens automáticas** - Responda clientes 24/7\n2. **Segmentação** - Envie mensagens personalizadas\n3. **Relatórios** - Acompanhe métricas em tempo real\n\nPosso agendar uma demonstração gratuita para você ver na prática?",
    time: "14:33",
    status: "read",
    isBot: true,
  },
  {
    id: "5",
    role: "user" as const,
    content: "Obrigado pelas informações! Vou pensar e retorno.",
    time: "14:35",
    status: "delivered",
  },
];

export default function Conversations() {
  const [selectedConversation, setSelectedConversation] = useState(mockConversations[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [messageInput, setMessageInput] = useState("");
  const [botActive, setBotActive] = useState(true);

  const filteredConversations = mockConversations.filter((conv) => {
    const matchesSearch =
      conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.phone.includes(searchQuery);
    const matchesStatus = statusFilter === "all" || conv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4 -m-6">
      {/* Conversations List */}
      <GlassCard className="w-[340px] flex flex-col shrink-0 rounded-none border-t-0 border-l-0 border-b-0">
        {/* Search Header */}
        <div className="p-4 border-b border-white/10 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="active">Ativas</SelectItem>
              <SelectItem value="waiting">Aguardando</SelectItem>
              <SelectItem value="transferred">Transferidas</SelectItem>
              <SelectItem value="closed">Fechadas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Conversations */}
        <ScrollArea className="flex-1">
          <div className="divide-y divide-white/5">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={cn(
                  "w-full flex items-start gap-3 p-4 text-left transition-colors",
                  selectedConversation.id === conv.id
                    ? "bg-purple/10 border-l-2 border-purple"
                    : "hover:bg-white/5"
                )}
              >
                <div className="relative">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple to-pink flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                    {conv.name.charAt(0)}
                  </div>
                  {conv.unread && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-pink rounded-full border-2 border-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground truncate">{conv.name}</p>
                    <span className="text-xs text-muted-foreground shrink-0">{conv.time}</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-purple">{conv.agent}</span>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                    <StatusBadge status={conv.status} className="scale-75 origin-left" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </GlassCard>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/10 bg-background/50 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple to-pink flex items-center justify-center text-primary-foreground font-bold text-sm">
              {selectedConversation.name.charAt(0)}
            </div>
            <div>
              <p className="font-medium text-foreground">{selectedConversation.name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {selectedConversation.phone}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={selectedConversation.status} />
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 max-w-3xl mx-auto">
            {mockMessages.map((msg) => (
              <motion.div
                key={msg.id}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-start" : "justify-end"
                )}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-3",
                    msg.role === "user"
                      ? "bg-white/10 rounded-bl-sm"
                      : "bg-gradient-to-br from-purple to-purple-dark rounded-br-sm"
                  )}
                >
                  <p className="text-sm text-foreground whitespace-pre-wrap">{msg.content}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-xs text-foreground/60">{msg.time}</span>
                    {msg.role === "assistant" && msg.isBot && (
                      <Bot className="w-3 h-3 text-foreground/60" />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t border-white/10 bg-background/50 backdrop-blur-xl">
          <div className="flex items-end gap-2 max-w-3xl mx-auto">
            <Button variant="ghost" size="icon" className="shrink-0">
              <Paperclip className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="shrink-0">
              <Smile className="w-5 h-5" />
            </Button>
            <Input
              placeholder="Digite sua mensagem..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              className="flex-1"
            />
            <Button size="icon" className="shrink-0">
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Contact Details */}
      <GlassCard className="w-[280px] flex flex-col shrink-0 rounded-none border-t-0 border-r-0 border-b-0 p-4 space-y-6">
        {/* Contact Info */}
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple to-pink flex items-center justify-center text-primary-foreground font-bold text-2xl mx-auto mb-3">
            {selectedConversation.name.charAt(0)}
          </div>
          <h3 className="font-semibold text-foreground">{selectedConversation.name}</h3>
          <p className="text-sm text-muted-foreground">{selectedConversation.phone}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 rounded-xl bg-white/5">
            <p className="text-2xl font-bold text-foreground">12</p>
            <p className="text-xs text-muted-foreground">Conversas</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-white/5">
            <p className="text-2xl font-bold text-foreground">3d</p>
            <p className="text-xs text-muted-foreground">Primeira msg</p>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Tag className="w-4 h-4" />
            <span>Tags</span>
          </div>
          <div className="flex flex-wrap gap-1">
            <span className="px-2 py-1 text-xs rounded-full bg-purple/20 text-purple">Lead</span>
            <span className="px-2 py-1 text-xs rounded-full bg-cyan/20 text-cyan">WhatsApp</span>
          </div>
        </div>

        {/* Agent */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Bot className="w-4 h-4" />
            <span>Agente Atual</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-xl bg-white/5">
            <span className="text-sm font-medium text-foreground">{selectedConversation.agent}</span>
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              Trocar
            </Button>
          </div>
        </div>

        {/* Bot Toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
          <div className="flex items-center gap-2">
            <Power className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">Bot Ativo</span>
          </div>
          <Switch checked={botActive} onCheckedChange={setBotActive} />
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-4 border-t border-white/10">
          <Button variant="outline" className="w-full justify-start">
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            Transferir
          </Button>
          <Button variant="outline" className="w-full justify-start text-error hover:text-error">
            <XCircle className="w-4 h-4 mr-2" />
            Encerrar
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
