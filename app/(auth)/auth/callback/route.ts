import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles the redirect back from Supabase Auth after a magic link, OAuth
// provider (Google/Facebook), or password-recovery email link.
//
// This route itself is exactly what an email client's link scanner
// (Gmail/Outlook "Safe Links") pre-fetches in the background before the
// user ever opens the email -- confirmed live via Supabase auth logs
// (a "One-time token not found" / PKCE verifier mismatch on a link the
// user swore they'd only clicked once). Eagerly exchanging the code on
// every GET here means that automated fetch silently burns the
// one-time-use code before the real click happens.
//
// For the password-recovery flow specifically, defer the exchange:
// forward the code to /reset-password unexchanged and let a real button
// click there trigger it (see reset-password-client.tsx). Other flows
// (OAuth, signup/magic-link confirmation) keep the original eager
// behavior -- they aren't the ones observed failing, and OAuth's
// provider round-trip is itself already a human action a scanner can't
// replicate.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  if (next === "/reset-password") {
    return NextResponse.redirect(`${origin}/reset-password?code=${encodeURIComponent(code)}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (!error) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  console.error("auth/callback: exchangeCodeForSession failed:", error.message);

  const reason = error.message.toLowerCase().includes("verifier")
    ? "auth_callback_wrong_browser"
    : "auth_callback_failed";
  return NextResponse.redirect(`${origin}/login?error=${reason}`);
}
