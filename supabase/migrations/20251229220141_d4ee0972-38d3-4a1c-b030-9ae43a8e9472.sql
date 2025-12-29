-- Create integration_logs table for tracking Z-API connection events
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

-- Create index for faster queries
CREATE INDEX idx_integration_logs_tenant_created ON public.integration_logs(tenant_id, created_at DESC);
CREATE INDEX idx_integration_logs_type ON public.integration_logs(integration_type);

-- Enable RLS
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Deny anonymous access to integration_logs"
ON public.integration_logs
FOR ALL
USING (false);

CREATE POLICY "Members can view integration logs"
ON public.integration_logs
FOR SELECT
USING (is_tenant_member(tenant_id));

CREATE POLICY "Members can insert integration logs"
ON public.integration_logs
FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can delete integration logs"
ON public.integration_logs
FOR DELETE
USING (is_tenant_admin(tenant_id));