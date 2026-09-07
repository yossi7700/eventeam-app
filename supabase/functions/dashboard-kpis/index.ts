import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createUserClient, errorResponse, jsonResponse } from "../_shared/supabase.ts";
import { handleCors } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  const { preflight, headers: corsHeaders } = handleCors(req);
  if (preflight) return preflight;

  if (req.method !== "GET" && req.method !== "POST") {
    return errorResponse("method not allowed", 405, corsHeaders);
  }

  const supabase = createUserClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("authentication required", 401, corsHeaders);
  }

  const { data, error } = await supabase.rpc("get_dashboard_kpis");

  if (error) {
    const status = error.code === "42501" ? 403 : 400;
    return errorResponse(error.message, status, corsHeaders);
  }

  return jsonResponse(data, 200, corsHeaders);
});
