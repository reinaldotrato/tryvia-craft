-- Create collaborators table for storing complete employee data
CREATE TABLE public.collaborators (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  whatsapp text,
  job_title text,
  description text,
  avatar_url text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create index for faster queries
CREATE INDEX idx_collaborators_tenant_id ON public.collaborators(tenant_id);
CREATE INDEX idx_collaborators_email ON public.collaborators(email);

-- Enable RLS
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Deny anonymous access to collaborators"
ON public.collaborators
FOR ALL
USING (false);

CREATE POLICY "Members can view collaborators"
ON public.collaborators
FOR SELECT
USING (is_tenant_member(tenant_id));

CREATE POLICY "Admins can insert collaborators"
ON public.collaborators
FOR INSERT
WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "Admins can update collaborators"
ON public.collaborators
FOR UPDATE
USING (is_tenant_admin(tenant_id));

CREATE POLICY "Admins can delete collaborators"
ON public.collaborators
FOR DELETE
USING (is_tenant_admin(tenant_id));

CREATE POLICY "Super admins can manage all collaborators"
ON public.collaborators
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Trigger for updated_at
CREATE TRIGGER update_collaborators_updated_at
  BEFORE UPDATE ON public.collaborators
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();