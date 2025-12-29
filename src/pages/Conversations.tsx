import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Phone,
  Bot,
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Tag,
  Power,
  ArrowRightLeft,
  XCircle,
  Loader2,
  MessageSquare,
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/contexts/PermissionsContext";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Conversation {
  id: string;
  phone: string;
  contact_name: string | null;
  contact_photo_url: string | null;
  status: string;
  sentiment: string | null;
  is_bot_active: boolean;
  last_message_at: string;
  agent_id: string | null;
  tags: string[] | null;
  agent?: { name: string } | null;
}

interface Message {
  id: string;
  content: string;
  role: string;
  is_from_bot: boolean;
  created_at: string;
  content_type: string;
  delivery_status: string;
}

export default function Conversations() {
  const { toast } = useToast();
  const { tenantId, hasPermission } = usePermissions();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const canViewPhone = hasPermission("conversations.view_phone");

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!tenantId) return;
    
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          id, phone, contact_name, contact_photo_url, status, sentiment,
          is_bot_active, last_message_at, agent_id, tags,
          agents:agent_id (name)
        `)
        .eq("tenant_id", tenantId)
        .order("last_message_at", { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((c) => ({
        ...c,
        agent: c.agents as { name: string } | null,
      }));

      setConversations(formatted);

      // Select first conversation if none selected
      if (!selectedConversation && formatted.length > 0) {
        setSelectedConversation(formatted[0]);
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao carregar conversas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [tenantId, selectedConversation, toast]);

  // Load messages for selected conversation
  const loadMessages = useCallback(async () => {
    if (!selectedConversation) return;

    setMessagesLoading(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedConversation.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao carregar mensagens.",
        variant: "destructive",
      });
    } finally {
      setMessagesLoading(false);
    }
  }, [selectedConversation, toast]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Real-time subscription for messages
  useEffect(() => {
    if (!selectedConversation) return;

    const channel = supabase
      .channel(`messages-${selectedConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;

    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: selectedConversation.id,
        content: messageInput,
        role: "assistant",
        is_from_bot: false,
      });

      if (error) throw error;

      // Update conversation last_message_at
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", selectedConversation.id);

      setMessageInput("");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao enviar mensagem.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const toggleBot = async () => {
    if (!selectedConversation) return;

    try {
      const newValue = !selectedConversation.is_bot_active;
      const { error } = await supabase
        .from("conversations")
        .update({ is_bot_active: newValue })
        .eq("id", selectedConversation.id);

      if (error) throw error;

      setSelectedConversation({ ...selectedConversation, is_bot_active: newValue });
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConversation.id ? { ...c, is_bot_active: newValue } : c
        )
      );

      toast({
        title: newValue ? "Bot ativado" : "Bot desativado",
        description: newValue ? "O bot voltou a responder." : "Você assumiu a conversa.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao alterar status do bot.",
        variant: "destructive",
      });
    }
  };

  const closeConversation = async () => {
    if (!selectedConversation) return;

    try {
      const { error } = await supabase
        .from("conversations")
        .update({ 
          status: "closed",
          closed_at: new Date().toISOString(),
        })
        .eq("id", selectedConversation.id);

      if (error) throw error;

      toast({
        title: "Conversa encerrada",
        description: "A conversa foi encerrada com sucesso.",
      });

      loadConversations();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao encerrar conversa.",
        variant: "destructive",
      });
    }
  };

  const maskPhone = (phone: string) => {
    if (canViewPhone) return phone;
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, "+$1 *****-$3");
  };

  const formatTime = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: false, locale: ptBR });
  };

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch =
      (conv.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      conv.phone.includes(searchQuery);
    const matchesStatus = statusFilter === "all" || conv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-7rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-purple" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-7rem)] text-center">
        <MessageSquare className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Nenhuma conversa</h2>
        <p className="text-muted-foreground max-w-md">
          As conversas aparecerão aqui quando seus agentes começarem a interagir com os clientes via WhatsApp.
        </p>
      </div>
    );
  }

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
                  selectedConversation?.id === conv.id
                    ? "bg-purple/10 border-l-2 border-purple"
                    : "hover:bg-white/5"
                )}
              >
                <div className="relative">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple to-pink flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                    {conv.contact_name?.charAt(0) || conv.phone.slice(-2)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground truncate">
                      {conv.contact_name || maskPhone(conv.phone)}
                    </p>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatTime(conv.last_message_at)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {maskPhone(conv.phone)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-purple">{conv.agent?.name || "Sem agente"}</span>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                    <StatusBadge status={conv.status as any} className="scale-75 origin-left" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </GlassCard>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-4 flex items-center justify-between border-b border-white/10 bg-background/50 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple to-pink flex items-center justify-center text-primary-foreground font-bold text-sm">
                  {selectedConversation.contact_name?.charAt(0) || selectedConversation.phone.slice(-2)}
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {selectedConversation.contact_name || maskPhone(selectedConversation.phone)}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {maskPhone(selectedConversation.phone)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedConversation.status as any} />
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-purple" />
                </div>
              ) : (
                <div className="space-y-4 max-w-3xl mx-auto">
                  {messages.map((msg) => (
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
                          <span className="text-xs text-foreground/60">
                            {new Date(msg.created_at).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {msg.role === "assistant" && msg.is_from_bot && (
                            <Bot className="w-3 h-3 text-foreground/60" />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
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
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                  className="flex-1"
                />
                <Button size="icon" onClick={handleSendMessage} disabled={sending} className="shrink-0">
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Selecione uma conversa
          </div>
        )}
      </div>

      {/* Contact Details */}
      {selectedConversation && (
        <GlassCard className="w-[280px] flex flex-col shrink-0 rounded-none border-t-0 border-r-0 border-b-0 p-4 space-y-6">
          {/* Contact Info */}
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple to-pink flex items-center justify-center text-primary-foreground font-bold text-2xl mx-auto mb-3">
              {selectedConversation.contact_name?.charAt(0) || selectedConversation.phone.slice(-2)}
            </div>
            <h3 className="font-semibold text-foreground">
              {selectedConversation.contact_name || "Contato"}
            </h3>
            <p className="text-sm text-muted-foreground">{maskPhone(selectedConversation.phone)}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 rounded-xl bg-white/5">
              <p className="text-2xl font-bold text-foreground">{messages.length}</p>
              <p className="text-xs text-muted-foreground">Mensagens</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/5">
              <p className="text-2xl font-bold text-foreground">
                {formatTime(selectedConversation.last_message_at)}
              </p>
              <p className="text-xs text-muted-foreground">Última msg</p>
            </div>
          </div>

          {/* Tags */}
          {selectedConversation.tags && selectedConversation.tags.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Tag className="w-4 h-4" />
                <span>Tags</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedConversation.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-xs rounded-full bg-purple/20 text-purple"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Agent */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bot className="w-4 h-4" />
              <span>Agente Atual</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/5">
              <span className="text-sm font-medium text-foreground">
                {selectedConversation.agent?.name || "Sem agente"}
              </span>
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
            <Switch
              checked={selectedConversation.is_bot_active}
              onCheckedChange={toggleBot}
            />
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t border-white/10">
            <Button variant="outline" className="w-full justify-start">
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Transferir
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start text-error hover:text-error"
              onClick={closeConversation}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Encerrar
            </Button>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
