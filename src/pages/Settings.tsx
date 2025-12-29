import { useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Building2,
  Link2,
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
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
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

const teamMembers = [
  { id: "1", name: "João da Silva", email: "joao@empresa.com", role: "owner", status: "active" as const },
  { id: "2", name: "Maria Santos", email: "maria@empresa.com", role: "admin", status: "active" as const },
  { id: "3", name: "Pedro Lima", email: "pedro@empresa.com", role: "member", status: "active" as const },
  { id: "4", name: "Ana Costa", email: "ana@empresa.com", role: "viewer", status: "active" as const },
];

const apiKeys = [
  { id: "1", name: "Produção", prefix: "tr_prod_abc", permissions: ["read", "write"], lastUsed: "Hoje", status: "active" as const },
  { id: "2", name: "Desenvolvimento", prefix: "tr_dev_xyz", permissions: ["read"], lastUsed: "3 dias atrás", status: "active" as const },
];

export default function Settings() {
  const [showZapiToken, setShowZapiToken] = useState(false);
  const [showN8nKey, setShowN8nKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          <TabsTrigger value="integrations" className="gap-2 data-[state=active]:bg-purple data-[state=active]:text-primary-foreground">
            <Link2 className="w-4 h-4" />
            Integrações
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
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple to-pink flex items-center justify-center text-primary-foreground font-bold text-2xl">
                JD
              </div>
              <div>
                <Button variant="outline" size="sm">Alterar foto</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input defaultValue="João da Silva" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input defaultValue="joao@empresa.com" type="email" />
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <Button variant="outline">Alterar Senha</Button>
            </div>

            <div className="flex justify-end">
              <Button>
                <Save className="w-4 h-4 mr-2" />
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
                <Input defaultValue="Minha Empresa" />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input defaultValue="minha-empresa" />
                <p className="text-xs text-muted-foreground">
                  URL: app.tryvia.com.br/minha-empresa
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-muted-foreground" />
                </div>
                <Button variant="outline" size="sm">Upload Logo</Button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button>
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </div>
          </GlassCard>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations" className="space-y-6">
          {/* Z-API */}
          <GlassCard className="p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center text-2xl">
                📱
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Z-API</h3>
                <p className="text-sm text-muted-foreground">Integração com WhatsApp</p>
              </div>
              <StatusBadge status="active" className="ml-auto" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Instance ID</Label>
                <Input placeholder="Seu Instance ID" defaultValue="instance_abc123" />
              </div>
              <div className="space-y-2">
                <Label>Token</Label>
                <div className="relative">
                  <Input
                    type={showZapiToken ? "text" : "password"}
                    placeholder="Seu Token"
                    defaultValue="token_secret_xyz"
                  />
                  <button
                    type="button"
                    onClick={() => setShowZapiToken(!showZapiToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showZapiToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Webhook URL (copie e cole no Z-API)</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value="https://api.tryvia.com.br/webhooks/zapi/abc123"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy("https://api.tryvia.com.br/webhooks/zapi/abc123")}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Testar Conexão
              </Button>
              <Button>Salvar</Button>
            </div>
          </GlassCard>

          {/* N8N */}
          <GlassCard className="p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center text-2xl">
                ⚡
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">N8N</h3>
                <p className="text-sm text-muted-foreground">Automação de workflows</p>
              </div>
              <StatusBadge status="active" className="ml-auto" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>URL Base</Label>
                <Input placeholder="https://seu-n8n.com" defaultValue="https://n8n.minha-empresa.com" />
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="relative">
                  <Input
                    type={showN8nKey ? "text" : "password"}
                    placeholder="Sua API Key"
                  />
                  <button
                    type="button"
                    onClick={() => setShowN8nKey(!showN8nKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showN8nKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Testar Conexão
              </Button>
              <Button>Salvar</Button>
            </div>
          </GlassCard>
        </TabsContent>

        {/* Team */}
        <TabsContent value="team">
          <GlassCard className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Membros da Equipe</h3>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Convidar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Convidar Membro</DialogTitle>
                    <DialogDescription>
                      Envie um convite por email para adicionar um novo membro à equipe.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input placeholder="email@exemplo.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Função</Label>
                      <Select defaultValue="member">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="member">Membro</SelectItem>
                          <SelectItem value="viewer">Visualizador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full">Enviar Convite</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membro</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple to-pink flex items-center justify-center text-primary-foreground font-bold text-xs">
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{member.name}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">{member.role}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={member.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {member.role !== "owner" && (
                        <Button variant="ghost" size="icon" className="text-error hover:text-error">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </GlassCard>
        </TabsContent>

        {/* API Keys */}
        <TabsContent value="api">
          <GlassCard className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Chaves de API</h3>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Gerar Nova Chave
              </Button>
            </div>

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
                      <code className="text-sm text-muted-foreground">{key.prefix}...</code>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {key.permissions.map((perm) => (
                          <span
                            key={perm}
                            className="px-2 py-0.5 text-xs rounded-full bg-purple/20 text-purple"
                          >
                            {perm}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{key.lastUsed}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-error hover:text-error">
                        Revogar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </GlassCard>
        </TabsContent>

        {/* Billing */}
        <TabsContent value="billing">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Plano Atual</p>
                  <h3 className="text-2xl font-bold gradient-text">Pro</h3>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-foreground">R$ 99</p>
                  <p className="text-sm text-muted-foreground">/mês</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Agentes</span>
                    <span className="text-foreground">3 / 5</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple to-pink rounded-full" style={{ width: "60%" }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Mensagens</span>
                    <span className="text-foreground">750 / 1000</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple to-pink rounded-full" style={{ width: "75%" }} />
                  </div>
                </div>
              </div>

              <Button className="w-full">Fazer Upgrade</Button>
            </GlassCard>

            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Histórico de Faturas</h3>
              <div className="space-y-3">
                {[
                  { date: "01/12/2024", amount: "R$ 99,00", status: "Pago" },
                  { date: "01/11/2024", amount: "R$ 99,00", status: "Pago" },
                  { date: "01/10/2024", amount: "R$ 99,00", status: "Pago" },
                ].map((invoice, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                    <div>
                      <p className="font-medium text-foreground">{invoice.date}</p>
                      <p className="text-sm text-muted-foreground">{invoice.amount}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-success/20 text-success">
                      {invoice.status}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
