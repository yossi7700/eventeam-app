import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createServiceClient, createUserClient, errorResponse, invokeEmailFunction, jsonResponse } from "../_shared/supabase.ts";
import { handleCors } from "../_shared/cors.ts";

type RequestOtpInput = {
  purpose: "change_stripe_keys" | "change_commission_rate" | "change_password" | "change_email";
};

const OTP_TTL_MINUTES = 10;
const OTP_LENGTH = 6;

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateOtp(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const n = new DataView(bytes.buffer).getUint32(0);
  return String(n % 10 ** OTP_LENGTH).padStart(OTP_LENGTH, "0");
}

Deno.serve(async (req: Request) => {
  const { preflight, headers: corsHeaders } = handleCors(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return errorResponse("method not allowed", 405, corsHeaders);
  }

  let body: RequestOtpInput;
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid JSON body", 400, corsHeaders);
  }

  const validPurposes = [
    "change_stripe_keys",
    "change_commission_rate",
    "change_password",
    "change_email",
  ];
  if (!body.purpose || !validPurposes.includes(body.purpose)) {
    return errorResponse(`purpose must be one of: ${validPurposes.join(", ")}`, 422, corsHeaders);
  }

  const userClient = createUserClient(req);
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return errorResponse("authentication required", 401, corsHeaders);
  }

  const serviceClient = createServiceClient();

  // Gap-audit item: old HomeController::sendOTP capped requests at 5 per
  // email+type per 5-minute window (querying the otps table's created_at
  // before inserting a new row) -- this endpoint had no equivalent limit,
  // so an authenticated caller could email-bomb their own inbox (or drain
  // the Resend quota) with unlimited OTP requests. Counted here, before
  // the delete-and-replace below, since that delete would otherwise erase
  // the very rows a count needs to see.
  const rateLimitWindowStart = new Date(Date.now() - 5 * 60_000).toISOString();
  const { count: recentRequestCount } = await serviceClient
    .from("otp_verifications")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", user.id)
    .eq("purpose", body.purpose)
    .gte("created_at", rateLimitWindowStart);

  if ((recentRequestCount ?? 0) >= 5) {
    return errorResponse(
      "Too many OTP requests. Please wait a few minutes and try again.",
      429,
      corsHeaders
    );
  }

  // At most one active (unconsumed, unexpired) OTP per profile+purpose at
  // a time. Requesting again invalidates the previous one rather than
  // stacking multiple valid codes.
  await serviceClient
    .from("otp_verifications")
    .delete()
    .eq("profile_id", user.id)
    .eq("purpose", body.purpose)
    .is("consumed_at", null);

  const code = generateOtp();
  const codeHash = await sha256Hex(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString();

  const { error } = await serviceClient.from("otp_verifications").insert({
    profile_id: user.id,
    purpose: body.purpose,
    code_hash: codeHash,
    expires_at: expiresAt,
  });

  if (error) {
    return errorResponse(error.message, 500, corsHeaders);
  }

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  // OTP delivery is platform-owned, never company-branded -- company_id is
  // always null so this always resolves to the seeded platform-default
  // "otp_code" template, never a company override.
  await invokeEmailFunction("otp_code", user.email ?? "", null, {
    guest_name: profile?.full_name ?? "",
    otp_code: code,
    purpose: body.purpose,
  }).catch(() => {
    // invokeEmailFunction already swallows its own errors and logs them;
    // this catch is just defensive since we deliberately don't want an
    // email failure to change the response shape here.
  });

  return jsonResponse(
    { requested: true, expires_in_seconds: OTP_TTL_MINUTES * 60 },
    200,
    corsHeaders
  );
});
