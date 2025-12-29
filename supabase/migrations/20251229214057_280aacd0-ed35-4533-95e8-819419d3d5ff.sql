-- 1. Drop existing policies on tenant_users that cause recursion
DROP POLICY IF EXISTS "Deny anonymous access to tenant_users" ON public.tenant_users;
DROP POLICY IF EXISTS "Owners and admins can manage members" ON public.tenant_users;
DROP POLICY IF EXISTS "Users can view tenant members" ON public.tenant_users;

-- 2. Update get_user_tenant_id to bypass RLS
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT tenant_id FROM public.tenant_users 
  WHERE user_id = auth.uid() 
  AND status = 'active'
  LIMIT 1
$$;

-- 3. Create is_tenant_admin helper function
CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_users
    WHERE user_id = auth.uid()
      AND tenant_id = p_tenant_id
      AND role IN ('owner', 'admin')
      AND status = 'active'
  )
$$;

-- 4. Create is_tenant_member helper function
CREATE OR REPLACE FUNCTION public.is_tenant_member(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_users
    WHERE user_id = auth.uid()
      AND tenant_id = p_tenant_id
      AND status = 'active'
  )
$$;

-- 5. Recreate tenant_users policies without recursion
CREATE POLICY "Deny anonymous access to tenant_users" 
ON public.tenant_users 
FOR ALL 
TO anon
USING (false);

CREATE POLICY "Users can view own tenant members" 
ON public.tenant_users 
FOR SELECT 
TO authenticated
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins can manage tenant members" 
ON public.tenant_users 
FOR ALL 
TO authenticated
USING (public.is_tenant_admin(tenant_id))
WITH CHECK (public.is_tenant_admin(tenant_id));

CREATE POLICY "Users can insert themselves via invitation" 
ON public.tenant_users 
FOR INSERT 
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM public.invitations i 
    WHERE i.tenant_id = tenant_users.tenant_id 
    AND lower(i.email) = lower(auth.jwt()->>'email')
    AND i.status = 'pending' 
    AND i.expires_at > now()
  )
);

-- 6. Update tenants policies
DROP POLICY IF EXISTS "Deny anonymous access to tenants" ON public.tenants;
DROP POLICY IF EXISTS "Owners and admins can update tenant" ON public.tenants;
DROP POLICY IF EXISTS "Users can view own tenant basic info" ON public.tenants;

CREATE POLICY "Deny anonymous access to tenants" 
ON public.tenants 
FOR ALL 
TO anon
USING (false);

CREATE POLICY "Users can view own tenant" 
ON public.tenants 
FOR SELECT 
TO authenticated
USING (id = public.get_user_tenant_id());

CREATE POLICY "Admins can update tenant" 
ON public.tenants 
FOR UPDATE 
TO authenticated
USING (public.is_tenant_admin(id));

-- 7. Update invitations policies
DROP POLICY IF EXISTS "Deny anonymous access to invitations" ON public.invitations;
DROP POLICY IF EXISTS "Only admins can view invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON public.invitations;
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.invitations;

CREATE POLICY "Deny anonymous access to invitations" 
ON public.invitations 
FOR ALL 
TO anon
USING (false);

CREATE POLICY "Admins can view invitations" 
ON public.invitations 
FOR SELECT 
TO authenticated
USING (public.is_tenant_admin(tenant_id));

CREATE POLICY "Users can view their own invitation" 
ON public.invitations 
FOR SELECT 
TO authenticated
USING (
  status = 'pending' 
  AND lower(email) = lower(auth.jwt()->>'email')
  AND expires_at > now()
);

CREATE POLICY "Admins can create invitations" 
ON public.invitations 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_tenant_admin(tenant_id));

CREATE POLICY "Admins can update invitations" 
ON public.invitations 
FOR UPDATE 
TO authenticated
USING (public.is_tenant_admin(tenant_id));

CREATE POLICY "Users can update their own invitation" 
ON public.invitations 
FOR UPDATE 
TO authenticated
USING (
  status = 'pending' 
  AND lower(email) = lower(auth.jwt()->>'email')
);

CREATE POLICY "Admins can delete invitations" 
ON public.invitations 
FOR DELETE 
TO authenticated
USING (public.is_tenant_admin(tenant_id));

-- 8. Update api_keys policies
DROP POLICY IF EXISTS "Deny anonymous access to api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "Only admins can view api keys directly" ON public.api_keys;
DROP POLICY IF EXISTS "Owners and admins can manage api keys" ON public.api_keys;

CREATE POLICY "Deny anonymous access to api_keys" 
ON public.api_keys 
FOR ALL 
TO anon
USING (false);

CREATE POLICY "Admins can view api keys" 
ON public.api_keys 
FOR SELECT 
TO authenticated
USING (public.is_tenant_admin(tenant_id));

CREATE POLICY "Admins can manage api keys" 
ON public.api_keys 
FOR ALL 
TO authenticated
USING (public.is_tenant_admin(tenant_id))
WITH CHECK (public.is_tenant_admin(tenant_id));

-- 9. Update activity_logs policies
DROP POLICY IF EXISTS "Deny anonymous access to activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Deny delete on activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Deny update on activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Only admins can view activity logs directly" ON public.activity_logs;
DROP POLICY IF EXISTS "Users can insert logs" ON public.activity_logs;

CREATE POLICY "Deny anonymous access to activity_logs" 
ON public.activity_logs 
FOR ALL 
TO anon
USING (false);

CREATE POLICY "Deny delete on activity_logs" 
ON public.activity_logs 
FOR DELETE 
TO authenticated
USING (false);

