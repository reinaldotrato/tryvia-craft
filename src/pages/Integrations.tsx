import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, Eye, EyeOff, CheckCircle, XCircle, Loader2, ExternalLink, AlertTriangle, RefreshCw, Trash2, Wifi, WifiOff } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { supabase } from "@/integrations/supabase/client";
import { PermissionGate } from "@/components/PermissionGate";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import zapiLogo from "@/assets/zapi-logo.jpeg";
import n8nLogo from "@/assets/n8n-logo.png";

interface IntegrationConfig {
  zapi_instance_id: string;
  zapi_token: string;
  zapi_webhook_url: string;
  n8n_api_key: string;
  n8n_webhook_base: string;
}

interface IntegrationLog {
  id: string;
  event_type: string;
  status: "success" | "error" | "warning";
  message: string;
  created_at: string;
}

interface Agent {
  id: string;
  name: string;
  webhook_url: string | null;
}

export default function Integrations() {
  const { user } = useAuth();
  const { tenantId, isAdmin } = usePermissions();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [config, setConfig] = useState<IntegrationConfig>({
    zapi_instance_id: "",
    zapi_token: "",
    zapi_webhook_url: "",
    n8n_api_key: "",
    n8n_webhook_base: "",
  });
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentWebhooks, setAgentWebhooks] = useState<Record<string, string>>({});
  const [savingAgentId, setSavingAgentId] = useState<string | null>(null);
  const [refreshingLogs, setRefreshingLogs] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    if (tenantId) {
      loadConfig();
      loadLogs();
      loadAgents();
    }
  }, [tenantId]);

  const loadConfig = async () => {
    if (!tenantId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("zapi_instance_id, zapi_token, zapi_webhook_url, n8n_api_key, n8n_webhook_base")
        .eq("id", tenantId)
        .single();

      if (error) throw error;

      setConfig({
        zapi_instance_id: data?.zapi_instance_id || "",
        zapi_token: data?.zapi_token || "",
        zapi_webhook_url: data?.zapi_webhook_url || "",
        n8n_api_key: data?.n8n_api_key || "",
        n8n_webhook_base: data?.n8n_webhook_base || "",
      });
    } catch (error) {
      console.error("Error loading config:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from("integration_logs")
        .select("id, event_type, status, message, created_at")
        .eq("tenant_id", tenantId)
        .eq("integration_type", "zapi")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setLogs((data as IntegrationLog[]) || []);
    } catch (error) {
      console.error("Error loading logs:", error);
    }
  };

  const loadAgents = async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from("agents")
        .select("id, name, webhook_url")
        .eq("tenant_id", tenantId)
        .order("name");

      if (error) throw error;
      
      const agentsData = (data as Agent[]) || [];
      setAgents(agentsData);
      
      const webhooks: Record<string, string> = {};
      agentsData.forEach(agent => {
        webhooks[agent.id] = agent.webhook_url || "";
      });
      setAgentWebhooks(webhooks);
    } catch (error) {
      console.error("Error loading agents:", error);
    }
  };

  const handleSave = async () => {
    if (!tenantId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("tenants")
        .update({
          zapi_instance_id: config.zapi_instance_id || null,
          zapi_token: config.zapi_token || null,
          zapi_webhook_url: config.zapi_webhook_url || null,
          n8n_api_key: config.n8n_api_key || null,
          n8n_webhook_base: config.n8n_webhook_base || null,
        })
        .eq("id", tenantId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso",
      });
    } catch (error) {
      console.error("Error saving config:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAgentWebhook = async (agentId: string) => {
    setSavingAgentId(agentId);
    try {
      const { error } = await supabase
        .from("agents")
        .update({ webhook_url: agentWebhooks[agentId] || null })
        .eq("id", agentId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Webhook do agente salvo",
      });
    } catch (error) {
      console.error("Error saving agent webhook:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o webhook",
        variant: "destructive",
      });
    } finally {
      setSavingAgentId(null);
    }
  };

  const handleClearLogs = async () => {
    if (!tenantId) return;

    try {
      const { error } = await supabase
        .from("integration_logs")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("integration_type", "zapi");

      if (error) throw error;

      setLogs([]);
      toast({
        title: "Sucesso",
        description: "Logs limpos com sucesso",
      });
    } catch (error) {
      console.error("Error clearing logs:", error);
      toast({
        title: "Erro",
        description: "Não foi possível limpar os logs",
        variant: "destructive",
      });
    }
  };

  const handleRefreshLogs = async () => {
    setRefreshingLogs(true);
    await loadLogs();
    setRefreshingLogs(false);
  };

  const handleTestConnection = async () => {
    if (!config.zapi_instance_id || !config.zapi_token) {
      toast({
        title: "Erro",
        description: "Preencha o Instance ID e Token para testar",
        variant: "destructive",
      });
      return;
    }

    setTestingConnection(true);
    setConnectionStatus("idle");

    try {
      // Z-API status endpoint
      const response = await fetch(
        `https://api.z-api.io/instances/${config.zapi_instance_id}/token/${config.zapi_token}/status`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();
      console.log("Z-API status response:", data);

      if (response.ok && (data.connected === true || data.status === "connected")) {
        setConnectionStatus("success");
        toast({
          title: "Conexão OK",
          description: "Instância Z-API conectada ao WhatsApp",
        });
      } else if (response.ok && data.connected === false) {
        setConnectionStatus("error");
        toast({
          title: "Instância desconectada",
          description: data.reason || "A instância não está conectada ao WhatsApp",
          variant: "destructive",
        });
      } else {
        setConnectionStatus("error");
        toast({
          title: "Erro na conexão",
          description: data.message || data.error || "Não foi possível verificar o status",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error testing connection:", error);
      setConnectionStatus("error");
      toast({
        title: "Erro",
        description: "Não foi possível conectar à API. Verifique as credenciais.",
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const toggleSecret = (field: string) => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const updateConfig = (field: keyof IntegrationConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-success" />;
      case "error":
        return <XCircle className="w-4 h-4 text-destructive" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      default:
        return null;
    }
  };

  const isZapiConfigured = config.zapi_instance_id && config.zapi_token;
  const isN8nConfigured = config.n8n_api_key || config.n8n_webhook_base;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple" />
      </div>
    );
  }

  return (
    <PermissionGate permission="settings.edit" showDenied>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <motion.h1
              className="text-2xl font-bold text-foreground"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Integrações
            </motion.h1>
            <motion.p
              className="text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              Configure suas integrações com Z-API e N8N
            </motion.p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </Button>
        </div>

        {/* Z-API Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center">
                <img src={zapiLogo} alt="Z-API" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-foreground">Z-API</h3>
                  {isZapiConfigured ? (
                    <CheckCircle className="w-4 h-4 text-success" />
                  ) : (
                    <XCircle className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Integração com WhatsApp</p>
              </div>
              <a
                href="https://z-api.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple hover:text-purple/80 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Credentials */}
              <div className="space-y-4">
                <h4 className="font-medium text-foreground">Credenciais</h4>
                <div className="space-y-2">
                  <Label htmlFor="zapi_instance_id">Instance ID</Label>
                  <Input
                    id="zapi_instance_id"
                    placeholder="Seu Instance ID"
                    value={config.zapi_instance_id}
                    onChange={(e) => updateConfig("zapi_instance_id", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zapi_token">Token</Label>
                  <div className="relative">
                    <Input
                      id="zapi_token"
                      type={showSecrets.zapi_token ? "text" : "password"}
                      placeholder="Seu Token Z-API"
                      value={config.zapi_token}
                      onChange={(e) => updateConfig("zapi_token", e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleSecret("zapi_token")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSecrets.zapi_token ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zapi_webhook_url">Webhook URL</Label>
                  <Input
                    id="zapi_webhook_url"
                    placeholder="https://seu-webhook.com/zapi"
                    value={config.zapi_webhook_url}
                    onChange={(e) => updateConfig("zapi_webhook_url", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    URL para receber notificações do Z-API
                  </p>
                </div>

                {/* Test Connection Button */}
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testingConnection || !config.zapi_instance_id || !config.zapi_token}
                  className={`w-full ${
                    connectionStatus === "success" 
                      ? "border-success text-success" 
                      : connectionStatus === "error" 
                        ? "border-destructive text-destructive" 
                        : ""
                  }`}
                >
                  {testingConnection ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : connectionStatus === "success" ? (
                    <Wifi className="w-4 h-4 mr-2" />
                  ) : connectionStatus === "error" ? (
                    <WifiOff className="w-4 h-4 mr-2" />
                  ) : (
                    <Wifi className="w-4 h-4 mr-2" />
                  )}
                  {testingConnection 
                    ? "Testando..." 
                    : connectionStatus === "success" 
                      ? "Conectado" 
                      : connectionStatus === "error" 
                        ? "Desconectado" 
                        : "Testar Conexão"}
                </Button>
              </div>

              {/* Connection Logs */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-foreground">Status de Conexão</h4>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRefreshLogs}
                      disabled={refreshingLogs}
                    >
                      <RefreshCw className={`w-4 h-4 ${refreshingLogs ? "animate-spin" : ""}`} />
                    </Button>
                    {isAdmin && logs.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearLogs}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 max-h-[280px] overflow-y-auto">
                  {logs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum log de conexão disponível
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {logs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-start gap-3 text-sm border-b border-border/50 pb-3 last:border-0 last:pb-0"
                        >
                          {getStatusIcon(log.status)}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {log.event_type}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {log.message}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* N8N Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-lg bg-[#EA4B71]/20 flex items-center justify-center p-2">
                <img src={n8nLogo} alt="N8N" className="w-full h-full object-contain" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-foreground">N8N</h3>
                  {isN8nConfigured ? (
                    <CheckCircle className="w-4 h-4 text-success" />
                  ) : (
                    <XCircle className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Automação de workflows</p>
              </div>
              <a
                href="https://n8n.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple hover:text-purple/80 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Global Credentials */}
              <div className="space-y-4">
                <h4 className="font-medium text-foreground">Credenciais Globais</h4>
                <div className="space-y-2">
                  <Label htmlFor="n8n_api_key">API Key</Label>
                  <div className="relative">
                    <Input
                      id="n8n_api_key"
                      type={showSecrets.n8n_api_key ? "text" : "password"}
                      placeholder="Sua API Key N8N"
                      value={config.n8n_api_key}
                      onChange={(e) => updateConfig("n8n_api_key", e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleSecret("n8n_api_key")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSecrets.n8n_api_key ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="n8n_webhook_base">Webhook Base URL</Label>
                  <Input
                    id="n8n_webhook_base"
                    placeholder="https://seu-n8n.com/webhook"
                    value={config.n8n_webhook_base}
                    onChange={(e) => updateConfig("n8n_webhook_base", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    URL base para webhooks do N8N
                  </p>
                </div>
              </div>

              {/* Webhooks per Agent */}
              <div className="space-y-4">
                <h4 className="font-medium text-foreground">Webhooks por Agente</h4>
                {agents.length === 0 ? (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground text-center">
                      Nenhum agente cadastrado
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2">
                    {agents.map((agent) => (
                      <div key={agent.id} className="space-y-2">
                        <Label className="text-sm">{agent.name}</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="https://n8n.com/webhook/agent-id"
                            value={agentWebhooks[agent.id] || ""}
                            onChange={(e) =>
                              setAgentWebhooks((prev) => ({
                                ...prev,
                                [agent.id]: e.target.value,
                              }))
                            }
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSaveAgentWebhook(agent.id)}
                            disabled={savingAgentId === agent.id}
                          >
                            {savingAgentId === agent.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Como configurar</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h4 className="font-medium text-foreground mb-2">Z-API</h4>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Acesse <a href="https://z-api.io" target="_blank" rel="noopener noreferrer" className="text-purple hover:underline">z-api.io</a> e crie uma conta</li>
                  <li>Crie uma nova instância para seu WhatsApp</li>
                  <li>Copie o Instance ID e Token da instância</li>
                  <li>Cole as credenciais nos campos acima</li>
                  <li>Configure o Webhook URL para receber mensagens</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">N8N</h4>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Acesse <a href="https://n8n.io" target="_blank" rel="noopener noreferrer" className="text-purple hover:underline">n8n.io</a> e configure seu servidor</li>
                  <li>Gere uma API Key nas configurações</li>
                  <li>Cole a API Key no campo acima</li>
                  <li>Configure webhooks individuais para cada agente</li>
                  <li>Use o webhook específico do agente no workflow N8N</li>
                </ol>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </PermissionGate>
  );
}
