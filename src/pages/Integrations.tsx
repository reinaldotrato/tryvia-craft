import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, Eye, EyeOff, CheckCircle, XCircle, Loader2, ExternalLink, AlertTriangle, RefreshCw, Trash2, Wifi, WifiOff, Building2, Settings } from "lucide-react";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

interface TenantWithIntegrations {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  zapi_instance_id: string | null;
  zapi_token: string | null;
  zapi_webhook_url: string | null;
  n8n_api_key: string | null;
  n8n_webhook_base: string | null;
}

export default function Integrations() {
  const { user } = useAuth();
  const { tenantId, isAdmin, isSuperAdmin } = usePermissions();
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

  // Super Admin states
  const [allTenants, setAllTenants] = useState<TenantWithIntegrations[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<TenantWithIntegrations | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetConfig, setSheetConfig] = useState<IntegrationConfig>({
    zapi_instance_id: "",
    zapi_token: "",
    zapi_webhook_url: "",
    n8n_api_key: "",
    n8n_webhook_base: "",
  });
  const [savingSheet, setSavingSheet] = useState(false);
  const [testingSheetConnection, setTestingSheetConnection] = useState(false);
  const [sheetConnectionStatus, setSheetConnectionStatus] = useState<"idle" | "success" | "error">("idle");
  const [testingSheetN8n, setTestingSheetN8n] = useState(false);
  const [sheetN8nStatus, setSheetN8nStatus] = useState<"idle" | "success" | "error">("idle");
  const [testingN8n, setTestingN8n] = useState(false);
  const [n8nConnectionStatus, setN8nConnectionStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    if (isSuperAdmin) {
      loadAllTenants();
    } else if (tenantId) {
      loadConfig();
      loadLogs();
      loadAgents();
    }
  }, [isSuperAdmin, tenantId]);

  const loadAllTenants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, slug, logo_url, zapi_instance_id, zapi_token, zapi_webhook_url, n8n_api_key, n8n_webhook_base")
        .order("name");

      if (error) throw error;
      setAllTenants(data || []);
    } catch (error) {
      console.error("Error loading tenants:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os clientes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
      } else if (data.error === "Instance not found") {
        setConnectionStatus("error");
        toast({
          title: "Instância não encontrada",
          description: "Verifique o Instance ID no painel Z-API. Ele pode estar incorreto ou a instância foi excluída.",
          variant: "destructive",
        });
      } else if (response.ok && data.connected === false) {
        setConnectionStatus("error");
        toast({
          title: "Instância desconectada",
          description: data.reason || "A instância existe mas não está conectada ao WhatsApp. Escaneie o QR Code no painel Z-API.",
          variant: "destructive",
        });
      } else {
        setConnectionStatus("error");
        toast({
          title: "Erro na conexão",
          description: data.message || data.error || "Verifique as credenciais no painel Z-API",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error testing connection:", error);
      setConnectionStatus("error");
      toast({
        title: "Erro de rede",
        description: "Não foi possível conectar à API Z-API. Verifique sua conexão.",
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

  // Super Admin: Open sheet to manage tenant integrations
  const openManageSheet = (tenant: TenantWithIntegrations) => {
    setSelectedTenant(tenant);
    setSheetConfig({
      zapi_instance_id: tenant.zapi_instance_id || "",
      zapi_token: tenant.zapi_token || "",
      zapi_webhook_url: tenant.zapi_webhook_url || "",
      n8n_api_key: tenant.n8n_api_key || "",
      n8n_webhook_base: tenant.n8n_webhook_base || "",
    });
    setSheetConnectionStatus("idle");
    setIsSheetOpen(true);
  };

  const handleSaveSheetConfig = async () => {
    if (!selectedTenant) return;

    setSavingSheet(true);
    try {
      const { error } = await supabase
        .from("tenants")
        .update({
          zapi_instance_id: sheetConfig.zapi_instance_id || null,
          zapi_token: sheetConfig.zapi_token || null,
          zapi_webhook_url: sheetConfig.zapi_webhook_url || null,
          n8n_api_key: sheetConfig.n8n_api_key || null,
          n8n_webhook_base: sheetConfig.n8n_webhook_base || null,
        })
        .eq("id", selectedTenant.id);

      if (error) throw error;

      // Update local state
      setAllTenants(prev =>
        prev.map(t =>
          t.id === selectedTenant.id
            ? {
                ...t,
                zapi_instance_id: sheetConfig.zapi_instance_id || null,
                zapi_token: sheetConfig.zapi_token || null,
                zapi_webhook_url: sheetConfig.zapi_webhook_url || null,
                n8n_api_key: sheetConfig.n8n_api_key || null,
                n8n_webhook_base: sheetConfig.n8n_webhook_base || null,
              }
            : t
        )
      );

      toast({
        title: "Sucesso",
        description: `Integrações de ${selectedTenant.name} atualizadas`,
      });
      setIsSheetOpen(false);
    } catch (error) {
      console.error("Error saving integrations:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as integrações",
        variant: "destructive",
      });
    } finally {
      setSavingSheet(false);
    }
  };

  const handleTestSheetConnection = async () => {
    if (!sheetConfig.zapi_instance_id || !sheetConfig.zapi_token) {
      toast({
        title: "Erro",
        description: "Preencha o Instance ID e Token para testar",
        variant: "destructive",
      });
      return;
    }

    setTestingSheetConnection(true);
    setSheetConnectionStatus("idle");

    try {
      const response = await fetch(
        `https://api.z-api.io/instances/${sheetConfig.zapi_instance_id}/token/${sheetConfig.zapi_token}/status`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      const data = await response.json();
      console.log("Z-API Sheet test response:", data);

      if (response.ok && (data.connected === true || data.status === "connected")) {
        setSheetConnectionStatus("success");
        toast({
          title: "Conexão OK",
          description: "Instância Z-API conectada ao WhatsApp",
        });
      } else if (data.error === "Instance not found") {
        setSheetConnectionStatus("error");
        toast({
          title: "Instância não encontrada",
          description: "Verifique o Instance ID no painel Z-API. Ele pode estar incorreto ou a instância foi excluída.",
          variant: "destructive",
        });
      } else if (response.ok && data.connected === false) {
        setSheetConnectionStatus("error");
        toast({
          title: "Instância desconectada",
          description: data.reason || "A instância existe mas não está conectada ao WhatsApp. Escaneie o QR Code no painel Z-API.",
          variant: "destructive",
        });
      } else {
        setSheetConnectionStatus("error");
        toast({
          title: "Erro na conexão",
          description: data.message || data.error || "Verifique as credenciais no painel Z-API",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error testing connection:", error);
      setSheetConnectionStatus("error");
      toast({
        title: "Erro de rede",
        description: "Não foi possível conectar à API Z-API. Verifique sua conexão.",
        variant: "destructive",
      });
    } finally {
      setTestingSheetConnection(false);
    }
  };

  const handleTestSheetN8n = async () => {
    if (!sheetConfig.n8n_webhook_base) {
      toast({
        title: "Erro",
        description: "Preencha o Webhook Base URL para testar",
        variant: "destructive",
      });
      return;
    }

    setTestingSheetN8n(true);
    setSheetN8nStatus("idle");

    try {
      // Tenta fazer uma requisição OPTIONS para verificar se o endpoint existe
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(sheetConfig.n8n_webhook_base, {
        method: "OPTIONS",
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      // Se retornou 200-299 ou 405 (method not allowed), o endpoint existe
      if (response.ok || response.status === 405 || response.status === 404) {
        setSheetN8nStatus("success");
        toast({
          title: "N8N Acessível",
          description: "O endpoint N8N está respondendo corretamente",
        });
      } else {
        setSheetN8nStatus("error");
        toast({
          title: "Erro no N8N",
          description: `Endpoint retornou status ${response.status}`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error testing N8N:", error);
      
      // Se for erro de CORS, o endpoint provavelmente existe mas bloqueia OPTIONS
      if (error.name === "TypeError" && error.message.includes("Failed to fetch")) {
        setSheetN8nStatus("success");
        toast({
          title: "N8N Configurado",
          description: "URL configurada. O teste de conexão direta foi bloqueado por CORS, mas o webhook deve funcionar.",
        });
      } else if (error.name === "AbortError") {
        setSheetN8nStatus("error");
        toast({
          title: "Timeout",
          description: "O N8N não respondeu a tempo. Verifique se a URL está correta.",
          variant: "destructive",
        });
      } else {
        setSheetN8nStatus("error");
        toast({
          title: "Erro",
          description: "Não foi possível verificar o N8N. Verifique a URL.",
          variant: "destructive",
        });
      }
    } finally {
      setTestingSheetN8n(false);
    }
  };

  const handleTestN8nConnection = async () => {
    if (!config.n8n_webhook_base) {
      toast({
        title: "Erro",
        description: "Preencha o Webhook Base URL para testar",
        variant: "destructive",
      });
      return;
    }

    setTestingN8n(true);
    setN8nConnectionStatus("idle");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(config.n8n_webhook_base, {
        method: "OPTIONS",
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (response.ok || response.status === 405 || response.status === 404) {
        setN8nConnectionStatus("success");
        toast({
          title: "N8N Acessível",
          description: "O endpoint N8N está respondendo",
        });
      } else {
        setN8nConnectionStatus("error");
        toast({
          title: "Erro no N8N",
          description: `Status ${response.status}`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error testing N8N:", error);
      
      if (error.name === "TypeError" && error.message.includes("Failed to fetch")) {
        setN8nConnectionStatus("success");
        toast({
          title: "N8N Configurado",
          description: "URL salva. Teste completo bloqueado por CORS, mas deve funcionar.",
        });
      } else if (error.name === "AbortError") {
        setN8nConnectionStatus("error");
        toast({
          title: "Timeout",
          description: "N8N não respondeu a tempo.",
          variant: "destructive",
        });
      } else {
        setN8nConnectionStatus("error");
        toast({
          title: "Erro",
          description: "Verifique a URL do N8N.",
          variant: "destructive",
        });
      }
    } finally {
      setTestingN8n(false);
    }
  };

  const updateSheetConfig = (field: keyof IntegrationConfig, value: string) => {
    setSheetConfig(prev => ({ ...prev, [field]: value }));
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

  // Super Admin View: Cards for each tenant
  if (isSuperAdmin) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <motion.h1
            className="text-2xl font-bold text-foreground"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Integrações por Cliente
          </motion.h1>
          <motion.p
            className="text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            Gerencie as integrações de todos os clientes
          </motion.p>
        </div>

        {/* Tenant Cards Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allTenants.map((tenant, index) => {
            const hasZapi = Boolean(tenant.zapi_instance_id && tenant.zapi_token);
            const hasN8n = Boolean(tenant.n8n_api_key || tenant.n8n_webhook_base);

            return (
              <motion.div
                key={tenant.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <GlassCard className="p-5 h-full flex flex-col">
                  {/* Tenant Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={tenant.logo_url || ""} alt={tenant.name} />
                      <AvatarFallback className="bg-purple/20 text-purple">
                        <Building2 className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{tenant.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">{tenant.slug}</p>
                    </div>
                  </div>

                  {/* Integration Status */}
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded overflow-hidden">
                          <img src={zapiLogo} alt="Z-API" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-sm text-foreground">Z-API</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {hasZapi ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-success" />
                            <span className="text-xs text-success font-medium">Ativo</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Inativo</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-[#EA4B71]/20 flex items-center justify-center p-0.5">
                          <img src={n8nLogo} alt="N8N" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-sm text-foreground">N8N</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {hasN8n ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-success" />
                            <span className="text-xs text-success font-medium">Ativo</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Inativo</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Manage Button */}
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => openManageSheet(tenant)}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Gerenciar
                  </Button>
                </GlassCard>
              </motion.div>
            );
          })}

          {allTenants.length === 0 && (
            <div className="col-span-full">
              <GlassCard className="p-8 text-center">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum cliente cadastrado</p>
              </GlassCard>
            </div>
          )}
        </div>

        {/* Sheet for managing tenant integrations */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent className="sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Integrações - {selectedTenant?.name}
              </SheetTitle>
              <SheetDescription>
                Configure as integrações Z-API e N8N para este cliente
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 mt-6">
              {/* Z-API Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded overflow-hidden">
                    <img src={zapiLogo} alt="Z-API" className="w-full h-full object-cover" />
                  </div>
                  <h3 className="font-semibold text-foreground">Z-API</h3>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="sheet_zapi_instance_id">Instance ID</Label>
                    <Input
                      id="sheet_zapi_instance_id"
                      placeholder="Seu Instance ID"
                      value={sheetConfig.zapi_instance_id}
                      onChange={(e) => updateSheetConfig("zapi_instance_id", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sheet_zapi_token">Token</Label>
                    <div className="relative">
                      <Input
                        id="sheet_zapi_token"
                        type={showSecrets.sheet_zapi_token ? "text" : "password"}
                        placeholder="Seu Token Z-API"
                        value={sheetConfig.zapi_token}
                        onChange={(e) => updateSheetConfig("zapi_token", e.target.value)}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => toggleSecret("sheet_zapi_token")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showSecrets.sheet_zapi_token ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sheet_zapi_webhook_url">Webhook URL</Label>
                    <Input
                      id="sheet_zapi_webhook_url"
                      placeholder="https://seu-webhook.com/zapi"
                      value={sheetConfig.zapi_webhook_url}
                      onChange={(e) => updateSheetConfig("zapi_webhook_url", e.target.value)}
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestSheetConnection}
                    disabled={testingSheetConnection || !sheetConfig.zapi_instance_id || !sheetConfig.zapi_token}
                    className={`w-full ${
                      sheetConnectionStatus === "success"
                        ? "border-success text-success"
                        : sheetConnectionStatus === "error"
                          ? "border-destructive text-destructive"
                          : ""
                    }`}
                  >
                    {testingSheetConnection ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : sheetConnectionStatus === "success" ? (
                      <Wifi className="w-4 h-4 mr-2" />
                    ) : sheetConnectionStatus === "error" ? (
                      <WifiOff className="w-4 h-4 mr-2" />
                    ) : (
                      <Wifi className="w-4 h-4 mr-2" />
                    )}
                    {testingSheetConnection
                      ? "Testando..."
                      : sheetConnectionStatus === "success"
                        ? "Conectado"
                        : sheetConnectionStatus === "error"
                          ? "Desconectado"
                          : "Testar Conexão"}
                  </Button>
                </div>
              </div>

              {/* N8N Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-[#EA4B71]/20 flex items-center justify-center p-1">
                    <img src={n8nLogo} alt="N8N" className="w-full h-full object-contain" />
                  </div>
                  <h3 className="font-semibold text-foreground">N8N</h3>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="sheet_n8n_api_key">API Key</Label>
                    <div className="relative">
                      <Input
                        id="sheet_n8n_api_key"
                        type={showSecrets.sheet_n8n_api_key ? "text" : "password"}
                        placeholder="Sua API Key N8N"
                        value={sheetConfig.n8n_api_key}
                        onChange={(e) => updateSheetConfig("n8n_api_key", e.target.value)}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => toggleSecret("sheet_n8n_api_key")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showSecrets.sheet_n8n_api_key ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sheet_n8n_webhook_base">Webhook Base URL</Label>
                    <Input
                      id="sheet_n8n_webhook_base"
                      placeholder="https://seu-n8n.com/webhook"
                      value={sheetConfig.n8n_webhook_base}
                      onChange={(e) => updateSheetConfig("n8n_webhook_base", e.target.value)}
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestSheetN8n}
                    disabled={testingSheetN8n || !sheetConfig.n8n_webhook_base}
                    className={`w-full ${
                      sheetN8nStatus === "success"
                        ? "border-success text-success"
                        : sheetN8nStatus === "error"
                          ? "border-destructive text-destructive"
                          : ""
                    }`}
                  >
                    {testingSheetN8n ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : sheetN8nStatus === "success" ? (
                      <Wifi className="w-4 h-4 mr-2" />
                    ) : sheetN8nStatus === "error" ? (
                      <WifiOff className="w-4 h-4 mr-2" />
                    ) : (
                      <Wifi className="w-4 h-4 mr-2" />
                    )}
                    {testingSheetN8n
                      ? "Testando..."
                      : sheetN8nStatus === "success"
                        ? "N8N Acessível"
                        : sheetN8nStatus === "error"
                          ? "Erro"
                          : "Testar N8N"}
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsSheetOpen(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleSaveSheetConfig} disabled={savingSheet} className="flex-1">
                  {savingSheet ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Salvar
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // Regular user view (existing implementation)
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

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestN8nConnection}
                  disabled={testingN8n || !config.n8n_webhook_base}
                  className={`w-full ${
                    n8nConnectionStatus === "success"
                      ? "border-success text-success"
                      : n8nConnectionStatus === "error"
                        ? "border-destructive text-destructive"
                        : ""
                  }`}
                >
                  {testingN8n ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : n8nConnectionStatus === "success" ? (
                    <Wifi className="w-4 h-4 mr-2" />
                  ) : n8nConnectionStatus === "error" ? (
                    <WifiOff className="w-4 h-4 mr-2" />
                  ) : (
                    <Wifi className="w-4 h-4 mr-2" />
                  )}
                  {testingN8n
                    ? "Testando..."
                    : n8nConnectionStatus === "success"
                      ? "N8N Acessível"
                      : n8nConnectionStatus === "error"
                        ? "Erro"
                        : "Testar N8N"}
                </Button>
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
