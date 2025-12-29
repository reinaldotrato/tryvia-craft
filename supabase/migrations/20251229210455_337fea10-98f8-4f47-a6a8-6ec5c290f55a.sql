-- ============================================
-- FIX: Remove SECURITY DEFINER from views
-- Recreate views with SECURITY INVOKER (default, safer)
-- ============================================

-- Drop and recreate tenants_secure with SECURITY INVOKER
DROP VIEW IF EXISTS public.tenants_secure;
CREATE VIEW public.tenants_secure 
WITH (security_invoker = on)
AS
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

-- Drop and recreate api_keys_secure with SECURITY INVOKER
DROP VIEW IF EXISTS public.api_keys_secure;
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

-- Drop and recreate activity_logs_secure with SECURITY INVOKER
DROP VIEW IF EXISTS public.activity_logs_secure;
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

-- Drop and recreate invitations_secure with SECURITY INVOKER
DROP VIEW IF EXISTS public.invitations_secure;
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

-- Drop and recreate conversations_secure with SECURITY INVOKER
DROP VIEW IF EXISTS public.conversations_secure;
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

-- Re-grant access to views
GRANT SELECT ON public.tenants_secure TO authenticated;
GRANT SELECT ON public.api_keys_secure TO authenticated;
GRANT SELECT ON public.activity_logs_secure TO authenticated;
GRANT SELECT ON public.invitations_secure TO authenticated;
GRANT SELECT ON public.conversations_secure TO authenticated;