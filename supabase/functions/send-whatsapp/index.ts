import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { tenant_id, phone, message, message_type = "text" } = await req.json();
    
    console.log("Send WhatsApp request:", { tenant_id, phone, message_type });

    if (!tenant_id || !phone || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: tenant_id, phone, message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get tenant Z-API credentials
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("zapi_instance_id, zapi_token, zapi_client_token")
      .eq("id", tenant_id)
      .single();

    if (tenantError || !tenant) {
      console.error("Tenant not found:", tenantError);
      return new Response(
        JSON.stringify({ error: "Tenant not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tenant.zapi_instance_id || !tenant.zapi_token) {
      console.error("Z-API not configured for tenant");
      return new Response(
        JSON.stringify({ error: "Z-API not configured for this tenant" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number (remove non-numeric characters)
    const formattedPhone = phone.replace(/\D/g, "");

    // Build Z-API request
    const zapiUrl = `https://api.z-api.io/instances/${tenant.zapi_instance_id}/token/${tenant.zapi_token}/send-text`;
    
    const zapiHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    if (tenant.zapi_client_token) {
      zapiHeaders["Client-Token"] = tenant.zapi_client_token;
    }

    const zapiBody = {
      phone: formattedPhone,
      message: message,
    };

    console.log("Sending to Z-API:", { url: zapiUrl, phone: formattedPhone });

    const zapiResponse = await fetch(zapiUrl, {
      method: "POST",
      headers: zapiHeaders,
      body: JSON.stringify(zapiBody),
    });

    const zapiResult = await zapiResponse.json();
    console.log("Z-API response:", zapiResult);

    if (!zapiResponse.ok) {
      console.error("Z-API error:", zapiResult);
      return new Response(
        JSON.stringify({ error: "Failed to send message via Z-API", details: zapiResult }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return success with Z-API message ID
    return new Response(
      JSON.stringify({ 
        success: true, 
        zapi_message_id: zapiResult.messageId || zapiResult.zapiMessageId,
        phone: formattedPhone 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending WhatsApp message:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
