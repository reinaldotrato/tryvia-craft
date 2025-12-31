import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  email: string;
  role: "admin" | "member" | "viewer";
  tenantName: string;
  inviterName: string;
  token: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, role, tenantName, inviterName, token }: SendEmailRequest = await req.json();

    // Validate input
    if (!email || !role || !tenantName || !token) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
            <strong style="color: #ffffff;">${inviterName}</strong> convidou você para fazer parte de <strong style="color: #ffffff;">${tenantName}</strong> como <strong style="color: #7C3AED;">${roleLabels[role] || role}</strong>.
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
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: errorData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email sent successfully to:", email);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-invite-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
