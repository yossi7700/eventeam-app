import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createUserClient, errorResponse, invokeEmailFunction, jsonResponse } from "../_shared/supabase.ts";
import { handleCors } from "../_shared/cors.ts";

// Gap-audit item: old system's EventRegistrationController::notifyCompany
// let an admin email the company about a registration stuck on a pending
// cash payment, using the admin-defined 'notify_company' template. Renamed
// kind here to 'pending_cash_reminder' to match this system's naming
// convention; same underlying purpose.

type NotifyCashPendingInput = {
  registration_id: string;
};

Deno.serve(async (req: Request) => {
  const { preflight, headers: corsHeaders } = handleCors(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return errorResponse("method not allowed", 405, corsHeaders);
  }

  let body: NotifyCashPendingInput;
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid JSON body", 400, corsHeaders);
  }

  if (!body.registration_id) {
    return errorResponse("registration_id is required", 422, corsHeaders);
  }

  const supabase = createUserClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("authentication required", 401, corsHeaders);
  }

  // RLS already scopes this select to the caller's own company or admin --
  // no separate ownership check needed here, unlike the write-path RPCs.
  const { data: registration, error } = await supabase
    .from("registrations")
    .select(
      `id, primary_guest_name, total_amount, currency,
       event:events ( title, company_id, companies ( name, contact_email ) ),
       guest_payments ( status, method )`
    )
    .eq("id", body.registration_id)
    .maybeSingle();

  if (error) {
    return errorResponse(error.message, 400, corsHeaders);
  }
  if (!registration) {
    return errorResponse("registration not found", 404, corsHeaders);
  }

  const event = Array.isArray(registration.event) ? registration.event[0] : registration.event;
  const company = event
    ? Array.isArray(event.companies)
      ? event.companies[0]
      : event.companies
    : null;
  const hasPendingCash = (registration.guest_payments ?? []).some(
    (p: { status: string; method: string }) => p.method === "cash" && p.status === "pending"
  );

  if (!company || !event) {
    return errorResponse("could not resolve the company for this registration", 404, corsHeaders);
  }
  if (!hasPendingCash) {
    return errorResponse("this registration has no pending cash payment", 422, corsHeaders);
  }

  await invokeEmailFunction("pending_cash_reminder", company.contact_email, event.company_id, {
    company_name: company.name,
    event_title: event.title,
    guest_name: registration.primary_guest_name,
    total_amount: String(registration.total_amount),
    currency: registration.currency,
  });

  return jsonResponse({ notified: true }, 200, corsHeaders);
});
