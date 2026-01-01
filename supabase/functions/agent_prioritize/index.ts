import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, ok, badRequest, unauthorized, serverError } from "../_shared/respond.ts";
import { assertRole, getUserAndRole } from "../_shared/auth.ts";

const formatDate = (date: Date) => date.toISOString().split("T")[0];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const aiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return badRequest("Missing Supabase configuration");
    }

    if (!aiKey) {
      return badRequest("AI key not configured");
    }

    let requestDate = formatDate(new Date());
    try {
      const body = await req.json();
      if (body?.date) requestDate = body.date;
    } catch {
      // ignore empty body
    }

    const { userId, role, supabaseUserClient } = await getUserAndRole(req, supabaseUrl, supabaseAnonKey);
    try {
      assertRole(role, ["agent"]);
    } catch {
      return unauthorized("Agent role required");
    }

    const windowEnd = new Date(requestDate);
    windowEnd.setDate(windowEnd.getDate() + 7);
    const windowEndStr = formatDate(windowEnd);

    const { data: profile } = await supabaseUserClient
      .from("profiles")
      .select("district")
      .eq("id", userId)
      .maybeSingle();

    const { data: tasks, error: taskError } = await supabaseUserClient
      .from("agent_tasks")
      .select("id, farmer_id, crop_id, task_type, status, due_date, notes")
      .eq("agent_id", userId)
      .eq("status", "OPEN")
      .lte("due_date", windowEndStr)
      .order("due_date", { ascending: true });

    if (taskError) throw taskError;

    if (!tasks || tasks.length === 0) {
      await supabaseUserClient.from("ai_logs").insert({
        user_id: userId,
        module_type: "AGENT_PRIORITIZE",
        input_data: { date: requestDate, task_count: 0 },
        output_data: { prioritized: [] },
      });
      return ok({ prioritized: [] });
    }

    let prioritized: { task_id: string; rank: number; reason: string }[] = [];
    let aiSuccess = false;

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "You prioritize field agent tasks for agriculture visits. Rank tasks by urgency using due date, crop readiness, and proximity to the agent district.",
            },
            {
              role: "user",
              content: `Agent district: ${profile?.district || "Unknown"}
Target date: ${requestDate}
Tasks (JSON):
${JSON.stringify(tasks, null, 2)}

Return JSON array with task_id, rank (1 = highest), and short reason.`,
            },
          ],
          temperature: 0.4,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI request failed: ${response.status}`);
      }

      const aiData = await response.json();
      const content = aiData.choices?.[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          prioritized = parsed.map((item, idx) => ({
            task_id: item.task_id || item.id,
            rank: item.rank || idx + 1,
            reason: item.reason || "No reason provided",
          }));
          aiSuccess = true;
        }
      }
    } catch (error) {
      console.error("AI prioritization failed, using fallback:", error);
    }

    if (!aiSuccess) {
      prioritized = (tasks || [])
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
        .map((task, idx) => ({
          task_id: task.id,
          rank: idx + 1,
          reason: "Fallback: earlier due date",
        }));
    }

    await supabaseUserClient.from("ai_logs").insert({
      user_id: userId,
      module_type: "AGENT_PRIORITIZE",
      input_data: { date: requestDate, task_count: tasks.length },
      output_data: { prioritized, ai_success: aiSuccess },
    });

    return ok({ prioritized });
  } catch (error) {
    console.error("agent_prioritize error", error);
    return serverError("Unable to prioritize tasks");
  }
});
