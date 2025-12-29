-- ============================================
-- FASE 3 & 4: Sistema Admin Master + Permissões Granulares
-- ============================================

-- 1. Criar tabela de super admins (admin master da plataforma)
CREATE TABLE IF NOT EXISTS public.super_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Super admins podem ver a si mesmos
CREATE POLICY "Super admins can view themselves"
ON public.super_admins
FOR SELECT
USING (user_id = auth.uid());

-- Deny anonymous
CREATE POLICY "Deny anonymous access to super_admins"
ON public.super_admins
FOR ALL
TO anon
USING (false);

-- 2. Criar função para verificar se é super admin
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

-- 3. Criar tabela de permissões granulares por usuário
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id, permission)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Deny anonymous
CREATE POLICY "Deny anonymous access to user_permissions"
ON public.user_permissions
FOR ALL
TO anon
USING (false);

-- Admins podem ver permissões do tenant
CREATE POLICY "Admins can view user permissions"
ON public.user_permissions
FOR SELECT
USING (is_tenant_admin(tenant_id));

-- Admins podem gerenciar permissões
CREATE POLICY "Admins can manage user permissions"
ON public.user_permissions
FOR ALL
USING (is_tenant_admin(tenant_id))
WITH CHECK (is_tenant_admin(tenant_id));

-- Usuários podem ver suas próprias permissões
CREATE POLICY "Users can view own permissions"
ON public.user_permissions
FOR SELECT
USING (user_id = auth.uid());

-- 4. Atualizar políticas do tenants para permitir super admins
CREATE POLICY "Super admins can view all tenants"
ON public.tenants
FOR SELECT
USING (is_super_admin());

CREATE POLICY "Super admins can insert tenants"
ON public.tenants
FOR INSERT
WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can update all tenants"
ON public.tenants
FOR UPDATE
USING (is_super_admin());

CREATE POLICY "Super admins can delete tenants"
ON public.tenants
FOR DELETE
USING (is_super_admin());

-- 5. Super admins podem ver todos tenant_users
CREATE POLICY "Super admins can view all tenant_users"
ON public.tenant_users
FOR SELECT
USING (is_super_admin());

CREATE POLICY "Super admins can manage all tenant_users"
ON public.tenant_users
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- 6. Super admins podem ver todas conversas
CREATE POLICY "Super admins can view all conversations"
ON public.conversations
FOR SELECT
USING (is_super_admin());

-- 7. Super admins podem ver todos agentes
CREATE POLICY "Super admins can view all agents"
ON public.agents
FOR SELECT
USING (is_super_admin());

-- 8. Super admins podem ver todos logs
CREATE POLICY "Super admins can view all activity_logs"
ON public.activity_logs
FOR SELECT
USING (is_super_admin());

-- 9. Criar função para verificar permissão específica do usuário
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

-- 10. Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_tenant_id ON public.user_permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_super_admins_user_id ON public.super_admins(user_id);