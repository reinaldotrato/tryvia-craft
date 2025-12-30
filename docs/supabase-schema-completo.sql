-- ============================================
-- SCHEMA COMPLETO PARA SUPABASE EXTERNO
-- Gerado em: 2025-12-30
-- ============================================
-- INSTRUÇÕES:
-- 1. Acesse o Dashboard do seu Supabase
-- 2. Vá em SQL Editor
-- 3. Cole este script completo
-- 4. Execute-o
-- ============================================

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
  zapi_client_token TEXT,
  
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
-- TABELA: super_admins (Admin Master)
-- ============================================
CREATE TABLE public.super_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- ============================================
-- TABELA: user_permissions (Permissões Granulares)
-- ============================================
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id, permission)
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
-- TABELA: invitations (Convites)
-- ============================================
CREATE TABLE public.invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'member',
  token TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- TABELA: notifications (Notificações)
-- ============================================
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- TABELA: integration_logs (Logs de Integração)
-- ============================================
CREATE TABLE public.integration_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  integration_type TEXT NOT NULL CHECK (integration_type IN ('zapi', 'n8n')),
  event_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'warning')),
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
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
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_email ON public.invitations(email);
CREATE INDEX idx_invitations_tenant_id ON public.invitations(tenant_id);
CREATE INDEX idx_integration_logs_tenant_created ON public.integration_logs(tenant_id, created_at DESC);
CREATE INDEX idx_integration_logs_type ON public.integration_logs(integration_type);
CREATE INDEX idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX idx_user_permissions_tenant_id ON public.user_permissions(tenant_id);
CREATE INDEX idx_super_admins_user_id ON public.super_admins(user_id);

-- ============================================
-- FUNÇÕES DE SEGURANÇA
-- ============================================

-- Função: has_role (Security Definer)
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

-- Função: get_user_tenant_id (Security Definer)
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT tenant_id FROM public.tenant_users 
  WHERE user_id = auth.uid() 
  AND status = 'active'
  LIMIT 1
$$;

-- Função: is_tenant_admin (Security Definer)
CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_users
    WHERE user_id = auth.uid()
      AND tenant_id = p_tenant_id
      AND role IN ('owner', 'admin')
      AND status = 'active'
  )
$$;

-- Função: is_tenant_member (Security Definer)
CREATE OR REPLACE FUNCTION public.is_tenant_member(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_users
    WHERE user_id = auth.uid()
      AND tenant_id = p_tenant_id
      AND status = 'active'
  )
$$;

-- Função: is_super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins WHERE user_id = auth.uid()
  )
$$;

-- Função: user_has_permission
CREATE OR REPLACE FUNCTION public.user_has_permission(
  p_user_id UUID, 
  p_permission TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions
    WHERE user_id = p_user_id
      AND permission = p_permission
      AND tenant_id = get_user_tenant_id()
  )
$$;

-- Função: update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Função: handle_new_user (Trigger para novo usuário)
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

-- Função: audit_trigger_function
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  audit_user_id UUID;
  audit_tenant_id UUID;
  old_data JSONB;
  new_data JSONB;