CREATE POLICY "Deny update on activity_logs" 
ON public.activity_logs 
FOR UPDATE 
TO authenticated
USING (false);

CREATE POLICY "Admins can view activity logs" 
ON public.activity_logs 
FOR SELECT 
TO authenticated
USING (public.is_tenant_admin(tenant_id));

CREATE POLICY "Users can insert logs" 
ON public.activity_logs 
FOR INSERT 
TO authenticated
WITH CHECK (tenant_id = public.get_user_tenant_id());

-- 10. Update agents policies
DROP POLICY IF EXISTS "Deny anonymous access to agents" ON public.agents;
DROP POLICY IF EXISTS "Users can view tenant agents" ON public.agents;
DROP POLICY IF EXISTS "Members can create agents" ON public.agents;
DROP POLICY IF EXISTS "Members can update agents" ON public.agents;
DROP POLICY IF EXISTS "Owners and admins can delete agents" ON public.agents;

CREATE POLICY "Deny anonymous access to agents" 
ON public.agents 
FOR ALL 
TO anon
USING (false);

CREATE POLICY "Members can view agents" 
ON public.agents 
FOR SELECT 
TO authenticated
USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Members can create agents" 
ON public.agents 
FOR INSERT 
TO authenticated
WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Members can update agents" 
ON public.agents 
FOR UPDATE 
TO authenticated
USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Admins can delete agents" 
ON public.agents 
FOR DELETE 
TO authenticated
USING (public.is_tenant_admin(tenant_id));

-- 11. Update conversations policies
DROP POLICY IF EXISTS "Deny anonymous access to conversations" ON public.conversations;
DROP POLICY IF EXISTS "Members can view tenant conversations" ON public.conversations;
DROP POLICY IF EXISTS "Members can manage tenant conversations" ON public.conversations;

CREATE POLICY "Deny anonymous access to conversations" 
ON public.conversations 
FOR ALL 
TO anon
USING (false);

CREATE POLICY "Members can view conversations" 
ON public.conversations 
FOR SELECT 
TO authenticated
USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Members can manage conversations" 
ON public.conversations 
FOR ALL 
TO authenticated
USING (public.is_tenant_member(tenant_id))
WITH CHECK (tenant_id = public.get_user_tenant_id());

-- 12. Update notifications policies
DROP POLICY IF EXISTS "Deny anonymous access to notifications" ON public.notifications;
DROP POLICY IF EXISTS "Deny delete on notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view tenant notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY "Deny anonymous access to notifications" 
ON public.notifications 
FOR ALL 
TO anon
USING (false);

CREATE POLICY "Deny delete on notifications" 
ON public.notifications 
FOR DELETE 
TO authenticated
USING (false);

CREATE POLICY "Members can view notifications" 
ON public.notifications 
FOR SELECT 
TO authenticated
USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Users can update own notifications" 
ON public.notifications 
FOR UPDATE 
TO authenticated
USING (
  public.is_tenant_member(tenant_id) 
  AND (user_id = auth.uid() OR user_id IS NULL)
);

CREATE POLICY "Members can insert notifications" 
ON public.notifications 
FOR INSERT 
TO authenticated
WITH CHECK (tenant_id = public.get_user_tenant_id());

-- 13. Update agent_analytics policies
DROP POLICY IF EXISTS "Deny anonymous access to agent_analytics" ON public.agent_analytics;
DROP POLICY IF EXISTS "Deny delete on agent_analytics" ON public.agent_analytics;
DROP POLICY IF EXISTS "Deny insert on agent_analytics" ON public.agent_analytics;
DROP POLICY IF EXISTS "Deny update on agent_analytics" ON public.agent_analytics;
DROP POLICY IF EXISTS "Users can view tenant analytics" ON public.agent_analytics;

CREATE POLICY "Deny anonymous access to agent_analytics" 
ON public.agent_analytics 
FOR ALL 
TO anon
USING (false);

CREATE POLICY "Deny delete on agent_analytics" 
ON public.agent_analytics 
FOR DELETE 
TO authenticated
USING (false);

CREATE POLICY "Deny insert on agent_analytics" 
ON public.agent_analytics 
FOR INSERT 
TO authenticated
WITH CHECK (false);

CREATE POLICY "Deny update on agent_analytics" 
ON public.agent_analytics 
FOR UPDATE 
TO authenticated
USING (false);

CREATE POLICY "Members can view analytics" 
ON public.agent_analytics 
FOR SELECT 
TO authenticated
USING (public.is_tenant_member(tenant_id));

-- 14. Update messages policies
DROP POLICY IF EXISTS "Deny anonymous access to messages" ON public.messages;
DROP POLICY IF EXISTS "Deny delete on messages" ON public.messages;
DROP POLICY IF EXISTS "Deny update on messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view conversation messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;

CREATE POLICY "Deny anonymous access to messages" 
ON public.messages 
FOR ALL 
TO anon
USING (false);

CREATE POLICY "Deny delete on messages" 
ON public.messages 
FOR DELETE 
TO authenticated
USING (false);

CREATE POLICY "Deny update on messages" 
ON public.messages 
FOR UPDATE 
TO authenticated
USING (false);

CREATE POLICY "Members can view messages" 
ON public.messages 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = messages.conversation_id 
    AND public.is_tenant_member(c.tenant_id)
  )
);

CREATE POLICY "Members can insert messages" 
ON public.messages 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = messages.conversation_id 
    AND public.is_tenant_member(c.tenant_id)
  )
);