import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
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
    const openAiKey = Deno.env.get("OPENAI_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
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

    const { crop_id } = await req.json();
    if (!crop_id) {
      return new Response(JSON.stringify({ error: "crop_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: crop, error: cropError } = await supabase
      .from("crops")
      .select("id, crop_name, status, expected_harvest_date, district")
      .eq("id", crop_id)
      .eq("farmer_id", user.id)
      .maybeSingle();

    if (cropError || !crop) {
      return new Response(JSON.stringify({ error: "Crop not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let advice = {
      summary: "Focus on healthy growth, monitor pests weekly, and plan logistics ahead of harvest.",
      actions: [
        "Check soil moisture and irrigate if the top soil is dry.",
        "Inspect leaves for pests; use safe treatments if you spot damage.",
        "Update your crop status to READY as soon as it can be collected.",
      ],
    };

    if (openAiKey) {
      try {
        const prompt = `Provide concise farmer-facing advice for the following crop:
Crop: ${crop.crop_name}
Status: ${crop.status}
Expected harvest date: ${crop.expected_harvest_date || "unknown"}
District: ${crop.district || "unknown"}

Return a summary and 3-5 actionable next steps for the farmer in plain language.`;

        const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openAiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: "You are a helpful farming assistant for Indian farmers." },
              { role: "user", content: prompt },
            ],
            temperature: 0.6,
          }),
        });

        if (!aiResponse.ok) {
          throw new Error(`OpenAI error: ${aiResponse.status}`);
        }

        const aiJson = await aiResponse.json();
        const content = aiJson.choices?.[0]?.message?.content || "";
        const parts = content.split("\n").filter((p: string) => p.trim().length > 0);
        advice = {
          summary: parts[0] || advice.summary,
          actions: parts.slice(1, 6).map((p: string) => p.replace(/^\d+[.)]\s*/, "")),
        };
      } catch (aiError) {
        console.error("AI call failed, using fallback:", aiError);
      }
    }

    await supabase.from("ai_logs").insert({
      user_id: user.id,
      module_type: "FARMER_ADVICE",
      input_data: { crop_id },
      output_data: advice,
    });

    return new Response(JSON.stringify(advice), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("farmer_advice error:", error);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