BEGIN
  -- Get current user ID
  audit_user_id := auth.uid();
  
  -- Get tenant ID based on table
  IF TG_TABLE_NAME = 'tenants' THEN
    IF TG_OP = 'DELETE' THEN
      audit_tenant_id := OLD.id;
    ELSE
      audit_tenant_id := NEW.id;
    END IF;
  ELSIF TG_TABLE_NAME IN ('agents', 'conversations', 'invitations', 'notifications', 'api_keys', 'agent_analytics') THEN
    IF TG_OP = 'DELETE' THEN
      audit_tenant_id := OLD.tenant_id;
    ELSE
      audit_tenant_id := NEW.tenant_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'tenant_users' THEN
    IF TG_OP = 'DELETE' THEN
      audit_tenant_id := OLD.tenant_id;
    ELSE
      audit_tenant_id := NEW.tenant_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'messages' THEN
    IF TG_OP = 'DELETE' THEN
      SELECT tenant_id INTO audit_tenant_id FROM conversations WHERE id = OLD.conversation_id;
    ELSE
      SELECT tenant_id INTO audit_tenant_id FROM conversations WHERE id = NEW.conversation_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    audit_tenant_id := get_user_tenant_id();
  ELSE
    audit_tenant_id := get_user_tenant_id();
  END IF;
  
  -- Skip if no tenant (system operations)
  IF audit_tenant_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;
  
  -- Prepare data
  IF TG_OP = 'DELETE' THEN
    old_data := to_jsonb(OLD);
    new_data := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    old_data := NULL;
    new_data := to_jsonb(NEW);
  ELSE -- UPDATE
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
  END IF;
  
  -- Remove sensitive fields from audit data
  IF old_data IS NOT NULL THEN
    old_data := old_data - ARRAY['zapi_token', 'n8n_api_key', 'key_hash', 'password'];
  END IF;
  IF new_data IS NOT NULL THEN
    new_data := new_data - ARRAY['zapi_token', 'n8n_api_key', 'key_hash', 'password'];
  END IF;
  
  -- Insert audit record
  INSERT INTO public.activity_logs (
    tenant_id,
    user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
    metadata
  ) VALUES (
    audit_tenant_id,
    audit_user_id,
    LOWER(TG_OP),
    TG_TABLE_NAME,
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    old_data,
    new_data,
    jsonb_build_object(
      'table_schema', TG_TABLE_SCHEMA,
      'triggered_at', now()
    )
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger: Criar profile e tenant ao cadastrar usuário
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Triggers: update_updated_at
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

-- Triggers: Audit
CREATE TRIGGER audit_agents
  AFTER INSERT OR UPDATE OR DELETE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_conversations
  AFTER INSERT OR UPDATE OR DELETE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_tenant_users
  AFTER INSERT OR UPDATE OR DELETE ON public.tenant_users
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_invitations
  AFTER INSERT OR UPDATE OR DELETE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_api_keys
  AFTER INSERT OR UPDATE OR DELETE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_profiles
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_tenants
  AFTER UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - PROFILES
-- ============================================
CREATE POLICY "Deny anonymous access to profiles" 
  ON public.profiles FOR ALL TO anon USING (false);

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "System creates profiles" 
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Deny delete on profiles" 
  ON public.profiles FOR DELETE TO authenticated
  USING (false);

-- ============================================
-- RLS POLICIES - USER_ROLES
-- ============================================
CREATE POLICY "Deny anonymous access to user_roles" 
  ON public.user_roles FOR ALL TO anon USING (false);

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- RLS POLICIES - TENANTS
-- ============================================
CREATE POLICY "Deny anonymous access to tenants" 
  ON public.tenants FOR ALL TO anon USING (false);

CREATE POLICY "Users can view own tenant" 
  ON public.tenants FOR SELECT TO authenticated
  USING (id = public.get_user_tenant_id());

CREATE POLICY "Admins can update tenant" 
  ON public.tenants FOR UPDATE TO authenticated
  USING (public.is_tenant_admin(id));

CREATE POLICY "Super admins can view all tenants"
  ON public.tenants FOR SELECT
  USING (is_super_admin());

CREATE POLICY "Super admins can insert tenants"
  ON public.tenants FOR INSERT
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can update all tenants"
  ON public.tenants FOR UPDATE
  USING (is_super_admin());

CREATE POLICY "Super admins can delete tenants"
  ON public.tenants FOR DELETE
  USING (is_super_admin());

-- ============================================
-- RLS POLICIES - TENANT_USERS
-- ============================================
CREATE POLICY "Deny anonymous access to tenant_users" 
  ON public.tenant_users FOR ALL TO anon USING (false);

CREATE POLICY "Users can view own tenant members" 
  ON public.tenant_users FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins can manage tenant members" 
  ON public.tenant_users FOR ALL TO authenticated
  USING (public.is_tenant_admin(tenant_id))
  WITH CHECK (public.is_tenant_admin(tenant_id));

CREATE POLICY "Users can insert themselves via invitation" 
  ON public.tenant_users FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM public.invitations i 
      WHERE i.tenant_id = tenant_users.tenant_id 
      AND lower(i.email) = lower(auth.jwt()->>'email')
      AND i.status = 'pending' 
      AND i.expires_at > now()
    )
  );

CREATE POLICY "Super admins can view all tenant_users"
  ON public.tenant_users FOR SELECT
  USING (is_super_admin());

