import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "login_required">("loading");
  const [message, setMessage] = useState("");
  const [tenantName, setTenantName] = useState("");

  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Token de convite inválido ou ausente.");
      return;
    }

    if (!user) {
      setStatus("login_required");
      setMessage("Você precisa fazer login para aceitar o convite.");
      return;
    }

    acceptInvitation();
  }, [token, user]);

  const acceptInvitation = async () => {
    if (!token || !user) return;

    try {
      // Get invitation details
      const { data: invitation, error: inviteError } = await supabase
        .from("invitations")
        .select("*, tenants(name)")
        .eq("token", token)
        .eq("status", "pending")
        .single();

      if (inviteError || !invitation) {
        setStatus("error");
        setMessage("Convite não encontrado ou já foi utilizado.");
        return;
      }

      // Check if invitation is expired
      if (new Date(invitation.expires_at) < new Date()) {
        setStatus("error");
        setMessage("Este convite expirou.");
        return;
      }

      // Check if user email matches invitation
      if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
        setStatus("error");
        setMessage(`Este convite foi enviado para ${invitation.email}. Faça login com esse email.`);
        return;
      }

      setTenantName((invitation.tenants as any)?.name || "");

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from("tenant_users")
        .select("id")
        .eq("tenant_id", invitation.tenant_id)
        .eq("user_id", user.id)
        .single();

      if (existingMember) {
        setStatus("error");
        setMessage("Você já é membro deste workspace.");
        return;
      }

      // Add user to tenant
      const { error: memberError } = await supabase
        .from("tenant_users")
        .insert({
          tenant_id: invitation.tenant_id,
          user_id: user.id,
          role: invitation.role,
          status: "active",
          accepted_at: new Date().toISOString(),
        });

      if (memberError) {
        console.error("Error adding member:", memberError);
        setStatus("error");
        setMessage("Erro ao aceitar convite. Tente novamente.");
        return;
      }

      // Update invitation status
      await supabase
        .from("invitations")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", invitation.id);

      setStatus("success");
      setMessage("Convite aceito com sucesso!");

      // Redirect after a short delay
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (error) {
      console.error("Accept invite error:", error);
      setStatus("error");
      setMessage("Erro inesperado ao processar convite.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-8 max-w-md w-full text-center space-y-6"
      >
        {status === "loading" && (
          <>
            <Loader2 className="w-16 h-16 mx-auto text-purple animate-spin" />
            <h1 className="text-2xl font-bold text-foreground">Processando convite...</h1>
            <p className="text-muted-foreground">Aguarde um momento.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 mx-auto rounded-full bg-success/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Bem-vindo!</h1>
            <p className="text-muted-foreground">
              Você agora faz parte de <strong className="text-foreground">{tenantName}</strong>.
              Redirecionando...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Ops!</h1>
            <p className="text-muted-foreground">{message}</p>
            <Button onClick={() => navigate("/dashboard")}>Ir para Dashboard</Button>
          </>
        )}

        {status === "login_required" && (
          <>
            <div className="w-16 h-16 mx-auto rounded-full bg-warning/20 flex items-center justify-center">
              <span className="text-3xl">🔐</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Login necessário</h1>
            <p className="text-muted-foreground">{message}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate(`/login?redirect=/accept-invite?token=${token}`)}>
                Fazer Login
              </Button>
              <Button onClick={() => navigate(`/signup?redirect=/accept-invite?token=${token}`)}>
                Criar Conta
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
