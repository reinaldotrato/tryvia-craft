import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bot,
  Settings,
  MessageSquare,
  Zap,
  Link2,
  Save,
  Play,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { GlassCard } from "@/components/ui/GlassCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const models = [
  { value: "gpt-4o", label: "GPT-4o", description: "Mais capaz" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini", description: "Rápido e econômico" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo", description: "Alta performance" },
  { value: "claude-3-sonnet", label: "Claude 3 Sonnet", description: "Equilibrado" },
  { value: "claude-3-haiku", label: "Claude 3 Haiku", description: "Ultra rápido" },
];

const promptVariables = [
  { name: "{{nome_contato}}", description: "Nome do contato" },
  { name: "{{telefone}}", description: "Telefone do contato" },
  { name: "{{data_hora}}", description: "Data e hora atual" },
  { name: "{{historico}}", description: "Histórico da conversa" },
];

export default function AgentForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [temperature, setTemperature] = useState([0.7]);
  const [maxTokens, setMaxTokens] = useState([1000]);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("Olá! Como posso ajudar você hoje?");
  const [fallbackMessage, setFallbackMessage] = useState("Desculpe, não entendi. Pode reformular sua pergunta?");
  const [transferMessage, setTransferMessage] = useState("Vou transferir você para um atendente humano.");
  const [outOfHoursMessage, setOutOfHoursMessage] = useState("Nosso atendimento funciona de segunda a sexta, das 9h às 18h.");
  const [businessHoursEnabled, setBusinessHoursEnabled] = useState(false);
  const [contextWindow, setContextWindow] = useState([10]);
  const [typingDelay, setTypingDelay] = useState([1500]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [n8nWorkflowId, setN8nWorkflowId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (activate = false) => {
    setIsSaving(true);
    // Simulate save
    setTimeout(() => {
      setIsSaving(false);
      navigate("/agents");
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/agents")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <motion.h1
            className="text-2xl font-bold text-foreground"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {isEditing ? "Editar Agente" : "Novo Agente"}
          </motion.h1>
          <motion.p
            className="text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            Configure seu assistente de IA
          </motion.p>
        </div>
      </div>

      {/* Form Tabs */}
      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList className="bg-white/5 border border-white/10 p-1">
          <TabsTrigger value="basic" className="gap-2 data-[state=active]:bg-purple data-[state=active]:text-primary-foreground">
            <Settings className="w-4 h-4" />
            Configuração
          </TabsTrigger>
          <TabsTrigger value="prompt" className="gap-2 data-[state=active]:bg-purple data-[state=active]:text-primary-foreground">
            <Bot className="w-4 h-4" />
            Prompt
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2 data-[state=active]:bg-purple data-[state=active]:text-primary-foreground">
            <MessageSquare className="w-4 h-4" />
            Mensagens
          </TabsTrigger>
          <TabsTrigger value="behavior" className="gap-2 data-[state=active]:bg-purple data-[state=active]:text-primary-foreground">
            <Zap className="w-4 h-4" />
            Comportamento
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2 data-[state=active]:bg-purple data-[state=active]:text-primary-foreground">
            <Link2 className="w-4 h-4" />
            Integrações
          </TabsTrigger>
        </TabsList>

        {/* Basic Config */}
        <TabsContent value="basic">
          <GlassCard className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Agente *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Vendas IA"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Modelo de IA</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        <div className="flex items-center justify-between w-full">
                          <span>{m.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {m.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descreva brevemente o propósito deste agente..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Temperatura: {temperature[0].toFixed(1)}</Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Valores mais altos = mais criativo. Mais baixos = mais preciso.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Slider
                  value={temperature}
                  onValueChange={setTemperature}
                  max={2}
                  min={0}
                  step={0.1}
                  className="[&_[role=slider]]:bg-purple"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Max Tokens: {maxTokens[0]}</Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Limite máximo de tokens por resposta.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Slider
                  value={maxTokens}
                  onValueChange={setMaxTokens}
                  max={4000}
                  min={100}
                  step={100}
                  className="[&_[role=slider]]:bg-purple"
                />
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        {/* System Prompt */}
        <TabsContent value="prompt">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <GlassCard className="lg:col-span-2 p-6 space-y-4">
              <Label htmlFor="systemPrompt">Prompt do Sistema</Label>
              <Textarea
                id="systemPrompt"
                placeholder="Você é um assistente de vendas especializado..."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={16}
                className="font-mono text-sm"
              />
            </GlassCard>

            <GlassCard className="p-6 space-y-4 h-fit">
              <h4 className="font-semibold text-foreground">Variáveis Disponíveis</h4>
              <p className="text-xs text-muted-foreground">
                Clique para inserir no prompt
              </p>
              <div className="space-y-2">
                {promptVariables.map((variable) => (
                  <button
                    key={variable.name}
                    type="button"
                    onClick={() => setSystemPrompt((p) => p + " " + variable.name)}
                    className="w-full text-left p-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <code className="text-sm text-purple">{variable.name}</code>
                    <p className="text-xs text-muted-foreground">{variable.description}</p>
                  </button>
                ))}
              </div>
            </GlassCard>
          </div>
        </TabsContent>

        {/* Messages */}
        <TabsContent value="messages">
          <GlassCard className="p-6 space-y-6">
            <div className="space-y-2">
              <Label>Mensagem de Boas-vindas</Label>
              <Textarea
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Mensagem de Fallback</Label>
              <Textarea
                value={fallbackMessage}
                onChange={(e) => setFallbackMessage(e.target.value)}
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                Usada quando o agente não consegue entender a mensagem
              </p>
            </div>

            <div className="space-y-2">
              <Label>Mensagem de Transferência</Label>
              <Textarea
                value={transferMessage}
                onChange={(e) => setTransferMessage(e.target.value)}
                rows={2}
              />
            </div>

            <div className="border-t border-white/10 pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Horário de Funcionamento</Label>
                  <p className="text-xs text-muted-foreground">
                    Definir mensagem para fora do horário comercial
                  </p>
                </div>
                <Switch
                  checked={businessHoursEnabled}
                  onCheckedChange={setBusinessHoursEnabled}
                />
              </div>

              {businessHoursEnabled && (
                <div className="space-y-2">
                  <Label>Mensagem Fora do Horário</Label>
                  <Textarea
                    value={outOfHoursMessage}
                    onChange={(e) => setOutOfHoursMessage(e.target.value)}
                    rows={2}
                  />
                </div>
              )}
            </div>
          </GlassCard>
        </TabsContent>

        {/* Behavior */}
        <TabsContent value="behavior">
          <GlassCard className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Janela de Contexto: {contextWindow[0]} mensagens</Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Quantas mensagens anteriores serão consideradas</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Slider
                  value={contextWindow}
                  onValueChange={setContextWindow}
                  max={20}
                  min={1}
                  step={1}
                  className="[&_[role=slider]]:bg-purple"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Delay de Digitação: {(typingDelay[0] / 1000).toFixed(1)}s</Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Simula digitação para parecer mais natural</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Slider
                  value={typingDelay}
                  onValueChange={setTypingDelay}
                  max={3000}
                  min={500}
                  step={100}
                  className="[&_[role=slider]]:bg-purple"
                />
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations">
          <GlassCard className="p-6 space-y-6">
            <div className="space-y-2">
              <Label>URL do Webhook</Label>
              <Input
                placeholder="https://seu-servidor.com/webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Receba notificações de eventos do agente
              </p>
            </div>

            <div className="space-y-2">
              <Label>ID do Workflow N8N</Label>
              <Input
                placeholder="workflow_abc123"
                value={n8nWorkflowId}
                onChange={(e) => setN8nWorkflowId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Conecte a um workflow do N8N para ações customizadas
              </p>
            </div>

            <Button variant="outline">Testar Conexão</Button>
          </GlassCard>
        </TabsContent>
      </Tabs>

      {/* Footer Actions */}
      <div className="sticky bottom-0 py-4 bg-background/80 backdrop-blur-xl border-t border-border -mx-6 px-6">
        <div className="flex items-center justify-end gap-3 max-w-5xl">
          <Button variant="outline" onClick={() => navigate("/agents")}>
            Cancelar
          </Button>
          <Button variant="secondary" onClick={() => handleSave(false)} disabled={isSaving}>
            <Save className="w-4 h-4" />
            Salvar Rascunho
          </Button>
          <Button onClick={() => handleSave(true)} disabled={isSaving}>
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>
                <Play className="w-4 h-4" />
                Salvar e Ativar
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