CREATE POLICY "Super admins can manage all tenant_users"
  ON public.tenant_users FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ============================================
-- RLS POLICIES - SUPER_ADMINS
-- ============================================
CREATE POLICY "Deny anonymous access to super_admins"
  ON public.super_admins FOR ALL TO anon USING (false);

CREATE POLICY "Super admins can view themselves"
  ON public.super_admins FOR SELECT
  USING (user_id = auth.uid());

-- ============================================
-- RLS POLICIES - USER_PERMISSIONS
-- ============================================
CREATE POLICY "Deny anonymous access to user_permissions"
  ON public.user_permissions FOR ALL TO anon USING (false);

CREATE POLICY "Admins can view user permissions"
  ON public.user_permissions FOR SELECT
  USING (is_tenant_admin(tenant_id));

CREATE POLICY "Admins can manage user permissions"
  ON public.user_permissions FOR ALL
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Users can view own permissions"
  ON public.user_permissions FOR SELECT
  USING (user_id = auth.uid());

-- ============================================
-- RLS POLICIES - AGENTS
-- ============================================
CREATE POLICY "Deny anonymous access to agents" 
  ON public.agents FOR ALL TO anon USING (false);

CREATE POLICY "Members can view agents" 
  ON public.agents FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Members can create agents" 
  ON public.agents FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Members can update agents" 
  ON public.agents FOR UPDATE TO authenticated
  USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Admins can delete agents" 
  ON public.agents FOR DELETE TO authenticated
  USING (public.is_tenant_admin(tenant_id));

CREATE POLICY "Super admins can view all agents"
  ON public.agents FOR SELECT
  USING (is_super_admin());

-- ============================================
-- RLS POLICIES - CONVERSATIONS
-- ============================================
CREATE POLICY "Deny anonymous access to conversations" 
  ON public.conversations FOR ALL TO anon USING (false);

CREATE POLICY "Members can view conversations" 
  ON public.conversations FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Members can manage conversations" 
  ON public.conversations FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id))
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Super admins can view all conversations"
  ON public.conversations FOR SELECT
  USING (is_super_admin());

-- ============================================
-- RLS POLICIES - MESSAGES
-- ============================================
CREATE POLICY "Deny anonymous access to messages" 
  ON public.messages FOR ALL TO anon USING (false);

CREATE POLICY "Deny delete on messages" 
  ON public.messages FOR DELETE TO authenticated USING (false);

CREATE POLICY "Deny update on messages" 
  ON public.messages FOR UPDATE TO authenticated USING (false);

CREATE POLICY "Members can view messages" 
  ON public.messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = messages.conversation_id 
      AND public.is_tenant_member(c.tenant_id)
    )
  );

CREATE POLICY "Members can insert messages" 
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = messages.conversation_id 
      AND public.is_tenant_member(c.tenant_id)
    )
  );

-- ============================================
-- RLS POLICIES - AGENT_ANALYTICS
-- ============================================
CREATE POLICY "Deny anonymous access to agent_analytics" 
  ON public.agent_analytics FOR ALL TO anon USING (false);

CREATE POLICY "Deny delete on agent_analytics" 
  ON public.agent_analytics FOR DELETE TO authenticated USING (false);

CREATE POLICY "Deny insert on agent_analytics" 
  ON public.agent_analytics FOR INSERT TO authenticated WITH CHECK (false);

CREATE POLICY "Deny update on agent_analytics" 
  ON public.agent_analytics FOR UPDATE TO authenticated USING (false);

CREATE POLICY "Members can view analytics" 
  ON public.agent_analytics FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));

-- ============================================
-- RLS POLICIES - ACTIVITY_LOGS
-- ============================================
CREATE POLICY "Deny anonymous access to activity_logs" 
  ON public.activity_logs FOR ALL TO anon USING (false);

CREATE POLICY "Deny delete on activity_logs" 
  ON public.activity_logs FOR DELETE TO authenticated USING (false);

CREATE POLICY "Deny update on activity_logs" 
  ON public.activity_logs FOR UPDATE TO authenticated USING (false);

CREATE POLICY "Admins can view activity logs" 
  ON public.activity_logs FOR SELECT TO authenticated
  USING (public.is_tenant_admin(tenant_id));

