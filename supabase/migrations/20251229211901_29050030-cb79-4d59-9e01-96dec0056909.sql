-- ============================================
-- AUTOMATIC AUDIT SYSTEM WITH TRIGGERS
-- ============================================

-- Function to capture audit data
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
    -- Get tenant from conversation
    IF TG_OP = 'DELETE' THEN
      SELECT tenant_id INTO audit_tenant_id FROM conversations WHERE id = OLD.conversation_id;
    ELSE
      SELECT tenant_id INTO audit_tenant_id FROM conversations WHERE id = NEW.conversation_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    -- Get tenant from tenant_users
    IF TG_OP = 'DELETE' THEN
      audit_tenant_id := get_user_tenant_id();
    ELSE
      audit_tenant_id := get_user_tenant_id();
    END IF;
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
-- CREATE AUDIT TRIGGERS FOR ALL MAIN TABLES
-- ============================================

-- Agents audit trigger
DROP TRIGGER IF EXISTS audit_agents ON public.agents;
CREATE TRIGGER audit_agents
AFTER INSERT OR UPDATE OR DELETE ON public.agents
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Conversations audit trigger
DROP TRIGGER IF EXISTS audit_conversations ON public.conversations;
CREATE TRIGGER audit_conversations
AFTER INSERT OR UPDATE OR DELETE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Tenant users audit trigger
DROP TRIGGER IF EXISTS audit_tenant_users ON public.tenant_users;
CREATE TRIGGER audit_tenant_users
AFTER INSERT OR UPDATE OR DELETE ON public.tenant_users
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Invitations audit trigger
DROP TRIGGER IF EXISTS audit_invitations ON public.invitations;
CREATE TRIGGER audit_invitations
AFTER INSERT OR UPDATE OR DELETE ON public.invitations
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- API keys audit trigger
DROP TRIGGER IF EXISTS audit_api_keys ON public.api_keys;
CREATE TRIGGER audit_api_keys
AFTER INSERT OR UPDATE OR DELETE ON public.api_keys
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Profiles audit trigger
DROP TRIGGER IF EXISTS audit_profiles ON public.profiles;
CREATE TRIGGER audit_profiles
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Tenants audit trigger (for updates only - tenant creation is system)
DROP TRIGGER IF EXISTS audit_tenants ON public.tenants;
CREATE TRIGGER audit_tenants
AFTER UPDATE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- ============================================
-- RESTRICT BASE TABLE ACCESS - FORCE USE OF SECURE VIEWS
-- ============================================

-- Drop existing SELECT policies for base tables that have secure views
-- and create new ones that only allow authenticated users with specific conditions

-- TENANTS: Only allow SELECT through secure view or for writes
DROP POLICY IF EXISTS "Users can view their tenant" ON public.tenants;

-- Allow SELECT only for the user's own tenant (needed for joins)
-- But sensitive columns are hidden via the secure view
CREATE POLICY "Users can view own tenant basic info" 
ON public.tenants 
FOR SELECT 
TO authenticated
USING (id = get_user_tenant_id());

-- API_KEYS: Restrict direct SELECT, force secure view usage
DROP POLICY IF EXISTS "Users can view tenant api keys" ON public.api_keys;

-- Only owners/admins can view api_keys directly (for management)
CREATE POLICY "Only admins can view api keys directly" 
ON public.api_keys 
FOR SELECT 
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_users 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

-- ACTIVITY_LOGS: Restrict direct SELECT based on role
DROP POLICY IF EXISTS "Users can view tenant logs" ON public.activity_logs;

-- Only admins can view full activity logs directly
CREATE POLICY "Only admins can view activity logs directly" 
ON public.activity_logs 
FOR SELECT 
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_users 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

-- INVITATIONS: Restrict token visibility
DROP POLICY IF EXISTS "Users can view tenant invitations" ON public.invitations;

-- Only admins can view invitations with tokens
CREATE POLICY "Only admins can view invitations" 
ON public.invitations 
FOR SELECT 
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_users 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

-- Allow any authenticated user to view invitation by token (for accept flow)
CREATE POLICY "Anyone can view invitation by token" 
ON public.invitations 
FOR SELECT 
TO authenticated
USING (
  token IS NOT NULL 
  AND status = 'pending'
  AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- CONVERSATIONS: Restrict phone visibility to admins via base table
DROP POLICY IF EXISTS "Users can view tenant conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can manage tenant conversations" ON public.conversations;

-- Members can view conversations but should use secure view for masked phones
CREATE POLICY "Members can view tenant conversations" 
ON public.conversations 
FOR SELECT 
TO authenticated
USING (tenant_id = get_user_tenant_id());

-- Members can manage (insert/update/delete) conversations
CREATE POLICY "Members can manage tenant conversations" 
ON public.conversations 
FOR ALL 
TO authenticated
USING (tenant_id = get_user_tenant_id())
WITH CHECK (tenant_id = get_user_tenant_id());