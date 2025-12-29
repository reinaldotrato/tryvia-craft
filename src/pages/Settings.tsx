import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  User,
  Building2,
  Users,
  Key,
  CreditCard,
  Save,
  Eye,
  EyeOff,
  Copy,
  Check,
  Plus,
  Trash2,
  Loader2,
  Upload,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/GlassCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  plan: string;
  max_agents: number;
  max_messages_month: number;
}

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  permissions: string[];
  last_used_at: string | null;
  status: string;
  created_at: string;
}

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { tenantId, canManageSettings, isOwner, isAdmin } = usePermissions();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Profile state
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileName, setProfileName] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  
  // Password state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Tenant state
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantName, setTenantName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  
  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [newApiKeyName, setNewApiKeyName] = useState("");
  const [newApiKeyPermissions, setNewApiKeyPermissions] = useState<string[]>(["read"]);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKey | null>(null);
  
  // Usage state
  const [agentsCount, setAgentsCount] = useState(0);
  const [messagesCount, setMessagesCount] = useState(0);
  
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, [user, tenantId]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (profileData) {
        setProfile(profileData);
        setProfileName(profileData.full_name || "");
      }
      
      // Load tenant
      if (tenantId) {
        const { data: tenantData } = await supabase
          .from("tenants")
          .select("*")
          .eq("id", tenantId)
          .single();
        
        if (tenantData) {
          setTenant(tenantData);
          setTenantName(tenantData.name);
          setTenantSlug(tenantData.slug);
        }
        
        // Load API keys
        const { data: keysData } = await supabase
          .from("api_keys")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("status", "active")
          .order("created_at", { ascending: false });
        
        setApiKeys(keysData || []);
        
        // Load counts
        const { count: agentsC } = await supabase
          .from("agents")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId);
        
        setAgentsCount(agentsC || 0);
        
        // Count messages from current month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const { count: messagesC } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .gte("created_at", startOfMonth.toISOString());
        
        setMessagesCount(messagesC || 0);
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao carregar configurações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma imagem.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 2MB.",
        variant: "destructive",
      });
      return;
    }

    setAvatarUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfile((prev) => prev ? { ...prev, avatar_url: urlData.publicUrl } : null);

      toast({
        title: "Sucesso",
        description: "Avatar atualizado com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao fazer upload do avatar.",
        variant: "destructive",
      });
    } finally {
      setAvatarUploading(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: profileName })
        .eq("id", user.id);
      
      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar perfil.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }
    
    setChangingPassword(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Senha alterada com sucesso!",
      });
      
      setShowPasswordDialog(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao alterar senha.",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const saveTenant = async () => {
    if (!tenantId || !canManageSettings) return;
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from("tenants")
        .update({ name: tenantName, slug: tenantSlug })
        .eq("id", tenantId);
      
      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Empresa atualizada com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar empresa.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const generateApiKey = async () => {
    if (!newApiKeyName || !tenantId) return;
    setGeneratingKey(true);
    
    try {
      const keyBytes = new Uint8Array(32);
      crypto.getRandomValues(keyBytes);
      const fullKey = `tr_${Array.from(keyBytes).map(b => b.toString(16).padStart(2, '0')).join('')}`;
      const keyPrefix = fullKey.slice(0, 10);
      
      const encoder = new TextEncoder();
      const data = encoder.encode(fullKey);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      const { error } = await supabase.from("api_keys").insert({
        tenant_id: tenantId,
        name: newApiKeyName,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        permissions: newApiKeyPermissions,
        created_by: user?.id,
      });
      
      if (error) throw error;
      
      setGeneratedKey(fullKey);
      loadData();
      
      toast({
        title: "Chave gerada!",
        description: "Copie a chave agora. Ela não será mostrada novamente.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao gerar chave.",
        variant: "destructive",
      });
    } finally {
      setGeneratingKey(false);
    }
  };

  const revokeApiKey = async () => {
    if (!keyToRevoke) return;
    
    try {
      const { error } = await supabase
        .from("api_keys")
        .update({ status: "revoked" })
        .eq("id", keyToRevoke.id);
      
      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Chave revogada com sucesso!",
      });
      
      setRevokeDialogOpen(false);
      setKeyToRevoke(null);
      loadData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao revogar chave.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <motion.h1
          className="text-2xl font-bold text-foreground"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Configurações
        </motion.h1>
        <motion.p
          className="text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          Gerencie sua conta e preferências
        </motion.p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-white/5 border border-white/10 p-1 flex-wrap">
          <TabsTrigger value="profile" className="gap-2 data-[state=active]:bg-purple data-[state=active]:text-primary-foreground">
            <User className="w-4 h-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="company" className="gap-2 data-[state=active]:bg-purple data-[state=active]:text-primary-foreground">
            <Building2 className="w-4 h-4" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2 data-[state=active]:bg-purple data-[state=active]:text-primary-foreground">
            <Users className="w-4 h-4" />
            Equipe
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-2 data-[state=active]:bg-purple data-[state=active]:text-primary-foreground">
            <Key className="w-4 h-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2 data-[state=active]:bg-purple data-[state=active]:text-primary-foreground">
            <CreditCard className="w-4 h-4" />
            Plano
          </TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile">
          <GlassCard className="p-6 space-y-6">
            <div className="flex items-center gap-6">
              <div className="relative group">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple to-pink flex items-center justify-center text-primary-foreground font-bold text-2xl">
                    {profileName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                )}
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  {avatarUploading ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={avatarUploading}
                  />
                </label>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Clique na foto para alterar</p>
                <p className="text-xs text-muted-foreground">JPG, PNG. Max 2MB.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input 
                  value={profileName} 
                  onChange={(e) => setProfileName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ""} type="email" disabled />
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">Alterar Senha</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Alterar Senha</DialogTitle>
                    <DialogDescription>
                      Digite sua nova senha para alterá-la.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Nova Senha</Label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Confirmar Senha</Label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Digite novamente"
                      />
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={changePassword}
                      disabled={changingPassword}
                    >
                      {changingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Alterar Senha
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex justify-end">
              <Button onClick={saveProfile} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar Alterações
              </Button>
            </div>
          </GlassCard>
        </TabsContent>

        {/* Company */}
        <TabsContent value="company">
          <GlassCard className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Nome da Empresa</Label>
                <Input 
                  value={tenantName} 
                  onChange={(e) => setTenantName(e.target.value)}
                  disabled={!canManageSettings}
                />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input 
                  value={tenantSlug} 
                  onChange={(e) => setTenantSlug(e.target.value)}
                  disabled={!canManageSettings}
                />
                <p className="text-xs text-muted-foreground">
                  URL: app.tryvia.com.br/{tenantSlug}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center">
                  {tenant?.logo_url ? (
                    <img src={tenant.logo_url} alt="Logo" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <Building2 className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                {canManageSettings && (
                  <Button variant="outline" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Logo
                  </Button>
                )}
              </div>
            </div>

            {canManageSettings && (
              <div className="flex justify-end">
                <Button onClick={saveTenant} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Salvar
                </Button>
              </div>
            )}
          </GlassCard>
        </TabsContent>

        {/* Team */}
        <TabsContent value="team">
          <GlassCard className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Membros da Equipe</h3>
                <p className="text-sm text-muted-foreground">
                  Gerencie os membros da sua equipe na página dedicada.
                </p>
              </div>
              <Button onClick={() => navigate("/team")}>
                <Users className="w-4 h-4 mr-2" />
                Ir para Equipe
              </Button>
            </div>
          </GlassCard>
        </TabsContent>

        {/* API Keys */}
        <TabsContent value="api">
          <GlassCard className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Chaves de API</h3>
              {(isOwner || isAdmin) && (
                <Dialog open={showApiKeyDialog} onOpenChange={(open) => {
                  setShowApiKeyDialog(open);
                  if (!open) {
                    setGeneratedKey(null);
                    setNewApiKeyName("");
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Gerar Nova Chave
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Gerar Nova Chave de API</DialogTitle>
                      <DialogDescription>
                        Crie uma nova chave para acessar a API.
                      </DialogDescription>
                    </DialogHeader>
                    {generatedKey ? (
                      <div className="space-y-4 pt-4">
                        <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                          <p className="text-sm text-success mb-2 font-medium">
                            Chave gerada com sucesso!
                          </p>
                          <p className="text-xs text-muted-foreground mb-3">
                            Copie agora. Esta chave não será mostrada novamente.
                          </p>
                          <div className="flex gap-2">
                            <Input value={generatedKey} readOnly className="font-mono text-xs" />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleCopy(generatedKey)}
                            >
                              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                        <Button className="w-full" onClick={() => setShowApiKeyDialog(false)}>
                          Fechar
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>Nome da Chave</Label>
                          <Input
                            value={newApiKeyName}
                            onChange={(e) => setNewApiKeyName(e.target.value)}
                            placeholder="Ex: Produção, Desenvolvimento"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Permissões</Label>
                          <Select
                            value={newApiKeyPermissions.join(",")}
                            onValueChange={(v) => setNewApiKeyPermissions(v.split(","))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="read">Apenas Leitura</SelectItem>
                              <SelectItem value="read,write">Leitura e Escrita</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          className="w-full"
                          onClick={generateApiKey}
                          disabled={generatingKey || !newApiKeyName}
                        >
                          {generatingKey && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Gerar Chave
                        </Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {apiKeys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma chave de API gerada.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Chave</TableHead>
                    <TableHead>Permissões</TableHead>
                    <TableHead>Último Uso</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium text-foreground">{key.name}</TableCell>
                      <TableCell>
                        <code className="text-sm text-muted-foreground">{key.key_prefix}...</code>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {key.permissions?.map((perm) => (
                            <span
                              key={perm}
                              className="px-2 py-0.5 text-xs rounded-full bg-purple/20 text-purple"
                            >
                              {perm}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {key.last_used_at
                          ? formatDistanceToNow(new Date(key.last_used_at), { addSuffix: true, locale: ptBR })
                          : "Nunca"}
                      </TableCell>
                      <TableCell className="text-right">
                        {(isOwner || isAdmin) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-error hover:text-error"
                            onClick={() => {
                              setKeyToRevoke(key);
                              setRevokeDialogOpen(true);
                            }}
                          >
                            Revogar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </GlassCard>
        </TabsContent>

        {/* Billing / Plans */}
        <TabsContent value="billing">
          <div className="space-y-6">
            {/* Current Plan Status */}
            <GlassCard className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Plano Atual</p>
                  <h3 className="text-2xl font-bold gradient-text capitalize">
                    {tenant?.plan || "Starter"}
                  </h3>
                </div>
                <div className="flex gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{agentsCount}</p>
                    <p className="text-xs text-muted-foreground">de {tenant?.max_agents || 3} Agentes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{messagesCount}</p>
                    <p className="text-xs text-muted-foreground">de {tenant?.max_messages_month || 1000} Mensagens</p>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Starter Plan */}
              <GlassCard className={`p-6 space-y-6 relative ${tenant?.plan === 'starter' ? 'ring-2 ring-purple' : ''}`}>
                {tenant?.plan === 'starter' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-purple text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                      Plano Atual
                    </span>
                  </div>
                )}
                <div className="text-center">
                  <h3 className="text-xl font-bold text-foreground">Starter</h3>
                  <p className="text-muted-foreground text-sm mt-1">Para começar</p>
                </div>
                <div className="text-center">
                  <span className="text-4xl font-bold text-foreground">Grátis</span>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-muted-foreground">Até 3 agentes</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-muted-foreground">1.000 mensagens/mês</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-muted-foreground">Suporte da comunidade</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-muted-foreground">Relatórios básicos</span>
                  </li>
                </ul>
                <Button 
                  variant="outline" 
                  className="w-full"
                  disabled={tenant?.plan === 'starter'}
                >
                  {tenant?.plan === 'starter' ? 'Plano Atual' : 'Selecionar'}
                </Button>
              </GlassCard>

              {/* Pro Plan */}
              <GlassCard className={`p-6 space-y-6 relative ${tenant?.plan === 'pro' ? 'ring-2 ring-purple' : 'ring-1 ring-pink/50'}`} glow="pink">
                {tenant?.plan === 'pro' ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-purple text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                      Plano Atual
                    </span>
                  </div>
                ) : (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-pink to-purple text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                      Mais Popular
                    </span>
                  </div>
                )}
                <div className="text-center">
                  <h3 className="text-xl font-bold text-foreground">Pro</h3>
                  <p className="text-muted-foreground text-sm mt-1">Para equipes em crescimento</p>
                </div>
                <div className="text-center">
                  <span className="text-4xl font-bold text-foreground">R$ 99</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-muted-foreground">Até 10 agentes</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-muted-foreground">10.000 mensagens/mês</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-muted-foreground">Suporte por Email + Chat</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-muted-foreground">Relatórios avançados</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-muted-foreground">Integrações ilimitadas</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-muted-foreground">API completa</span>
                  </li>
                </ul>
                <Button 
                  className="w-full bg-gradient-to-r from-purple to-pink hover:opacity-90"
                  disabled={tenant?.plan === 'pro'}
                  onClick={() => toast({ title: "Checkout", description: "Redirecionando para checkout do plano Pro..." })}
                >
                  {tenant?.plan === 'pro' ? 'Plano Atual' : 'Fazer Upgrade'}
                </Button>
              </GlassCard>

              {/* Enterprise Plan */}
              <GlassCard className={`p-6 space-y-6 relative ${tenant?.plan === 'enterprise' ? 'ring-2 ring-purple' : ''}`}>
                {tenant?.plan === 'enterprise' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-purple text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                      Plano Atual
                    </span>
                  </div>
                )}
                <div className="text-center">
                  <h3 className="text-xl font-bold text-foreground">Enterprise</h3>
                  <p className="text-muted-foreground text-sm mt-1">Para grandes empresas</p>
                </div>
                <div className="text-center">
                  <span className="text-4xl font-bold text-foreground">Sob Consulta</span>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-muted-foreground">Agentes ilimitados</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-muted-foreground">Mensagens ilimitadas</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-muted-foreground">Suporte Prioritário 24/7</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-muted-foreground">SLA garantido</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-muted-foreground">Onboarding dedicado</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-muted-foreground">Customizações</span>
                  </li>
                </ul>
                <Button 
                  variant="outline" 
                  className="w-full"
                  disabled={tenant?.plan === 'enterprise'}
                  onClick={() => toast({ title: "Contato", description: "Entre em contato com nossa equipe comercial." })}
                >
                  {tenant?.plan === 'enterprise' ? 'Plano Atual' : 'Falar com Vendas'}
                </Button>
              </GlassCard>
            </div>

            {/* FAQ */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Perguntas Frequentes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-foreground mb-2">Posso mudar de plano?</h4>
                  <p className="text-sm text-muted-foreground">
                    Sim, você pode fazer upgrade ou downgrade a qualquer momento. 
                    As mudanças entram em vigor no próximo ciclo de faturamento.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-2">Como funciona o limite de mensagens?</h4>
                  <p className="text-sm text-muted-foreground">
                    O limite é renovado todo mês. Mensagens não utilizadas não acumulam.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-2">Posso cancelar?</h4>
                  <p className="text-sm text-muted-foreground">
                    Sim, você pode cancelar a qualquer momento sem custos adicionais.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-2">Existe período de teste?</h4>
                  <p className="text-sm text-muted-foreground">
                    O plano Starter é gratuito para sempre. Experimente antes de fazer upgrade.
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>
        </TabsContent>
      </Tabs>

      {/* Revoke Dialog */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar Chave de API</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja revogar a chave "{keyToRevoke?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={revokeApiKey} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Revogar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
