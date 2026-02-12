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

function convertDateFormat(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split("T")[0];

  const patterns = [
    { regex: /^(\d{2})-(\d{2})-(\d{4})$/, format: (m: RegExpMatchArray) => `${m[3]}-${m[2]}-${m[1]}` },
    { regex: /^(\d{2})\/(\d{2})\/(\d{4})$/, format: (m: RegExpMatchArray) => `${m[3]}-${m[2]}-${m[1]}` },
    { regex: /^(\d{4})-(\d{2})-(\d{2})$/, format: (m: RegExpMatchArray) => `${m[1]}-${m[2]}-${m[3]}` },
  ];

  for (const { regex, format } of patterns) {
    const match = dateStr.match(regex);
    if (match) {
      return format(match);
    }
  }

  return dateStr;
}

function validateOmzetData(data: unknown): data is N8NData {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.tanggal === "string" &&
    (typeof obj.cash === "number" || obj.cash === null) &&
    (typeof obj.piutang === "number" || obj.piutang === null)
  );
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

    const rawData = await n8nResponse.json();
    const n8nData = Array.isArray(rawData) ? rawData : [rawData];

    const validatedData = n8nData.filter(validateOmzetData);

    if (validatedData.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid data received from N8N" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Transform & validate data into omzet table format
    const omzetData = validatedData.map((item) => ({
      branch_id: branchId,
      tanggal: convertDateFormat(item.tanggal),
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
