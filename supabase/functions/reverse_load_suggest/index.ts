import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { trip_id } = await req.json();
    if (!trip_id) {
      return new Response(JSON.stringify({ error: "trip_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("id, transporter_id")
      .eq("id", trip_id)
      .maybeSingle();

    if (tripError || !trip || trip.transporter_id !== user.id) {
      return new Response(JSON.stringify({ error: "Trip not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: lastStop } = await supabase
      .from("trip_stops")
      .select("location_text")
      .eq("trip_id", trip_id)
      .eq("stop_type", "DELIVERY")
      .order("sequence", { ascending: false })
      .limit(1)
      .maybeSingle();

    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    const completionBody = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an agri logistics planner. Suggest return loads after delivery with concise bundles.",
        },
        {
          role: "user",
          content: `Last delivery location: ${lastStop?.location_text || "Unknown"}. Generate up to 3 reverse load bundle ideas with title, items (name, qty), destination (to_location) and a brief reason.`,
        },
      ],
    };

    let bundles = [] as any[];

    try {
      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(completionBody),
      });

      if (aiRes.ok) {
        const aiJson = await aiRes.json();
        const text = aiJson.choices?.[0]?.message?.content || "";
        try {
          const parsed = JSON.parse(text);
          bundles = parsed.bundles || [];
        } catch {
          bundles = [
            {
              title: "Seed pickups",
              to_location: "Nearest mandi",
              items: [
                { name: "Paddy seeds", qty: "10 bags" },
                { name: "Fertilizer", qty: "5 sacks" },
              ],
              reason: "Common return run supplies",
            },
          ];
        }
      }
    } catch (err) {
      console.error("OpenAI call failed", err);
    }

    const { data: suggestion } = await supabase
      .from("reverse_load_suggestions")
      .insert({
        transporter_id: user.id,
        from_location_text: lastStop?.location_text || null,
        to_location_text: bundles?.[0]?.to_location || null,
        suggested_items: { bundles },
      })
      .select()
      .maybeSingle();

    await supabase.from("ai_logs").insert({
      user_id: user.id,
      module_type: "REVERSE_LOAD_SUGGEST",
      input_data: { trip_id },
      output_data: { bundles },
    });

    return new Response(JSON.stringify({ bundles: bundles ?? [], suggestion }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