CREATE POLICY "Users can insert logs" 
  ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Super admins can view all activity_logs"
  ON public.activity_logs FOR SELECT
  USING (is_super_admin());

-- ============================================
-- RLS POLICIES - API_KEYS
-- ============================================
CREATE POLICY "Deny anonymous access to api_keys" 
  ON public.api_keys FOR ALL TO anon USING (false);

CREATE POLICY "Admins can view api keys" 
  ON public.api_keys FOR SELECT TO authenticated
  USING (public.is_tenant_admin(tenant_id));

CREATE POLICY "Admins can manage api keys" 
  ON public.api_keys FOR ALL TO authenticated
  USING (public.is_tenant_admin(tenant_id))
  WITH CHECK (public.is_tenant_admin(tenant_id));

-- ============================================
-- RLS POLICIES - INVITATIONS
-- ============================================
CREATE POLICY "Deny anonymous access to invitations" 
  ON public.invitations FOR ALL TO anon USING (false);

CREATE POLICY "Admins can view invitations" 
  ON public.invitations FOR SELECT TO authenticated
  USING (public.is_tenant_admin(tenant_id));

CREATE POLICY "Users can view their own invitation" 
  ON public.invitations FOR SELECT TO authenticated
  USING (
    status = 'pending' 
    AND lower(email) = lower(auth.jwt()->>'email')
    AND expires_at > now()
  );

CREATE POLICY "Admins can create invitations" 
  ON public.invitations FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_admin(tenant_id));

CREATE POLICY "Admins can update invitations" 
  ON public.invitations FOR UPDATE TO authenticated
  USING (public.is_tenant_admin(tenant_id));

CREATE POLICY "Users can update their own invitation" 
  ON public.invitations FOR UPDATE TO authenticated
  USING (
    status = 'pending' 
    AND lower(email) = lower(auth.jwt()->>'email')
  );

CREATE POLICY "Admins can delete invitations" 
  ON public.invitations FOR DELETE TO authenticated
  USING (public.is_tenant_admin(tenant_id));

-- ============================================
-- RLS POLICIES - NOTIFICATIONS
-- ============================================
CREATE POLICY "Deny anonymous access to notifications" 
  ON public.notifications FOR ALL TO anon USING (false);

CREATE POLICY "Deny delete on notifications" 
  ON public.notifications FOR DELETE TO authenticated USING (false);

CREATE POLICY "Members can view notifications" 
  ON public.notifications FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Users can update own notifications" 
  ON public.notifications FOR UPDATE TO authenticated
  USING (
    public.is_tenant_member(tenant_id) 
    AND (user_id = auth.uid() OR user_id IS NULL)
  );

CREATE POLICY "Members can insert notifications" 
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- ============================================
-- RLS POLICIES - INTEGRATION_LOGS
-- ============================================
CREATE POLICY "Deny anonymous access to integration_logs"
  ON public.integration_logs FOR ALL USING (false);

CREATE POLICY "Members can view integration logs"
  ON public.integration_logs FOR SELECT
  USING (is_tenant_member(tenant_id));

CREATE POLICY "Members can insert integration logs"
  ON public.integration_logs FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can delete integration logs"
  ON public.integration_logs FOR DELETE
  USING (is_tenant_admin(tenant_id));

-- ============================================
-- SECURE VIEWS
-- ============================================

