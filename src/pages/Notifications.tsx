import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, Check, CheckCheck, Trash2, Filter, Mail, UserPlus, MessageSquare, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  metadata: unknown;
  created_at: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  invite_accepted: <UserPlus className="w-5 h-5 text-green-400" />,
  new_message: <MessageSquare className="w-5 h-5 text-blue-400" />,
  alert: <AlertCircle className="w-5 h-5 text-yellow-400" />,
  info: <Bell className="w-5 h-5 text-purple-400" />,
};

const typeLabels: Record<string, string> = {
  invite_accepted: "Convite Aceito",
  new_message: "Nova Mensagem",
  alert: "Alerta",
  info: "Informação",
};

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('notifications-page')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchNotifications() {
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Erro ao carregar notificações",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setNotifications(data || []);
    }
    setLoading(false);
  }

  async function markAsRead(id: string) {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    }
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .in("id", unreadIds);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast({
        title: "Todas marcadas como lidas",
        description: `${unreadIds.length} notificações marcadas.`,
      });
    }
  }

  const filteredNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.read)
      : notifications;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notificações</h1>
          <p className="text-muted-foreground mt-1">
            Central de notificações e alertas
          </p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <CheckCheck className="w-4 h-4 mr-2" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-purple" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{notifications.length}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pink/20 flex items-center justify-center">
              <Mail className="w-5 h-5 text-pink" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{unreadCount}</p>
              <p className="text-sm text-muted-foreground">Não lidas</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {notifications.length - unreadCount}
              </p>
              <p className="text-sm text-muted-foreground">Lidas</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Filters */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")}>
        <TabsList>
          <TabsTrigger value="all">
            Todas ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread">
            Não lidas ({unreadCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          {loading ? (
            <GlassCard className="p-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple"></div>
              </div>
            </GlassCard>
          ) : filteredNotifications.length === 0 ? (
            <GlassCard className="p-12">
              <div className="text-center">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Nenhuma notificação
                </h3>
                <p className="text-muted-foreground">
                  {filter === "unread"
                    ? "Você está em dia! Todas as notificações foram lidas."
                    : "Quando houver novidades, você verá aqui."}
                </p>
              </div>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GlassCard
                    className={`p-4 transition-all hover:border-purple/30 cursor-pointer ${
                      !notification.read ? "border-l-4 border-l-purple" : ""
                    }`}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-background/50 flex items-center justify-center flex-shrink-0">
                        {typeIcons[notification.type] || typeIcons.info}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-foreground">
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <Badge variant="secondary" className="bg-purple/20 text-purple text-xs">
                              Nova
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {typeLabels[notification.type] || "Informação"}
                          </Badge>
                        </div>
                      </div>
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
