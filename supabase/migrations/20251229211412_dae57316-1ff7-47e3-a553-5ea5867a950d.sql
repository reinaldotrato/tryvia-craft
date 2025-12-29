-- ============================================
-- ADD EXPLICIT DENY POLICIES FOR ANONYMOUS USERS
-- This prevents data access if authentication is bypassed
-- ============================================

-- Profiles: Deny anonymous access
CREATE POLICY "Deny anonymous access to profiles" 
ON public.profiles 
FOR ALL 
TO anon 
USING (false);

-- Messages: Deny anonymous access
CREATE POLICY "Deny anonymous access to messages" 
ON public.messages 
FOR ALL 
TO anon 
USING (false);

-- Conversations: Deny anonymous access
CREATE POLICY "Deny anonymous access to conversations" 
ON public.conversations 
FOR ALL 
TO anon 
USING (false);

-- Agents: Deny anonymous access
CREATE POLICY "Deny anonymous access to agents" 
ON public.agents 
FOR ALL 
TO anon 
USING (false);

-- Tenants: Deny anonymous access
CREATE POLICY "Deny anonymous access to tenants" 
ON public.tenants 
FOR ALL 
TO anon 
USING (false);

-- User roles: Deny anonymous access
CREATE POLICY "Deny anonymous access to user_roles" 
ON public.user_roles 
FOR ALL 
TO anon 
USING (false);

-- Tenant users: Deny anonymous access
CREATE POLICY "Deny anonymous access to tenant_users" 
ON public.tenant_users 
FOR ALL 
TO anon 
USING (false);

-- Activity logs: Deny anonymous access
CREATE POLICY "Deny anonymous access to activity_logs" 
ON public.activity_logs 
FOR ALL 
TO anon 
USING (false);

-- API keys: Deny anonymous access
CREATE POLICY "Deny anonymous access to api_keys" 
ON public.api_keys 
FOR ALL 
TO anon 
USING (false);

-- Agent analytics: Deny anonymous access
CREATE POLICY "Deny anonymous access to agent_analytics" 
ON public.agent_analytics 
FOR ALL 
TO anon 
USING (false);

-- Invitations: Deny anonymous access
CREATE POLICY "Deny anonymous access to invitations" 
ON public.invitations 
FOR ALL 
TO anon 
USING (false);

-- Notifications: Deny anonymous access
CREATE POLICY "Deny anonymous access to notifications" 
ON public.notifications 
FOR ALL 
TO anon 
USING (false);