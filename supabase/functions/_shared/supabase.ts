import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

// A client scoped to the calling user's JWT -- respects RLS. Use this to
// read/verify data the caller is supposed to see.
export function createUserClient(req: Request): SupabaseClient {
  const authHeader = req.headers.get("Authorization") ?? "";
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
}

// A client using the service role key -- bypasses RLS entirely. Use this
// only for the specific writes that must be trusted/atomic/cross-tenant
// (e.g. transactional multi-table writes), never to satisfy a convenience.
export function createServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

// Server-to-server invocation of another Edge Function using the project's
// own service role key. Failures are swallowed to a console.error rather
// than thrown -- a confirmation email failing to send should never fail
// the registration/approval flow that triggered it.
export async function invokeEmailFunction(
  kind: string,
  to: string,
  companyId: string | null,
  variables: Record<string, string>
): Promise<void> {
  try {
    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ kind, to, company_id: companyId, variables }),
    });
    if (!response.ok) {
      console.error(`send-email failed (${response.status}): ${await response.text()}`);
    }
  } catch (err) {
    console.error(`send-email invocation failed: ${(err as Error).message}`);
  }
}
