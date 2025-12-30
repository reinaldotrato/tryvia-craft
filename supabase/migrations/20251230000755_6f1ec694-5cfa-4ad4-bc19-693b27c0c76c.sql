-- Drop and recreate tenants_secure view to allow Super Admins to see all tenants
DROP VIEW IF EXISTS public.tenants_secure;

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