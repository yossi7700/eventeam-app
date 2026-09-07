import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createServiceClient, createUserClient, errorResponse, jsonResponse } from "../_shared/supabase.ts";

type VerifyOtpInput = {
  purpose: "change_stripe_keys" | "change_commission_rate" | "change_password" | "change_email";
  code: string;
  // purpose-specific payloads -- only the field matching `purpose` is used
  new_password?: string;
  new_email?: string;
  new_commission_pct?: number;
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return errorResponse("method not allowed", 405);
  }

  let body: VerifyOtpInput;
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid JSON body", 400);
  }

  if (!body.purpose || !body.code) {
    return errorResponse("purpose and code are required", 422);
  }

  const userClient = createUserClient(req);
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return errorResponse("authentication required", 401);
  }

  // Verification runs under the caller's own JWT (RLS-equivalent scoping
  // via auth.uid() inside the function) so a user can only ever verify
  // their own OTP, never someone else's.
  const { data: verified, error: verifyError } = await userClient.rpc("verify_and_consume_otp", {
    p_purpose: body.purpose,
    p_code: body.code,
  });

  if (verifyError) {
    const status = verifyError.code === "P0002" ? 404 : verifyError.code === "P0001" ? 409 : 400;
    return errorResponse(verifyError.message, status);
  }

  if (!verified) {
    return errorResponse("incorrect code", 401);
  }

  // The code checked out -- perform the actual gated mutation now, using
  // the service role since some of these (password/email) require the
  // Auth Admin API rather than a table write.
  const serviceClient = createServiceClient();

  switch (body.purpose) {
    case "change_password": {
      if (!body.new_password || body.new_password.length < 8) {
        return errorResponse("new_password (min 8 characters) is required", 422);
      }
      const { error } = await serviceClient.auth.admin.updateUserById(user.id, {
        password: body.new_password,
      });
      if (error) return errorResponse(error.message, 500);
      break;
    }

    case "change_email": {
      if (!body.new_email) {
        return errorResponse("new_email is required", 422);
      }
      const { error } = await serviceClient.auth.admin.updateUserById(user.id, {
        email: body.new_email,
      });
      if (error) return errorResponse(error.message, 500);
      break;
    }

    case "change_commission_rate": {
      if (body.new_commission_pct == null || body.new_commission_pct < 0 || body.new_commission_pct > 100) {
        return errorResponse("new_commission_pct (0-100) is required", 422);
      }
      const { data: company } = await serviceClient
        .from("companies")
        .select("id")
        .eq("profile_id", user.id)
        .maybeSingle();
      if (!company) {
        return errorResponse("no company found for this account", 404);
      }
      const { error } = await serviceClient
        .from("company_settings")
        .update({ admin_commission_pct: body.new_commission_pct })
        .eq("company_id", company.id);
      if (error) return errorResponse(error.message, 500);

      await serviceClient.from("audit_logs").insert({
        actor_profile_id: user.id,
        action: "company_settings.change_commission_rate",
        target_table: "company_settings",
        target_id: company.id,
        metadata: { new_commission_pct: body.new_commission_pct },
      });
      break;
    }

    case "change_stripe_keys": {
      // Stripe Connect in this system stores no client-writable "keys" on
      // company_settings/stripe_accounts -- the platform's own Stripe
      // secret lives only in Edge Function secrets, and a company's
      // connected account id is set exclusively by
      // stripe-connect-onboarding after a real OAuth handshake, not by a
      // user-submitted value. There is nothing for this OTP purpose to
      // write; it exists so the *disconnect* action (clearing
      // stripe_accounts) can be gated the same way once that flow is
      // built. Until then, verifying succeeds (the code is consumed) but
      // performs no mutation, matching the exact shape callers use for
      // the resolved purposes above.
      break;
    }
  }

  return jsonResponse({ verified: true, purpose: body.purpose });
});
