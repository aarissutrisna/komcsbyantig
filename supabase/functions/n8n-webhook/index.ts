import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface N8NItem {
  tanggal: string;
  cash: number;
  piutang: number;
}

interface WebhookPayload {
  branchId: string;
  data?: N8NItem[] | N8NItem;
  tanggal?: string;
  cash?: number;
  piutang?: number;
  token?: string;
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const payload = await req.json() as WebhookPayload;
    const { branchId, token } = payload;

    if (!branchId) {
      return new Response(
        JSON.stringify({ error: "branchId required" }),
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

    // Parse data: support both array format and single record format
    let omzetItems: N8NItem[] = [];

    if (payload.data) {
      omzetItems = Array.isArray(payload.data) ? payload.data : [payload.data];
    } else if (payload.tanggal && payload.cash !== undefined && payload.piutang !== undefined) {
      omzetItems = [{
        tanggal: payload.tanggal,
        cash: payload.cash,
        piutang: payload.piutang,
      }];
    } else {
      return new Response(
        JSON.stringify({ error: "Missing data: provide either 'data' array or tanggal/cash/piutang fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Transform omzet data
    const omzetData = omzetItems.map((item) => ({
      branch_id: branchId,
      tanggal: convertDateFormat(item.tanggal),
      cash: item.cash || 0,
      piutang: item.piutang || 0,
      total: (item.cash || 0) + (item.piutang || 0),
    }));

    // Insert atau update omzet data
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

    // Trigger commission calculation for each date
    const commissionResults = [];
    for (const item of omzetData) {
      const calculateUrl = `${supabaseUrl}/functions/v1/calculate-commissions`;
      const calculateResponse = await fetch(calculateUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ branchId, tanggal: item.tanggal }),
      });

      const calculateResult = await calculateResponse.json();
      commissionResults.push({ tanggal: item.tanggal, result: calculateResult });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Received and processed ${omzetData.length} omzet records`,
        recordsProcessed: omzetData.length,
        omzetData: omzetData,
        commissionResults: commissionResults,
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
