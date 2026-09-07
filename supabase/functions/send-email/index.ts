import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createServiceClient, errorResponse, jsonResponse } from "../_shared/supabase.ts";
import { sendViaResend } from "../_shared/resend.ts";

type SendEmailInput = {
  company_id: string | null;
  kind:
    | "registration_confirmation"
    | "thank_you"
    | "company_signup"
    | "company_approved"
    | "company_rejected"
    | "otp_code";
  to: string;
  variables?: Record<string, string>;
};

function interpolate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : match
  );
}

// This function is invoked internally by other Edge Functions and by
// pg_net-triggered flows, not directly by end users -- there is no
// end-user-facing "send yourself an arbitrary email" use case, so it runs
// entirely on the service role and does not accept a user JWT.
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return errorResponse("method not allowed", 405);
  }

  let body: SendEmailInput;
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid JSON body", 400);
  }

  if (!body.kind || !body.to) {
    return errorResponse("kind and to are required", 422);
  }

  const supabase = createServiceClient();

  // Company override first, platform default as fallback.
  let template = null;
  if (body.company_id) {
    const { data } = await supabase
      .from("email_templates")
      .select("subject, body_html")
      .eq("company_id", body.company_id)
      .eq("kind", body.kind)
      .eq("is_active", true)
      .maybeSingle();
    template = data;
  }

  if (!template) {
    const { data } = await supabase
      .from("email_templates")
      .select("subject, body_html")
      .is("company_id", null)
      .eq("kind", body.kind)
      .eq("is_active", true)
      .maybeSingle();
    template = data;
  }

  if (!template) {
    return errorResponse(
      `No email template found for kind "${body.kind}" (checked company override and platform default).`,
      404
    );
  }

  const variables = body.variables ?? {};
  const subject = interpolate(template.subject, variables);
  const html = interpolate(template.body_html, variables);

  try {
    const result = await sendViaResend({
      to: body.to,
      from: Deno.env.get("EMAIL_FROM_ADDRESS") ?? "noreply@example.com",
      subject,
      html,
    });
    return jsonResponse({ sent: true, id: result.id });
  } catch (err) {
    return errorResponse((err as Error).message, 502);
  }
});