-- View segura para tenants (esconde tokens/API keys)
CREATE VIEW public.tenants_secure AS
SELECT 
    id,
    name,
    slug,
    logo_url,
    plan,
    status,
    max_agents,
    max_messages_month,
    settings,
    created_at,
    updated_at,
    CASE
        WHEN (EXISTS ( SELECT 1
           FROM tenant_users
          WHERE ((tenant_users.tenant_id = tenants.id) AND (tenant_users.user_id = auth.uid()) AND (tenant_users.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role])))))
          OR is_super_admin() THEN zapi_token
        ELSE NULL::text
    END AS zapi_token,
    CASE
        WHEN (EXISTS ( SELECT 1
           FROM tenant_users
          WHERE ((tenant_users.tenant_id = tenants.id) AND (tenant_users.user_id = auth.uid()) AND (tenant_users.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role])))))
          OR is_super_admin() THEN zapi_instance_id
        ELSE NULL::text
    END AS zapi_instance_id,
    CASE
        WHEN (EXISTS ( SELECT 1
           FROM tenant_users
          WHERE ((tenant_users.tenant_id = tenants.id) AND (tenant_users.user_id = auth.uid()) AND (tenant_users.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role])))))
          OR is_super_admin() THEN zapi_webhook_url
        ELSE NULL::text
    END AS zapi_webhook_url,
    CASE
        WHEN (EXISTS ( SELECT 1
           FROM tenant_users
          WHERE ((tenant_users.tenant_id = tenants.id) AND (tenant_users.user_id = auth.uid()) AND (tenant_users.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role])))))
          OR is_super_admin() THEN n8n_api_key
        ELSE NULL::text
    END AS n8n_api_key,
    CASE
        WHEN (EXISTS ( SELECT 1
           FROM tenant_users
          WHERE ((tenant_users.tenant_id = tenants.id) AND (tenant_users.user_id = auth.uid()) AND (tenant_users.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role])))))
          OR is_super_admin() THEN n8n_webhook_base
        ELSE NULL::text
    END AS n8n_webhook_base
FROM tenants
WHERE (id = get_user_tenant_id()) OR is_super_admin();

-- View segura para api_keys (esconde hash)
CREATE VIEW public.api_keys_secure 
WITH (security_invoker = on)
AS
SELECT 
  id,
  tenant_id,
  name,
  key_prefix,
  status,
  permissions,
  last_used_at,
  expires_at,
  created_by,
  created_at
FROM api_keys
WHERE tenant_id = get_user_tenant_id();

-- View segura para activity_logs
CREATE VIEW public.activity_logs_secure 
WITH (security_invoker = on)
AS
SELECT 
  id,
  tenant_id,
  user_id,
  action,
  entity_type,
  entity_id,
  old_values,
  new_values,
  metadata,
  created_at,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE tenant_users.tenant_id = activity_logs.tenant_id 
      AND tenant_users.user_id = auth.uid() 
      AND tenant_users.role IN ('owner', 'admin')
    ) THEN ip_address::text
    ELSE NULL
  END as ip_address,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE tenant_users.tenant_id = activity_logs.tenant_id 
      AND tenant_users.user_id = auth.uid() 
      AND tenant_users.role IN ('owner', 'admin')
    ) THEN user_agent
    ELSE NULL
  END as user_agent
FROM activity_logs
WHERE tenant_id = get_user_tenant_id();

-- View segura para invitations (esconde token)
CREATE VIEW public.invitations_secure 
WITH (security_invoker = on)
AS
SELECT 
  id,
  tenant_id,
  email,
  role,
  status,
  invited_by,
  expires_at,
  accepted_at,
  created_at
FROM invitations
WHERE tenant_id = get_user_tenant_id();

-- View segura para conversations (mascara telefone para membros)
CREATE VIEW public.conversations_secure 
WITH (security_invoker = on)
AS
SELECT 
  id,
  tenant_id,
  agent_id,
  contact_name,
  contact_photo_url,
  status,
  is_bot_active,
  sentiment,
  tags,
  context,
  transferred_to,
  started_at,
  last_message_at,
  closed_at,
  created_at,
  updated_at,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE tenant_users.tenant_id = conversations.tenant_id 
      AND tenant_users.user_id = auth.uid() 
      AND tenant_users.role IN ('owner', 'admin')
    ) THEN phone
    ELSE CONCAT(LEFT(phone, 4), '****', RIGHT(phone, 2))
  END as phone
FROM conversations
WHERE tenant_id = get_user_tenant_id();

-- Grant access to views
GRANT SELECT ON public.tenants_secure TO authenticated;
GRANT SELECT ON public.api_keys_secure TO authenticated;
GRANT SELECT ON public.activity_logs_secure TO authenticated;
GRANT SELECT ON public.invitations_secure TO authenticated;
GRANT SELECT ON public.conversations_secure TO authenticated;

-- ============================================
-- STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = 'avatars'
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = 'avatars'
);

CREATE POLICY "Anyone can view avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- ============================================
-- REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.invitations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- ============================================
-- FIM DO SCRIPT
-- ============================================
