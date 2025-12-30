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
    // Use external Supabase credentials
    const supabaseUrl = Deno.env.get("EXTERNAL_SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log("Z-API Webhook received:", JSON.stringify(body));

    // Extract tenant_id from query params
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenant_id");

    if (!tenantId) {
      console.error("Missing tenant_id in webhook URL");
      return new Response(
        JSON.stringify({ error: "Missing tenant_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine event type
    const eventType = body.event || body.type || body.status || "unknown";
    console.log("Event type:", eventType);

    // Handle incoming messages
    if (eventType === "message" || eventType === "ReceivedCallback" || body.text || body.body) {
      await handleIncomingMessage(supabase, tenantId, body);
    }
    // Handle ACK/delivery status updates
    else if (eventType === "message-status" || eventType === "DeliveryCallback" || body.ack !== undefined) {
      await handleDeliveryStatus(supabase, body);
    }
    // Handle connection status events
    else if (eventType === "connection" || eventType === "status" || body.connected !== undefined || body.isConnected !== undefined) {
      await handleConnectionStatus(supabase, tenantId, eventType, body);
    }
    // Handle QR Code events
    else if (eventType === "qrcode" || eventType === "qr") {
      await logIntegrationEvent(supabase, tenantId, "QR Code", "warning", "QR Code gerado - aguardando leitura", body);
    }
    // Handle session events
    else if (eventType === "session") {
      await handleSessionEvent(supabase, tenantId, body);
    }
    // Handle error events
    else if (eventType === "error" || body.error) {
      await logIntegrationEvent(supabase, tenantId, "Erro", "error", body.error || body.message || "Erro na instância Z-API", body);
    }
    // Default for unknown events
    else {
      console.log("Unknown event type, logging:", eventType);
      await logIntegrationEvent(supabase, tenantId, eventType, "warning", body.message || `Evento: ${eventType}`, body);
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

// Handle incoming WhatsApp messages
async function handleIncomingMessage(supabase: any, tenantId: string, body: any) {
  console.log("Processing incoming message...");

  // Extract message data from Z-API payload
  const phone = body.phone || body.from || body.chatId?.replace("@c.us", "") || "";
  const contactName = body.chatName || body.senderName || body.pushName || body.notifyName || null;
  const messageContent = body.text?.message || body.body || body.message?.text || body.message || "";
  const zapiMessageId = body.messageId || body.id?._serialized || body.id || null;
  const isFromMe = body.fromMe || body.isFromMe || false;
  const contentType = body.type || "text";
  const mediaUrl = body.image?.imageUrl || body.audio?.audioUrl || body.video?.videoUrl || body.document?.documentUrl || null;

  console.log("Message data:", { phone, contactName, messageContent: messageContent.substring(0, 50), isFromMe });

  if (!phone || (!messageContent && !mediaUrl)) {
    console.log("Missing phone or message content, skipping");
    return;
  }

  // Skip messages sent by us (from bot)
  if (isFromMe) {
    console.log("Message is from us, skipping");
    return;
  }

  // Find or create conversation
  let { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("id, agent_id, is_bot_active, context")
    .eq("tenant_id", tenantId)
    .eq("phone", phone)
    .eq("status", "active")
    .maybeSingle();

  if (convError) {
    console.error("Error finding conversation:", convError);
  }

  // Get active agent for tenant
  const { data: agent } = await supabase
    .from("agents")
    .select("id, name, n8n_workflow_id")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!conversation) {
    console.log("Creating new conversation...");
    const { data: newConv, error: createError } = await supabase
      .from("conversations")
      .insert({
        tenant_id: tenantId,
        phone: phone,
        contact_name: contactName,
        agent_id: agent?.id || null,
        is_bot_active: true,
        status: "active",
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating conversation:", createError);
      return;
    }
    conversation = newConv;
    console.log("New conversation created:", conversation.id);
  } else {
    // Update conversation with latest contact info
    await supabase
      .from("conversations")
      .update({
        contact_name: contactName || conversation.contact_name,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversation.id);
  }

  // Save incoming message
  const { error: msgError } = await supabase.from("messages").insert({
    conversation_id: conversation.id,
    content: messageContent,
    content_type: contentType,
    role: "user",
    is_from_bot: false,
    zapi_message_id: zapiMessageId,
    media_url: mediaUrl,
    delivery_status: "received",
  });

  if (msgError) {
    console.error("Error saving message:", msgError);
  } else {
    console.log("Message saved successfully");
  }

  // If bot is active and we have N8N configured, send to N8N for processing
  if (conversation.is_bot_active && agent) {
    await processWithN8N(supabase, tenantId, conversation, agent, phone, contactName, messageContent);
  }
}

// Process message with N8N
async function processWithN8N(supabase: any, tenantId: string, conversation: any, agent: any, phone: string, contactName: string | null, messageContent: string) {
  console.log("Processing with N8N...");

  // Get tenant N8N configuration
  const { data: tenant } = await supabase
    .from("tenants")
    .select("n8n_webhook_base, zapi_instance_id, zapi_token, zapi_client_token")
    .eq("id", tenantId)
    .single();

  if (!tenant?.n8n_webhook_base) {
    console.log("N8N webhook not configured, skipping AI processing");
    return;
  }

  // Get conversation history (last 10 messages)
  const { data: history } = await supabase
    .from("messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const n8nPayload = {
    tenant_id: tenantId,
    conversation_id: conversation.id,
    agent_id: agent.id,
    agent_name: agent.name,
    phone: phone,
    contact_name: contactName,
    message: messageContent,
    context: conversation.context || {},
    history: (history || []).reverse(),
  };

  console.log("Sending to N8N:", { webhook: tenant.n8n_webhook_base, payload_preview: messageContent.substring(0, 50) });

  try {
    const n8nUrl = tenant.n8n_webhook_base.endsWith("/") 
      ? `${tenant.n8n_webhook_base}whatsapp` 
      : `${tenant.n8n_webhook_base}/whatsapp`;

    const n8nResponse = await fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(n8nPayload),
    });

    if (!n8nResponse.ok) {
      console.error("N8N responded with error:", n8nResponse.status);
      return;
    }

    const n8nResult = await n8nResponse.json();
    console.log("N8N response:", n8nResult);

    if (n8nResult.response) {
      // Save bot response
      await supabase.from("messages").insert({
        conversation_id: conversation.id,
        content: n8nResult.response,
        content_type: "text",
        role: "assistant",
        is_from_bot: true,
        model_used: agent.model || "n8n",
      });

      // Update conversation context if provided
      if (n8nResult.context) {
        await supabase
          .from("conversations")
          .update({ context: n8nResult.context })
          .eq("id", conversation.id);
      }

      // Send response via Z-API
      await sendWhatsAppMessage(tenant, phone, n8nResult.response);
    }
  } catch (error) {
    console.error("Error calling N8N:", error);
  }
}

// Send WhatsApp message via Z-API
async function sendWhatsAppMessage(tenant: any, phone: string, message: string) {
  if (!tenant.zapi_instance_id || !tenant.zapi_token) {
    console.error("Z-API not configured");
    return;
  }

  const formattedPhone = phone.replace(/\D/g, "");
  const zapiUrl = `https://api.z-api.io/instances/${tenant.zapi_instance_id}/token/${tenant.zapi_token}/send-text`;

  const zapiHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (tenant.zapi_client_token) {
    zapiHeaders["Client-Token"] = tenant.zapi_client_token;
  }

  console.log("Sending WhatsApp message to:", formattedPhone);

  try {
    const response = await fetch(zapiUrl, {
      method: "POST",
      headers: zapiHeaders,
      body: JSON.stringify({ phone: formattedPhone, message }),
    });

    const result = await response.json();
    console.log("Z-API send result:", result);
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
  }
}

// Handle delivery status updates
async function handleDeliveryStatus(supabase: any, body: any) {
  const zapiMessageId = body.messageId || body.id?._serialized || body.id;
  const ack = body.ack || body.status;

  if (!zapiMessageId) {
    console.log("No message ID for delivery status update");
    return;
  }

  let deliveryStatus = "sent";
  if (ack === 2 || ack === "delivered" || ack === "DELIVERY_ACK") {
    deliveryStatus = "delivered";
  } else if (ack === 3 || ack === "read" || ack === "READ") {
    deliveryStatus = "read";
  } else if (ack === -1 || ack === "error" || ack === "ERROR") {
    deliveryStatus = "failed";
  }

  console.log("Updating delivery status:", { zapiMessageId, deliveryStatus });

  const { error } = await supabase
    .from("messages")
    .update({ delivery_status: deliveryStatus })
    .eq("zapi_message_id", zapiMessageId);

  if (error) {
    console.error("Error updating delivery status:", error);
  }
}

// Handle connection status events
async function handleConnectionStatus(supabase: any, tenantId: string, eventType: string, body: any) {
  const isConnected = body.connected ?? body.isConnected ?? null;
  
  let status: "success" | "error" = "error";
  let message = "";
  let logEventType = eventType;

  if (isConnected === true || body.status === "connected" || body.connected === true) {
    status = "success";
    message = "Instância conectada ao WhatsApp";
    logEventType = "Conectado";
  } else if (isConnected === false || body.status === "disconnected" || body.connected === false) {
    status = "error";
    message = body.reason || body.message || "Instância desconectada do WhatsApp";
    logEventType = "Desconectado";
  }

  await logIntegrationEvent(supabase, tenantId, logEventType, status, message, body);
}

// Handle session events
async function handleSessionEvent(supabase: any, tenantId: string, body: any) {
  let status: "success" | "error" = "error";
  let message = "";
  let logEventType = "Sessão";

  if (body.status === "open" || body.status === "connected") {
    status = "success";
    message = "Sessão iniciada com sucesso";
    logEventType = "Sessão Aberta";
  } else if (body.status === "close" || body.status === "closed") {
    status = "error";
    message = body.reason || "Sessão encerrada";
    logEventType = "Sessão Fechada";
  }

  await logIntegrationEvent(supabase, tenantId, logEventType, status, message, body);
}

// Log integration event
async function logIntegrationEvent(supabase: any, tenantId: string, eventType: string, status: string, message: string, details: any) {
  const { error } = await supabase.from("integration_logs").insert({
    tenant_id: tenantId,
    integration_type: "zapi",
    event_type: eventType,
    status,
    message,
    details,
  });

  if (error) {
    console.error("Error inserting integration log:", error);
  } else {
    console.log("Integration log saved:", { tenantId, eventType, status, message });
  }
}
