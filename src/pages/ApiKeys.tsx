import { useState, useEffect } from "react";
import { Plus, Copy, Trash2, Eye, EyeOff, KeyRound, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PermissionGate } from "@/components/PermissionGate";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/contexts/PermissionsContext";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  status: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  permissions: string[];
}

export default function ApiKeys() {
  const { toast } = useToast();
  const { effectiveTenantId } = usePermissions();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (effectiveTenantId) {
      loadApiKeys();
    }
  }, [effectiveTenantId]);

  const loadApiKeys = async () => {
    if (!effectiveTenantId) return;

    try {
      const { data, error } = await supabase
        .from("api_keys_secure")
        .select("*")
        .eq("tenant_id", effectiveTenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error) {
      console.error("Error loading API keys:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as API Keys.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "sk_live_";
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  const hashKey = async (key: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim() || !effectiveTenantId) return;

    setSaving(true);
    try {
      const fullKey = generateApiKey();
      const keyHash = await hashKey(fullKey);
      const keyPrefix = fullKey.substring(0, 12);

      const { error } = await supabase.from("api_keys").insert({
        tenant_id: effectiveTenantId,
        name: newKeyName.trim(),
        key_hash: keyHash,
        key_prefix: keyPrefix,
        permissions: ["read", "write"],
        status: "active",
      });

      if (error) throw error;

      setCreatedKey(fullKey);
      toast({
        title: "API Key criada",
        description: "Copie a chave agora. Ela não será exibida novamente.",
      });

      await loadApiKeys();
    } catch (error) {
      console.error("Error creating API key:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a API Key.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKey = async () => {
    if (!selectedKey) return;

    try {
      const { error } = await supabase
        .from("api_keys")
        .delete()
        .eq("id", selectedKey.id);

      if (error) throw error;

      toast({
        title: "API Key revogada",
        description: "A chave foi revogada com sucesso.",
      });

      setDeleteDialogOpen(false);
      setSelectedKey(null);
      await loadApiKeys();
    } catch (error) {
      console.error("Error deleting API key:", error);
      toast({
        title: "Erro",
        description: "Não foi possível revogar a API Key.",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "A chave foi copiada para a área de transferência.",
    });
  };

  const closeCreateDialog = () => {
    setCreateDialogOpen(false);
    setNewKeyName("");
    setCreatedKey(null);
    setShowKey(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple/30 border-t-purple rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">APIs Keys</h1>
          <p className="text-muted-foreground">
            Gerencie as chaves de API para integrações externas
          </p>
        </div>
        <PermissionGate permission="api_keys.create">
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-gradient-to-r from-pink to-purple hover:opacity-90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova API Key
          </Button>
        </PermissionGate>
      </div>

      {/* API Keys Grid */}
      {apiKeys.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <KeyRound className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Nenhuma API Key
          </h3>
          <p className="text-muted-foreground mb-4">
            Crie sua primeira API Key para começar a integrar com sistemas externos.
          </p>
          <PermissionGate permission="api_keys.create">
            <Button
              onClick={() => setCreateDialogOpen(true)}
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar API Key
            </Button>
          </PermissionGate>
        </GlassCard>
      ) : (
        <div className="grid gap-4">
          {apiKeys.map((key) => (
            <GlassCard key={key.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-purple/20 flex items-center justify-center">
                    <KeyRound className="w-5 h-5 text-purple" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{key.name}</h3>
                      <StatusBadge
                        status={key.status === "active" ? "success" : "error"}
                        label={key.status === "active" ? "Ativa" : "Revogada"}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">
                      {key.key_prefix}...
                    </p>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Criada em {format(new Date(key.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      {key.last_used_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Último uso: {format(new Date(key.last_used_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <PermissionGate permission="api_keys.delete">
                  {key.status === "active" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-error border-error/30 hover:bg-error/10"
                      onClick={() => {
                        setSelectedKey(key);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Revogar
                    </Button>
                  )}
                </PermissionGate>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={closeCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {createdKey ? "API Key Criada" : "Nova API Key"}
            </DialogTitle>
            <DialogDescription>
              {createdKey
                ? "Copie a chave abaixo. Ela não será exibida novamente."
                : "Dê um nome para identificar esta API Key."}
            </DialogDescription>
          </DialogHeader>

          {createdKey ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm break-all">
                    {showKey ? createdKey : "••••••••••••••••••••••••••••••••"}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(createdKey)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-warning">
                ⚠️ Guarde esta chave em um local seguro. Ela não poderá ser visualizada novamente.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="keyName">Nome da API Key</Label>
                <Input
                  id="keyName"
                  placeholder="Ex: Integração CRM"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {createdKey ? (
              <Button onClick={closeCreateDialog}>Fechar</Button>
            ) : (
              <>
                <Button variant="outline" onClick={closeCreateDialog}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateKey}
                  disabled={!newKeyName.trim() || saving}
                  className="bg-gradient-to-r from-pink to-purple hover:opacity-90"
                >
                  {saving ? "Criando..." : "Criar API Key"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja revogar a API Key "{selectedKey?.name}"?
              Esta ação não pode ser desfeita e qualquer integração usando esta chave deixará de funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteKey}
              className="bg-error hover:bg-error/90"
            >
              Revogar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
