import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createUserClient, errorResponse, invokeEmailFunction, jsonResponse } from "../_shared/supabase.ts";

type ApproveCompanyInput = {
  company_id: string;
  approve: boolean;
  rejected_reason?: string;
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return errorResponse("method not allowed", 405);
  }

  let body: ApproveCompanyInput;
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid JSON body", 400);
  }

  if (!body.company_id || typeof body.approve !== "boolean") {
    return errorResponse("company_id and approve are required", 422);
  }

  const supabase = createUserClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("authentication required", 401);
  }

  const { error } = await supabase.rpc("approve_or_reject_company", {
    p_company_id: body.company_id,
    p_approve: body.approve,
    p_rejected_reason: body.rejected_reason ?? null,
  });

  if (error) {
    const status = error.code === "42501" ? 403 : 400;
    return errorResponse(error.message, status);
  }

  const { data: company } = await supabase
    .from("companies")
    .select("name, contact_email")
    .eq("id", body.company_id)
    .maybeSingle();

  if (company) {
    await invokeEmailFunction(
      body.approve ? "company_approved" : "company_rejected",
      company.contact_email,
      body.company_id,
      {
        company_name: company.name,
        rejected_reason: body.rejected_reason ?? "",
      }
    );
  }

  return jsonResponse({ success: true });
});
