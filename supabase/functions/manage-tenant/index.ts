import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateTenantRequest {
  action: "create" | "delete" | "update";
  tenant?: {
    name: string;
    slug: string;
    plan?: string;
    status?: string;
    max_agents?: number;
    max_messages_month?: number;
  };
  owner?: {
    email: string;
    full_name?: string;
  };
  tenant_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header - try both cases for compatibility
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization header", reason: "missing_token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract the JWT token from the header
    const token = authHeader.replace(/^Bearer\s+/i, "");
    
    if (!token || token === authHeader) {
      console.error("Invalid authorization header format");
      return new Response(
        JSON.stringify({ error: "Invalid authorization header format", reason: "invalid_format" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Token received, length:", token.length);

    // Create user client
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // Get current user by passing the token explicitly
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
    
    if (userError) {
      console.error("Token validation error:", userError.message);
      return new Response(
        JSON.stringify({ 
          error: "Unauthorized: Invalid or expired token", 
          reason: "invalid_token",
          details: userError.message 
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!user) {
      console.error("No user found for token");
      return new Response(
        JSON.stringify({ error: "Unauthorized: User not found", reason: "no_user" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authenticated user:", user.id, user.email);

    // Check if user is super admin
    const { data: superAdmin, error: saError } = await supabaseAdmin
      .from("super_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (saError) {
      console.error("Error checking super admin:", saError);
      return new Response(
        JSON.stringify({ error: "Error verifying permissions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!superAdmin) {
      console.error("User is not a super admin:", user.id);
      return new Response(
        JSON.stringify({ error: "Forbidden: Only super admins can manage tenants" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Super admin verified:", user.id);

    const body: CreateTenantRequest = await req.json();
    console.log("Request body:", JSON.stringify(body, null, 2));

    if (body.action === "create") {
      if (!body.tenant?.name || !body.tenant?.slug) {
        throw new Error("Tenant name and slug are required");
      }

      // Check if slug already exists
      const { data: existingTenant } = await supabaseAdmin
        .from("tenants")
        .select("id")
        .eq("slug", body.tenant.slug)
        .maybeSingle();

      if (existingTenant) {
        throw new Error("Slug already exists");
      }

      // Create tenant
      const { data: newTenant, error: tenantError } = await supabaseAdmin
        .from("tenants")
        .insert({
          name: body.tenant.name,
          slug: body.tenant.slug,
          plan: body.tenant.plan || "starter",
          status: body.tenant.status || "active",
          max_agents: body.tenant.max_agents || 3,
          max_messages_month: body.tenant.max_messages_month || 1000,
        })
        .select()
        .single();

      if (tenantError) {
        console.error("Error creating tenant:", tenantError);
        throw new Error(`Failed to create tenant: ${tenantError.message}`);
      }

      console.log("Tenant created:", newTenant.id);

      // If owner email is provided, create or invite them
      if (body.owner?.email) {
        // Try to find user by email in auth.users
        const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        
        let ownerUserId: string | null = null;
        
        if (!authError && authUsers?.users) {
          const existingUser = authUsers.users.find(u => u.email === body.owner?.email);
          if (existingUser) {
            ownerUserId = existingUser.id;
          }
        }

        if (ownerUserId) {
          // User exists, add them to tenant as owner
          const { error: tuError } = await supabaseAdmin
            .from("tenant_users")
            .insert({
              tenant_id: newTenant.id,
              user_id: ownerUserId,
              role: "owner",
              status: "active",
              accepted_at: new Date().toISOString(),
            });

          if (tuError) {
            console.error("Error adding owner to tenant:", tuError);
          } else {
            console.log("Owner added to tenant:", ownerUserId);
          }
        } else {
          // User doesn't exist, create invitation
          const inviteToken = crypto.randomUUID();
          const { error: inviteError } = await supabaseAdmin
            .from("invitations")
            .insert({
              tenant_id: newTenant.id,
              email: body.owner.email,
              role: "owner",
              token: inviteToken,
              invited_by: user.id,
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            });

          if (inviteError) {
            console.error("Error creating invitation:", inviteError);
          } else {
            console.log("Invitation created for:", body.owner.email);
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, tenant: newTenant }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } 
    
    if (body.action === "delete") {
      if (!body.tenant_id) {
        throw new Error("Tenant ID is required for deletion");
      }

      // Delete related data first (cascade should handle most)
      const { error: deleteError } = await supabaseAdmin
        .from("tenants")
        .delete()
        .eq("id", body.tenant_id);

      if (deleteError) {
        console.error("Error deleting tenant:", deleteError);
        throw new Error(`Failed to delete tenant: ${deleteError.message}`);
      }

      console.log("Tenant deleted:", body.tenant_id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.action === "update") {
      if (!body.tenant_id || !body.tenant) {
        throw new Error("Tenant ID and data are required for update");
      }

      const { error: updateError } = await supabaseAdmin
        .from("tenants")
        .update({
          name: body.tenant.name,
          slug: body.tenant.slug,
          plan: body.tenant.plan,
          status: body.tenant.status,
          max_agents: body.tenant.max_agents,
          max_messages_month: body.tenant.max_messages_month,
        })
        .eq("id", body.tenant_id);

      if (updateError) {
        console.error("Error updating tenant:", updateError);
        throw new Error(`Failed to update tenant: ${updateError.message}`);
      }

      console.log("Tenant updated:", body.tenant_id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");
  } catch (error: unknown) {
    console.error("Error in manage-tenant:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
