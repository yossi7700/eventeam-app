import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createUserClient, errorResponse, jsonResponse } from "../_shared/supabase.ts";
import { handleCors } from "../_shared/cors.ts";

// Toggles a cash guest_payment between 'pending' and 'cleared_manually'.
// Mirrors the old system's EventRegistrationController::isClear (cash-only
// toggle), but -- unlike the old version -- the RPC underneath this
// enforces that the caller owns the event (or is admin) before allowing
// the change; the old isClear() had no such ownership check at all.

type MarkCashClearedInput = {
  payment_id: string;
};

Deno.serve(async (req: Request) => {
  const { preflight, headers: corsHeaders } = handleCors(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return errorResponse("method not allowed", 405, corsHeaders);
  }

  let body: MarkCashClearedInput;
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid JSON body", 400, corsHeaders);
  }

  if (!body.payment_id) {
    return errorResponse("payment_id is required", 422, corsHeaders);
  }

  const supabase = createUserClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("authentication required", 401, corsHeaders);
  }

  const { data, error } = await supabase.rpc("toggle_cash_payment_cleared", {
    p_payment_id: body.payment_id,
  });

  if (error) {
    const status = error.code === "42501" ? 403 : error.code === "P0002" ? 404 : 400;
    return errorResponse(error.message, status, corsHeaders);
  }

  return jsonResponse({ payment: data }, 200, corsHeaders);
});
