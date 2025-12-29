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

    const body = await req.json();
    console.log("Z-API Webhook received:", JSON.stringify(body));

    // Extract tenant_id from query params or headers
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenant_id");

    if (!tenantId) {
      console.error("Missing tenant_id in webhook URL");
      return new Response(
        JSON.stringify({ error: "Missing tenant_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Z-API sends different event types
    // Common events: connected, disconnected, qrcode, message, etc.
    const eventType = body.event || body.type || body.status || "unknown";
    const isConnected = body.connected ?? body.isConnected ?? null;
    
    let status: "success" | "error" | "warning" = "warning";
    let message = "";
    let logEventType = eventType;

    // Handle connection status events
    if (eventType === "connection" || eventType === "status" || isConnected !== null) {
      if (isConnected === true || body.status === "connected" || body.connected === true) {
        status = "success";
        message = "Instância conectada ao WhatsApp";
        logEventType = "Conectado";
      } else if (isConnected === false || body.status === "disconnected" || body.connected === false) {
        status = "error";
        message = body.reason || body.message || "Instância desconectada do WhatsApp";
        logEventType = "Desconectado";
      }
    }
    
    // Handle QR Code events
    else if (eventType === "qrcode" || eventType === "qr") {
      status = "warning";
      message = "QR Code gerado - aguardando leitura";
      logEventType = "QR Code";
    }
    
    // Handle session events
    else if (eventType === "session") {
      if (body.status === "open" || body.status === "connected") {
        status = "success";
        message = "Sessão iniciada com sucesso";
        logEventType = "Sessão Aberta";
      } else if (body.status === "close" || body.status === "closed") {
        status = "error";
        message = body.reason || "Sessão encerrada";
        logEventType = "Sessão Fechada";
      }
    }
    
    // Handle error events
    else if (eventType === "error" || body.error) {
      status = "error";
      message = body.error || body.message || "Erro na instância Z-API";
      logEventType = "Erro";
    }
    
    // Handle initialization events
    else if (eventType === "init" || eventType === "start") {
      status = "warning";
      message = "Instância inicializando...";
      logEventType = "Inicializando";
    }
    
    // Default for unknown events
    else {
      message = body.message || `Evento: ${eventType}`;
    }

    // Only log connection-related events (not messages)
    if (eventType !== "message" && eventType !== "chat" && eventType !== "ack") {
      const { error: insertError } = await supabase
        .from("integration_logs")
        .insert({
          tenant_id: tenantId,
          integration_type: "zapi",
          event_type: logEventType,
          status,
          message,
          details: body,
        });

      if (insertError) {
        console.error("Error inserting log:", insertError);
      } else {
        console.log("Integration log saved:", { tenantId, logEventType, status, message });
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
