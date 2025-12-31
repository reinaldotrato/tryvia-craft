-- Update audit_trigger_function to skip logging when tenant no longer exists (cascade deletes)
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
DECLARE
  audit_user_id UUID;
  audit_tenant_id UUID;
  old_data JSONB;
  new_data JSONB;
BEGIN
  -- Skip audit for tenant DELETE operations (would cause FK violation)
  IF TG_TABLE_NAME = 'tenants' AND TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  -- Get current user ID
  audit_user_id := auth.uid();
  
  -- Get tenant ID based on table
  IF TG_TABLE_NAME = 'tenants' THEN
    IF TG_OP = 'DELETE' THEN
      audit_tenant_id := OLD.id;
    ELSE
      audit_tenant_id := NEW.id;
    END IF;
  ELSIF TG_TABLE_NAME IN ('agents', 'conversations', 'invitations', 'notifications', 'api_keys', 'agent_analytics', 'collaborators') THEN
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

  -- Skip if tenant no longer exists (cascade deletes) to avoid FK violation
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = audit_tenant_id) THEN
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
$function$;