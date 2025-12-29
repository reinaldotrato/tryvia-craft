-- ============================================
-- EXTENSÕES
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM: app_role
-- ============================================
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'member', 'viewer');

-- ============================================
-- TABELA: tenants (Empresas/Clientes)
-- ============================================
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  plan TEXT DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'enterprise')),
  
  -- Configurações Z-API
  zapi_instance_id TEXT,
  zapi_token TEXT,
  zapi_webhook_url TEXT,
  
  -- Configurações N8N
  n8n_webhook_base TEXT,
  n8n_api_key TEXT,
  
  -- Limites do plano
  max_agents INT DEFAULT 3,
  max_messages_month INT DEFAULT 1000,
  
  -- Configurações gerais
  settings JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TABELA: profiles (Perfis de Usuário)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TABELA: user_roles (Papéis do Usuário)
-- ============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- ============================================
-- TABELA: tenant_users (Usuários do Tenant)
-- ============================================
CREATE TABLE public.tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- ============================================
-- TABELA: agents (Agentes de IA)
-- ============================================
CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Identificação
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  
  -- Configuração do Modelo
  model TEXT DEFAULT 'gpt-4o-mini' CHECK (model IN ('gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'claude-3-sonnet', 'claude-3-haiku')),
  system_prompt TEXT NOT NULL,
  temperature NUMERIC(3,2) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens INT DEFAULT 1000 CHECK (max_tokens >= 100 AND max_tokens <= 4000),
  
  -- Mensagens Padrão
  welcome_message TEXT DEFAULT 'Olá! Como posso ajudar você hoje?',
  fallback_message TEXT DEFAULT 'Desculpe, não entendi. Pode reformular sua pergunta?',
  transfer_message TEXT DEFAULT 'Vou transferir você para um atendente humano.',
  
  -- Configurações de Comportamento
  context_window INT DEFAULT 10,
  typing_delay_ms INT DEFAULT 1500,
  auto_transfer_keywords TEXT[],
  
  -- Integrações
  n8n_workflow_id TEXT,
  webhook_url TEXT,
  
  -- Horário de Funcionamento
  business_hours JSONB DEFAULT '{"enabled": false}',
  out_of_hours_message TEXT DEFAULT 'Nosso atendimento funciona de segunda a sexta, das 9h às 18h.',
  
  -- Métricas
  total_conversations INT DEFAULT 0,
  total_messages INT DEFAULT 0,
  avg_response_time_ms INT DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TABELA: conversations (Conversas)
-- ============================================
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  
  -- Identificação do Contato
  phone TEXT NOT NULL,
  contact_name TEXT,
  contact_photo_url TEXT,
  
  -- Estado da Conversa
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'waiting', 'transferred', 'closed')),
  is_bot_active BOOLEAN DEFAULT true,
  transferred_to UUID REFERENCES auth.users(id),
  
  -- Contexto
  context JSONB DEFAULT '{}',
  tags TEXT[],
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  
  -- Timestamps
  last_message_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TABELA: messages (Mensagens)
-- ============================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  
  -- Conteúdo
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'audio', 'document', 'location')),
  media_url TEXT,
  
  -- Metadados
  tokens_used INT,
  response_time_ms INT,
  model_used TEXT,
  
  -- Status de Entrega (Z-API)
  zapi_message_id TEXT,
  delivery_status TEXT DEFAULT 'sent' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  
  -- Flags
  is_from_bot BOOLEAN DEFAULT false,
  is_edited BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TABELA: agent_analytics (Métricas Diárias)
-- ============================================
CREATE TABLE public.agent_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  
  date DATE NOT NULL,
  
  -- Métricas
  conversations_started INT DEFAULT 0,
  conversations_closed INT DEFAULT 0,
  messages_received INT DEFAULT 0,
  messages_sent INT DEFAULT 0,
  tokens_used INT DEFAULT 0,
  avg_response_time_ms INT DEFAULT 0,
  transfers_to_human INT DEFAULT 0,
  
  -- Sentimento agregado
  positive_count INT DEFAULT 0,
  neutral_count INT DEFAULT 0,
  negative_count INT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, date)
);

-- ============================================
-- TABELA: activity_logs (Auditoria)
-- ============================================
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  
  old_values JSONB,
  new_values JSONB,
  metadata JSONB DEFAULT '{}',
  
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TABELA: api_keys (Chaves de API)
-- ============================================
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  
  permissions TEXT[] DEFAULT ARRAY['read'],
  
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_agents_tenant ON public.agents(tenant_id);
CREATE INDEX idx_agents_status ON public.agents(status);
CREATE INDEX idx_conversations_tenant ON public.conversations(tenant_id);
CREATE INDEX idx_conversations_agent ON public.conversations(agent_id);
CREATE INDEX idx_conversations_phone ON public.conversations(phone);
CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX idx_analytics_agent_date ON public.agent_analytics(agent_id, date DESC);
CREATE INDEX idx_activity_logs_tenant ON public.activity_logs(tenant_id, created_at DESC);
CREATE INDEX idx_tenant_users_user ON public.tenant_users(user_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

-- ============================================
-- FUNÇÃO: has_role (Security Definer)
-- ============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- ============================================
-- FUNÇÃO: get_user_tenant_id (Security Definer)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_users 
  WHERE user_id = auth.uid() 
  AND status = 'active'
  LIMIT 1
$$;

-- ============================================
-- TRIGGER: update_updated_at_column
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- TRIGGER: Criar profile e tenant ao cadastrar usuário
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id UUID;
  user_name TEXT;
BEGIN
  -- Extrair nome do usuário
  user_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1));
  
  -- Criar profile
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, user_name);
  
  -- Criar tenant para o usuário
  INSERT INTO public.tenants (name, slug)
  VALUES (user_name || '''s Workspace', lower(replace(NEW.id::text, '-', '')))
  RETURNING id INTO new_tenant_id;
  
  -- Associar usuário ao tenant como owner
  INSERT INTO public.tenant_users (tenant_id, user_id, role, status, accepted_at)
  VALUES (new_tenant_id, NEW.id, 'owner', 'active', now());
  
  -- Adicionar role de owner
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'owner');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- User Roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant"
  ON public.tenants FOR SELECT
  TO authenticated
  USING (id = public.get_user_tenant_id());

CREATE POLICY "Owners and admins can update tenant"
  ON public.tenants FOR UPDATE
  TO authenticated
  USING (id IN (
    SELECT tenant_id FROM public.tenant_users 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  ));

-- Tenant Users
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant members"
  ON public.tenant_users FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Owners and admins can manage members"
  ON public.tenant_users FOR ALL
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_users 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  ));

-- Agents
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant agents"
  ON public.agents FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Members can create agents"
  ON public.agents FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Members can update agents"
  ON public.agents FOR UPDATE
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Owners and admins can delete agents"
  ON public.agents FOR DELETE
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_users 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin', 'member')
  ));

-- Conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant conversations"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can manage tenant conversations"
  ON public.conversations FOR ALL
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- Messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conversation messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (conversation_id IN (
    SELECT id FROM public.conversations 
    WHERE tenant_id = public.get_user_tenant_id()
  ));

CREATE POLICY "Users can insert messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (conversation_id IN (
    SELECT id FROM public.conversations 
    WHERE tenant_id = public.get_user_tenant_id()
  ));

-- Agent Analytics
ALTER TABLE public.agent_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant analytics"
  ON public.agent_analytics FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- Activity Logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can insert logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- API Keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant api keys"
  ON public.api_keys FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Owners and admins can manage api keys"
  ON public.api_keys FOR ALL
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_users 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  ));