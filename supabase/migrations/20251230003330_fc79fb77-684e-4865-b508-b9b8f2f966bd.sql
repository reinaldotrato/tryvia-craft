-- Add zapi_client_token column to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS zapi_client_token TEXT;