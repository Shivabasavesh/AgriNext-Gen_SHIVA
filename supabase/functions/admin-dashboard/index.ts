import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const safeCount = async (
  label: string,
  promise: Promise<{ count: number | null; error: Error | null }>
) => {
  try {
    const { count, error } = await promise;
    if (error) throw error;
    return count ?? 0;
  } catch (error) {
    console.error(`Count failed for ${label}:`, error);
    return 0;
  }
};

const safeData = async <T>(
  label: string,
  promise: Promise<{ data: T | null; error: Error | null }>
) => {
  try {
    const { data, error } = await promise;
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.error(`Fetch failed for ${label}:`, error);
    return [] as unknown as T;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Missing authorization header" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Service not configured" }, 500);
  }

  const supabaseClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  const {
    data: { user },
    error: userError,
  } = await supabaseClient.auth.getUser();

  if (userError || !user) {
    console.error("Auth error:", userError);
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const { data: roleData, error: roleError } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (roleError) {
    console.error("Role lookup error:", roleError);
  }

  const isAdmin = Array.isArray(roleData)
    ? roleData.some((roleRow) => roleRow.role === "admin")
    : roleData?.role === "admin";

  if (!isAdmin) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  const [
    totalFarmers,
    totalAgents,
    totalTransporters,
    totalBuyers,
    totalCrops,
    totalTransportRequests,
    totalTransportJobs,
    totalMarketplaceListings,
    totalOrders,
    pendingTransport,
    activeTransport,
    pendingOrders,
    newOrdersToday,
  ] = await Promise.all([
    safeCount(
      "farmers",
      serviceClient
        .from("user_roles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "farmer")
    ),
    safeCount(
      "agents",
      serviceClient
        .from("user_roles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "agent")
    ),
    safeCount(
      "transporters",
      serviceClient.from("transporters").select("id", { count: "exact", head: true })
    ),
    safeCount(
      "buyers",
      serviceClient.from("buyers").select("id", { count: "exact", head: true })
    ),
    safeCount(
      "crops",
      serviceClient.from("crops").select("id", { count: "exact", head: true })
    ),
    safeCount(
      "transport_requests",
      serviceClient.from("transport_requests").select("id", { count: "exact", head: true })
    ),
    safeCount(
      "transport_jobs",
      serviceClient
        .from("transport_requests")
        .select("id", { count: "exact", head: true })
        .in("status", ["assigned", "en_route", "picked_up", "delivered"])
    ),
    safeCount(
      "listings",
      serviceClient.from("listings").select("id", { count: "exact", head: true })
    ),
    safeCount(
      "market_orders",
      serviceClient.from("market_orders").select("id", { count: "exact", head: true })
    ),
    safeCount(
      "pending_transport",
      serviceClient
        .from("transport_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "requested")
    ),
    safeCount(
      "active_transport",
      serviceClient
        .from("transport_requests")
        .select("id", { count: "exact", head: true })
        .in("status", ["assigned", "en_route", "picked_up"])
    ),
    safeCount(
      "pending_orders",
      serviceClient
        .from("market_orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "requested")
    ),
    safeCount(
      "new_orders_today",
      serviceClient
        .from("market_orders")
        .select("id", { count: "exact", head: true })
        .gte("created_at", todayIso)
    ),
  ]);

  const cropsByStatusData = await safeData<any[]>(
    "crops_by_status",
    serviceClient.from("crops").select("status, count:id", { group: "status" })
  );

  const cropsByStatus: Record<string, number> = {};
  (cropsByStatusData || []).forEach((row) => {
    const statusKey = row.status || "unknown";
    const countValue =
      typeof row.count === "number" ? row.count : Number(row.count) || 0;
    cropsByStatus[statusKey] = countValue;
  });

  const harvestReady = cropsByStatus["ready"] ?? 0;
  const oneWeekAway = cropsByStatus["one_week"] ?? 0;

  const [transportEvents, cropEvents, orderEvents] = await Promise.all([
    safeData<
      Array<{ id: string; status: string; created_at: string }>
    >(
      "recent_transport",
      serviceClient
        .from("transport_requests")
        .select("id, status, created_at")
        .order("created_at", { ascending: false })
        .limit(10)
    ),
    safeData<
      Array<{ id: string; crop_name: string | null; status: string; created_at: string }>
    >(
      "recent_crops",
      serviceClient
        .from("crops")
        .select("id, crop_name, status, created_at")
        .order("created_at", { ascending: false })
        .limit(10)
    ),
    safeData<Array<{ id: string; status: string; created_at: string }>>(
      "recent_orders",
      serviceClient
        .from("market_orders")
        .select("id, status, created_at")
        .order("created_at", { ascending: false })
        .limit(10)
    ),
  ]);

  const recentActivity = [
    ...(transportEvents || []).map((event) => ({
      id: event.id,
      type: "transport",
      message: `Transport request (${event.status})`,
      time: event.created_at,
    })),
    ...(cropEvents || []).map((crop) => ({
      id: crop.id,
      type: "crop",
      message: `Crop added: ${crop.crop_name ?? "New crop"}`,
      time: crop.created_at,
    })),
    ...(orderEvents || []).map((order) => ({
      id: order.id,
      type: "order",
      message: `New order placed (${order.status})`,
      time: order.created_at,
    })),
  ]
    .sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
    )
    .slice(0, 20);

  const summary = {
    totalFarmers,
    totalAgents,
    totalTransporters,
    activeTransporters: totalTransporters,
    totalBuyers,
    totalCrops,
    cropsByStatus,
    totalTransportRequests,
    totalTransportJobs,
    totalMarketplaceListings,
    totalOrders,
    harvestReady,
    oneWeekAway,
    pendingTransport,
    activeTransport,
    pendingOrders,
    newOrdersToday,
  };

  return jsonResponse({ summary, recentActivity });
});
