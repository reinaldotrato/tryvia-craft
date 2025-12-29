import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, Eye, EyeOff, CheckCircle, XCircle, Loader2, ExternalLink } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { supabase } from "@/integrations/supabase/client";
import { PermissionGate } from "@/components/PermissionGate";
import zapiLogo from "@/assets/zapi-logo.jpeg";
import n8nLogo from "@/assets/n8n-logo.png";

interface IntegrationConfig {
  zapi_instance_id: string;
  zapi_token: string;
  zapi_webhook_url: string;
  n8n_api_key: string;
  n8n_webhook_base: string;
}

export default function Integrations() {
  const { user } = useAuth();
  const { tenantId } = usePermissions();
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

  useEffect(() => {
    loadConfig();
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

  const toggleSecret = (field: string) => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const updateConfig = (field: keyof IntegrationConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
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

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Z-API Configuration */}
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

              <div className="space-y-4">
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
              </div>
            </GlassCard>
          </motion.div>

          {/* N8N Configuration */}
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

              <div className="space-y-4">
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
            </GlassCard>
          </motion.div>
        </div>

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
                  <li>Configure a URL base dos webhooks</li>
                  <li>Crie workflows para processar mensagens</li>
                </ol>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </PermissionGate>
  );
}
