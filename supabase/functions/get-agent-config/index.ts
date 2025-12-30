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
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenant_id");

    if (!tenantId) {
      console.error("Missing tenant_id parameter");
      return new Response(
        JSON.stringify({ success: false, error: "tenant_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching agent config for tenant: ${tenantId}`);

    // Use external Supabase credentials
    const supabaseUrl = Deno.env.get("EXTERNAL_SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the active agent for this tenant
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (agentError) {
      console.error("Error fetching agent:", agentError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch agent config" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!agent) {
      console.log(`No active agent found for tenant: ${tenantId}`);
      return new Response(
        JSON.stringify({ success: false, error: "No active agent found for this tenant" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found active agent: ${agent.name} (${agent.id})`);

    const config = {
      agent_id: agent.id,
      name: agent.name,
      description: agent.description,
      model: agent.model || "gpt-4o-mini",
      system_prompt: agent.system_prompt,
      temperature: agent.temperature || 0.7,
      max_tokens: agent.max_tokens || 1000,
      context_window: agent.context_window || 10,
      welcome_message: agent.welcome_message || "Olá! Como posso ajudar você hoje?",
      fallback_message: agent.fallback_message || "Desculpe, não entendi. Pode reformular sua pergunta?",
      transfer_message: agent.transfer_message || "Vou transferir você para um atendente humano.",
      out_of_hours_message: agent.out_of_hours_message || "Nosso atendimento funciona de segunda a sexta, das 9h às 18h.",
      typing_delay_ms: agent.typing_delay_ms || 1500,
      business_hours: agent.business_hours || { enabled: false },
      auto_transfer_keywords: agent.auto_transfer_keywords || [],
      webhook_url: agent.webhook_url,
      n8n_workflow_id: agent.n8n_workflow_id,
    };

    return new Response(
      JSON.stringify({ success: true, config }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error in get-agent-config:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
