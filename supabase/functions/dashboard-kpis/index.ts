import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createUserClient, errorResponse, jsonResponse } from "../_shared/supabase.ts";

Deno.serve(async (req: Request) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return errorResponse("method not allowed", 405);
  }

  const supabase = createUserClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("authentication required", 401);
  }

  const { data, error } = await supabase.rpc("get_dashboard_kpis");

  if (error) {
    const status = error.code === "42501" ? 403 : 400;
    return errorResponse(error.message, status);
  }

  return jsonResponse(data);
});
