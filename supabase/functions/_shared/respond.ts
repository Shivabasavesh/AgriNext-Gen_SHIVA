export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: unknown, status: number) =>
  new Response(JSON.stringify(body ?? {}), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export const ok = (data: unknown, status = 200) =>
  jsonResponse({ data }, status);

export const badRequest = (message: string, details?: unknown) =>
  jsonResponse({ error: message, details }, 400);

export const unauthorized = (message = "Unauthorized") =>
  jsonResponse({ error: message }, 401);

export const forbidden = (message = "Forbidden") =>
  jsonResponse({ error: message }, 403);

export const serverError = (message = "Server error", details?: unknown) =>
  jsonResponse({ error: message, details }, 500);
