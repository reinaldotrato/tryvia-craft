import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  role: "admin" | "member" | "viewer";
  tenantId: string;
  tenantName: string;
  inviterName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create supabase client with service role for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Create user-scoped client to verify the request
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, role, tenantId, tenantName, inviterName }: InviteRequest = await req.json();

    // Validate input
    if (!email || !role || !tenantId || !tenantName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user has permission to invite
    const { data: tenantUser, error: tenantError } = await supabaseAdmin
      .from("tenant_users")
      .select("role")
      .eq("user_id", user.id)
      .eq("tenant_id", tenantId)
      .single();

    if (tenantError || !tenantUser || !["owner", "admin"].includes(tenantUser.role)) {
      console.error("Permission error:", tenantError);
      return new Response(
        JSON.stringify({ error: "You don't have permission to invite users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email is already invited or a member
    const { data: existingInvite } = await supabaseAdmin
      .from("invitations")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("email", email.toLowerCase())
      .eq("status", "pending")
      .single();

    if (existingInvite) {
      return new Response(
        JSON.stringify({ error: "This email already has a pending invitation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate unique token
    const token = crypto.randomUUID();

    // Create invitation record
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from("invitations")
      .insert({
        tenant_id: tenantId,
        email: email.toLowerCase(),
        role,
        token,
        invited_by: user.id,
        status: "pending",
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Invite creation error:", inviteError);
      return new Response(
        JSON.stringify({ error: "Failed to create invitation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the app URL from environment or use default
    const appUrl = Deno.env.get("APP_URL") || "https://pfsmikupgqyezsroqigf.lovable.app";
    const inviteUrl = `${appUrl}/accept-invite?token=${token}`;

    // Send invitation email using Resend API directly
    const roleLabels: Record<string, string> = {
      admin: "Administrador",
      member: "Membro",
      viewer: "Visualizador",
    };

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f0f1a; color: #ffffff; padding: 40px 20px;">
        <div style="max-width: 500px; margin: 0 auto; background: linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(236, 72, 153, 0.1)); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 40px;">
          <h1 style="margin: 0 0 20px 0; font-size: 24px; background: linear-gradient(135deg, #EC4899, #7C3AED); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
            Você foi convidado!
          </h1>
          <p style="color: #a0aec0; line-height: 1.6; margin: 0 0 20px 0;">
            <strong style="color: #ffffff;">${inviterName}</strong> convidou você para fazer parte de <strong style="color: #ffffff;">${tenantName}</strong> como <strong style="color: #7C3AED;">${roleLabels[role]}</strong>.
          </p>
          <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #7C3AED, #EC4899); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 20px 0;">
            Aceitar Convite
          </a>
          <p style="color: #64748b; font-size: 14px; margin: 20px 0 0 0;">
            Este convite expira em 7 dias. Se você não esperava este email, pode ignorá-lo.
          </p>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Tryvia <onboarding@resend.dev>",
        to: [email],
        subject: `${inviterName} convidou você para ${tenantName}`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error("Resend error:", errorData);
      // Still return success for the invitation, just log email error
    } else {
      console.log("Email sent successfully");
    }

    return new Response(
      JSON.stringify({ success: true, invitation }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-invite function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
