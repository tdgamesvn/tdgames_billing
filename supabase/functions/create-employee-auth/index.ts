import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper: find auth user by email using RPC (reliable, no pagination issues)
async function findAuthUserByEmail(supabaseAdmin: any, email: string) {
  const { data, error } = await supabaseAdmin.rpc('find_auth_user_by_email', {
    lookup_email: email,
  });

  if (error || !data) return null;
  return {
    id: data.id,
    email: data.email,
    user_metadata: data.user_metadata || {},
    banned_until: data.banned_until,
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── DISABLE ACTION: Ban auth user (soft delete) ──
    if (action === "disable") {
      const { email } = body;
      if (!email) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing email for disable action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const user = await findAuthUserByEmail(supabaseAdmin, email);
      if (!user) {
        return new Response(
          JSON.stringify({ success: true, disabled: false, message: "No auth user found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: banErr } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { ban_duration: "876600h", user_metadata: { ...user.user_metadata, status: "terminated" } }
      );
      if (banErr) throw banErr;

      return new Response(
        JSON.stringify({ success: true, disabled: true, message: `Auth user ${email} disabled` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ENABLE ACTION: Unban auth user (reactivate) ──
    if (action === "enable") {
      const { email } = body;
      if (!email) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing email for enable action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const user = await findAuthUserByEmail(supabaseAdmin, email);
      if (!user) {
        return new Response(
          JSON.stringify({ success: true, enabled: false, message: "No auth user found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: unbanErr } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { ban_duration: "none", user_metadata: { ...user.user_metadata, status: "active" } }
      );
      if (unbanErr) throw unbanErr;

      return new Response(
        JSON.stringify({ success: true, enabled: true, message: `Auth user ${email} re-enabled` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── CHECK ACTION: Check if email exists in auth ──
    if (action === "check_email") {
      const { email } = body;
      if (!email) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing email" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const user = await findAuthUserByEmail(supabaseAdmin, email);

      return new Response(
        JSON.stringify({ success: true, exists: !!user, user_id: user?.id || null, role: user?.user_metadata?.role || null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── UPDATE_ROLE ACTION: Change user's role ──
    if (action === "update_role") {
      const { email, role } = body;
      if (!email || !role) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing email or role for update_role action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const user = await findAuthUserByEmail(supabaseAdmin, email);
      if (!user) {
        return new Response(
          JSON.stringify({ success: false, error: `No auth user found for ${email}` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { user_metadata: { ...user.user_metadata, role } }
      );
      if (updateErr) throw updateErr;

      return new Response(
        JSON.stringify({ success: true, updated: true, message: `Role updated to '${role}' for ${email}`, previous_role: user.user_metadata?.role || "member" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── INVITE ACTION (default): Create/invite user ──
    const { email, full_name, employee_id, role, worker_id } = body;

    if (!email || !full_name || !employee_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: email, full_name, employee_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine user metadata
    const userMetadata: Record<string, any> = {
      username: full_name,
      full_name,
      employee_id,
      role: role || "member",
    };

    if (worker_id) {
      userMetadata.worker_id = worker_id;
    }

    // Check if user already exists using direct DB query
    const existingUser = await findAuthUserByEmail(supabaseAdmin, email);

    if (existingUser) {
      // Update metadata for existing user
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { user_metadata: { ...existingUser.user_metadata, ...userMetadata } }
      );
      if (updateErr) throw updateErr;

      return new Response(
        JSON.stringify({ success: true, invited: false, message: "User already exists, metadata updated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Invite new user by email
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: userMetadata,
      redirectTo: `${Deno.env.get("SITE_URL") || "https://app.tdgamestudio.com"}`,
    });

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, invited: true, user_id: data.user?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
