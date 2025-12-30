import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { tenant_id, phone, contact_name, contact_photo_url, user_message, bot_response, agent_id } = body;

    if (!tenant_id || !phone) {
      console.error("Missing required fields:", { tenant_id, phone });
      return new Response(
        JSON.stringify({ success: false, error: "tenant_id and phone are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Syncing conversation for tenant: ${tenant_id}, phone: ${phone}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Normalize phone number
    const normalizedPhone = phone.replace(/\D/g, "");

    // Find or create conversation
    let { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("phone", normalizedPhone)
      .neq("status", "closed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (convError) {
      console.error("Error finding conversation:", convError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to find conversation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let conversationId: string;

    if (!conversation) {
      // Create new conversation
      console.log("Creating new conversation");
      
      // If no agent_id provided, try to get the active agent
      let activeAgentId = agent_id;
      if (!activeAgentId) {
        const { data: activeAgent } = await supabase
          .from("agents")
          .select("id")
          .eq("tenant_id", tenant_id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();
        
        activeAgentId = activeAgent?.id;
      }

      const { data: newConv, error: createError } = await supabase
        .from("conversations")
        .insert({
          tenant_id,
          phone: normalizedPhone,
          contact_name: contact_name || null,
          contact_photo_url: contact_photo_url || null,
          agent_id: activeAgentId || null,
          status: "active",
          is_bot_active: true,
          started_at: new Date().toISOString(),
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating conversation:", createError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to create conversation" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      conversationId = newConv.id;
      console.log(`Created new conversation: ${conversationId}`);
    } else {
      conversationId = conversation.id;
      console.log(`Found existing conversation: ${conversationId}`);

      // Update conversation with latest info
      await supabase
        .from("conversations")
        .update({
          contact_name: contact_name || conversation.contact_name,
          contact_photo_url: contact_photo_url || conversation.contact_photo_url,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", conversationId);
    }

    // Insert user message if provided
    if (user_message) {
      const { error: userMsgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          role: "user",
          content: user_message,
          content_type: "text",
          is_from_bot: false,
          delivery_status: "delivered",
        });

      if (userMsgError) {
        console.error("Error inserting user message:", userMsgError);
      } else {
        console.log("User message saved");
      }
    }

    // Insert bot response if provided
    if (bot_response) {
      const { error: botMsgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          role: "assistant",
          content: bot_response,
          content_type: "text",
          is_from_bot: true,
          delivery_status: "sent",
        });

      if (botMsgError) {
        console.error("Error inserting bot message:", botMsgError);
      } else {
        console.log("Bot message saved");
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        conversation_id: conversationId,
        message: "Conversation synced successfully"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error in sync-conversation:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
