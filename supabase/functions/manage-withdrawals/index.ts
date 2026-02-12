import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface WithdrawalRequest {
  userId: string;
  nominal: number;
}

interface ApproveWithdrawal {
  withdrawalId: string;
  approved: boolean;
  catatan?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
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

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (req.method === "POST" && action === "create") {
      // Create withdrawal request
      const { userId, nominal } = await req.json() as WithdrawalRequest;

      if (!userId || !nominal || nominal <= 0) {
        return new Response(
          JSON.stringify({ error: "Invalid userId or nominal" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Get user's available balance
      const { data: commissions } = await supabase
        .from("commissions")
        .select("total_komisi")
        .eq("user_id", userId);

      const totalKomisi = (commissions || []).reduce(
        (sum, c) => sum + (c.total_komisi || 0),
        0
      );

      const { data: mutations } = await supabase
        .from("commission_mutations")
        .select("nominal, tipe");

      let totalMutations = 0;
      (mutations || []).forEach((m) => {
        if (m.tipe === "masuk") {
          totalMutations += m.nominal || 0;
        } else {
          totalMutations -= m.nominal || 0;
        }
      });

      const availableBalance = totalKomisi + totalMutations;

      if (nominal > availableBalance) {
        return new Response(
          JSON.stringify({
            error: "Insufficient balance",
            availableBalance,
            requested: nominal,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Get user's branch
      const { data: user } = await supabase
        .from("users")
        .select("branch_id")
        .eq("id", userId)
        .maybeSingle();

      const { error: insertError } = await supabase
        .from("withdrawal_requests")
        .insert({
          user_id: userId,
          branch_id: user?.branch_id || null,
          nominal: nominal,
          status: "pending",
          tanggal: new Date().toISOString().split("T")[0],
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create withdrawal request" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Withdrawal request created",
          availableBalance,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else if (req.method === "PUT" && action === "approve") {
      // Approve or reject withdrawal
      const { withdrawalId, approved, catatan } = await req.json() as ApproveWithdrawal;

      if (!withdrawalId) {
        return new Response(
          JSON.stringify({ error: "withdrawalId required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Get withdrawal request
      const { data: withdrawal, error: getError } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("id", withdrawalId)
        .maybeSingle();

      if (getError || !withdrawal) {
        return new Response(
          JSON.stringify({ error: "Withdrawal request not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const newStatus = approved ? "approved" : "rejected";

      const { error: updateError } = await supabase
        .from("withdrawal_requests")
        .update({
          status: newStatus,
          catatan: catatan || "",
        })
        .eq("id", withdrawalId);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Failed to update withdrawal request" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // If approved, create mutation record
      if (approved) {
        await supabase.from("commission_mutations").insert({
          user_id: withdrawal.user_id,
          branch_id: withdrawal.branch_id,
          tanggal: new Date().toISOString().split("T")[0],
          tipe: "keluar",
          nominal: withdrawal.nominal,
          keterangan: `Penarikan komisi - ${catatan || ""}`,
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Withdrawal request ${newStatus}`,
          status: newStatus,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action or method" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
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
