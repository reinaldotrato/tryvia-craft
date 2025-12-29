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
        (payload) => {
          const newData = payload.new as {
            status: string;
            email: string;
            accepted_at: string | null;
          };
          
          if (newData.status === 'accepted' && newData.accepted_at) {
            toast({
              title: 'Convite aceito! 🎉',
              description: `${newData.email} aceitou o convite e entrou na equipe.`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);
}
