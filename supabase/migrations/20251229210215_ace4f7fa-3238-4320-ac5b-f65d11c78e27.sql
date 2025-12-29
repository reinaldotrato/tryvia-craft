-- ============================================
-- FIX: Function search_path mutable
-- ============================================
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

-- ============================================
-- SECURE VIEWS: Hide sensitive data from regular members
-- ============================================

-- View segura para tenants (esconde tokens/API keys)
CREATE OR REPLACE VIEW public.tenants_secure AS
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
  -- Mostrar tokens apenas para owners/admins
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE tenant_users.tenant_id = tenants.id 
      AND tenant_users.user_id = auth.uid() 
      AND tenant_users.role IN ('owner', 'admin')
    ) THEN zapi_token
    ELSE NULL
  END as zapi_token,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE tenant_users.tenant_id = tenants.id 
      AND tenant_users.user_id = auth.uid() 
      AND tenant_users.role IN ('owner', 'admin')
    ) THEN zapi_instance_id
    ELSE NULL
  END as zapi_instance_id,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE tenant_users.tenant_id = tenants.id 
      AND tenant_users.user_id = auth.uid() 
      AND tenant_users.role IN ('owner', 'admin')
    ) THEN zapi_webhook_url
    ELSE NULL
  END as zapi_webhook_url,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE tenant_users.tenant_id = tenants.id 
      AND tenant_users.user_id = auth.uid() 
      AND tenant_users.role IN ('owner', 'admin')
    ) THEN n8n_api_key
    ELSE NULL
  END as n8n_api_key,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE tenant_users.tenant_id = tenants.id 
      AND tenant_users.user_id = auth.uid() 
      AND tenant_users.role IN ('owner', 'admin')
    ) THEN n8n_webhook_base
    ELSE NULL
  END as n8n_webhook_base
FROM tenants
WHERE id = get_user_tenant_id();

-- View segura para api_keys (esconde hash)
CREATE OR REPLACE VIEW public.api_keys_secure AS
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
  -- key_hash é EXCLUÍDO intencionalmente
FROM api_keys
WHERE tenant_id = get_user_tenant_id();

-- View segura para activity_logs (esconde IP/user_agent para não-admins)
CREATE OR REPLACE VIEW public.activity_logs_secure AS
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
CREATE OR REPLACE VIEW public.invitations_secure AS
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
  -- token é EXCLUÍDO intencionalmente para membros
FROM invitations
WHERE tenant_id = get_user_tenant_id();

-- View segura para conversations (mascara telefone para membros)
CREATE OR REPLACE VIEW public.conversations_secure AS
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

-- ============================================
-- RESTRICTIVE RLS POLICIES
-- ============================================

-- Activity Logs: Make immutable (no UPDATE/DELETE)
CREATE POLICY "Deny update on activity_logs" 
ON public.activity_logs 
FOR UPDATE 
USING (false);

CREATE POLICY "Deny delete on activity_logs" 
ON public.activity_logs 
FOR DELETE 
USING (false);

-- Messages: Make immutable (no UPDATE/DELETE by users)
CREATE POLICY "Deny update on messages" 
ON public.messages 
FOR UPDATE 
USING (false);

CREATE POLICY "Deny delete on messages" 
ON public.messages 
FOR DELETE 
USING (false);

-- Agent Analytics: Only system can write
CREATE POLICY "Deny insert on agent_analytics" 
ON public.agent_analytics 
FOR INSERT 
WITH CHECK (false);

CREATE POLICY "Deny update on agent_analytics" 
ON public.agent_analytics 
FOR UPDATE 
USING (false);

CREATE POLICY "Deny delete on agent_analytics" 
ON public.agent_analytics 
FOR DELETE 
USING (false);

-- Notifications: Users cannot delete
CREATE POLICY "Deny delete on notifications" 
ON public.notifications 
FOR DELETE 
USING (false);

-- Profiles: Only system can create via trigger
CREATE POLICY "System creates profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (id = auth.uid());

CREATE POLICY "Deny delete on profiles" 
ON public.profiles 
FOR DELETE 
USING (false);

-- ============================================
-- GRANT ACCESS TO VIEWS
-- ============================================
GRANT SELECT ON public.tenants_secure TO authenticated;
GRANT SELECT ON public.api_keys_secure TO authenticated;
GRANT SELECT ON public.activity_logs_secure TO authenticated;
GRANT SELECT ON public.invitations_secure TO authenticated;
GRANT SELECT ON public.conversations_secure TO authenticated;