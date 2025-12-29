import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export function useInvitationNotifications() {
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('invitation-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'invitations',
        },
        async (payload) => {
          const newData = payload.new as {
            status: string;
            email: string;
            accepted_at: string | null;
            tenant_id: string;
          };
          
          if (newData.status === 'accepted' && newData.accepted_at) {
            // Show toast notification
            toast({
              title: 'Convite aceito! 🎉',
              description: `${newData.email} aceitou o convite e entrou na equipe.`,
            });

            // Save to notifications table
            await supabase.from('notifications').insert({
              tenant_id: newData.tenant_id,
              title: 'Novo membro na equipe',
              message: `${newData.email} aceitou o convite e entrou na equipe.`,
              type: 'invite_accepted',
              metadata: { email: newData.email },
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const notification = payload.new as {
            title: string;
            message: string;
          };
          
          toast({
            title: notification.title,
            description: notification.message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);
}
