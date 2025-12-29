-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their tenant notifications
CREATE POLICY "Users can view tenant notifications"
ON public.notifications
FOR SELECT
USING (tenant_id = get_user_tenant_id());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (tenant_id = get_user_tenant_id() AND (user_id = auth.uid() OR user_id IS NULL));

-- System can insert notifications
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;