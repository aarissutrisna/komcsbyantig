import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface N8NData {
  tanggal: string;
  cash: number;
  piutang: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { branchId, startDate, endDate } = await req.json();

    if (!branchId) {
      return new Response(
        JSON.stringify({ error: "branchId required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get Supabase client from request context
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

    // Import Supabase client
    const { createClient } = await import("npm:@supabase/supabase-js@2.57.4");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get branch N8N endpoint
    const { data: branch, error: branchError } = await supabase
      .from("branches")
      .select("n8n_endpoint")
      .eq("id", branchId)
      .maybeSingle();

    if (branchError || !branch?.n8n_endpoint) {
      return new Response(
        JSON.stringify({
          error: "Branch not found or N8N endpoint not configured",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch data dari N8N
    const n8nResponse = await fetch(branch.n8n_endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        endDate: endDate || new Date().toISOString().split("T")[0],
      }),
    });

    if (!n8nResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch from N8N" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const n8nData = (await n8nResponse.json()) as N8NData[];

    // Upsert data into omzet table
    const omzetData = n8nData.map((item) => ({
      branch_id: branchId,
      tanggal: item.tanggal,
      cash: item.cash || 0,
      piutang: item.piutang || 0,
      total: (item.cash || 0) + (item.piutang || 0),
    }));

    const { error: upsertError } = await supabase
      .from("omzet")
      .upsert(omzetData, { onConflict: "branch_id,tanggal" });

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

    // Update last_sync_at timestamp
    await supabase
      .from("branches")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", branchId);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${omzetData.length} records from N8N`,
        recordsInserted: omzetData.length,
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
