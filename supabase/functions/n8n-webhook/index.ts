import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface WebhookPayload {
  branchId: string;
  tanggal: string;
  cash: number;
  piutang: number;
  token?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const payload = await req.json() as WebhookPayload;
    const { branchId, tanggal, cash, piutang, token } = payload;

    if (!branchId || !tanggal || cash === undefined || piutang === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: branchId, tanggal, cash, piutang" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Optional: Verify webhook token if provided
    const expectedToken = Deno.env.get("N8N_WEBHOOK_SECRET");
    if (expectedToken && token !== expectedToken) {
      return new Response(
        JSON.stringify({ error: "Invalid webhook token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase configuration" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { createClient } = await import("npm:@supabase/supabase-js@2.57.4");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify branch exists
    const { data: branch, error: branchError } = await supabase
      .from("branches")
      .select("id")
      .eq("id", branchId)
      .maybeSingle();

    if (branchError || !branch) {
      return new Response(
        JSON.stringify({ error: "Branch not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Insert atau update omzet data
    const { error: upsertError } = await supabase
      .from("omzet")
      .upsert({
        branch_id: branchId,
        tanggal: tanggal,
        cash: cash,
        piutang: piutang,
        total: cash + piutang,
      }, { onConflict: "branch_id,tanggal" });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to save omzet data", details: upsertError }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Trigger commission calculation
    const calculateUrl = `${supabaseUrl}/functions/v1/calculate-commissions`;
    const calculateResponse = await fetch(calculateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ branchId, tanggal }),
    });

    const calculateResult = await calculateResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Omzet data received and commissions calculated",
        omzet: {
          branchId,
          tanggal,
          cash,
          piutang,
          total: cash + piutang,
        },
        commissionResult: calculateResult,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
