import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CommissionData {
  userId: string;
  branchId: string;
  tanggal: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { branchId, tanggal } = await req.json() as { branchId?: string; tanggal?: string };

    if (!branchId || !tanggal) {
      return new Response(
        JSON.stringify({ error: "branchId and tanggal required" }),
        {
          status: 400,
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

    // Get omzet data untuk tanggal tersebut
    const { data: omzetData, error: omzetError } = await supabase
      .from("omzet")
      .select("*")
      .eq("branch_id", branchId)
      .eq("tanggal", tanggal)
      .maybeSingle();

    if (omzetError) {
      console.error("Omzet error:", omzetError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch omzet data" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!omzetData) {
      return new Response(
        JSON.stringify({ message: "No omzet data found for this date" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get branch target info
    const { data: branch, error: branchError } = await supabase
      .from("branches")
      .select("target_min, target_max")
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

    // Hitung komisi persen berdasarkan omzet
    const omzetTotal = omzetData.total || 0;
    let komisiPersen = 0;

    if (omzetTotal >= branch.target_max) {
      komisiPersen = 0.4;
    } else if (omzetTotal >= branch.target_min) {
      komisiPersen = 0.2;
    }

    // Get CS users di branch
    const { data: csUsers, error: csError } = await supabase
      .from("users")
      .select("id, faktor_pengali")
      .eq("branch_id", branchId)
      .eq("role", "cs");

    if (csError) {
      console.error("CS users error:", csError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch CS users" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get attendance untuk tanggal tersebut
    const { data: attendanceData, error: attendanceError } = await supabase
      .from("attendance_data")
      .select("user_id, status_kehadiran")
      .eq("branch_id", branchId)
      .eq("tanggal", tanggal);

    if (attendanceError) {
      console.error("Attendance error:", attendanceError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch attendance data" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Calculate commission untuk setiap CS
    const commissionData = csUsers.map((cs) => {
      const attendance = attendanceData?.find((a) => a.user_id === cs.id);
      const status = attendance?.status_kehadiran || "alpha";

      let statusMultiplier = 0;
      if (status === "hadir") statusMultiplier = 1;
      else if (status === "setengah" || status === "izin") statusMultiplier = 0.5;

      const komisiNominal = omzetTotal * (komisiPersen / 100);
      const totalKomisi = komisiNominal * (cs.faktor_pengali || 0) * statusMultiplier;

      return {
        user_id: cs.id,
        branch_id: branchId,
        tanggal: tanggal,
        omzet: omzetTotal,
        attendance_status: status,
        faktor_pengali: cs.faktor_pengali || 0,
        komisi_persen: komisiPersen,
        komisi_nominal: komisiNominal,
        total_komisi: totalKomisi,
      };
    });

    // Upsert commissions
    if (commissionData.length > 0) {
      const { error: insertError } = await supabase
        .from("commissions")
        .upsert(commissionData, { onConflict: "user_id,tanggal" });

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to save commissions" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Calculated commissions for ${commissionData.length} CS users`,
        omzet: omzetTotal,
        komisiPersen: komisiPersen,
        commissions: commissionData,
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
