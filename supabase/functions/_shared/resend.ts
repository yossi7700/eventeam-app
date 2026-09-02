// RESEND_API_KEY must be set via `supabase secrets set RESEND_API_KEY=re_...`
// before send-email can actually deliver mail. Until then it fails with a
// clear "not configured" error rather than a confusing downstream crash --
// same placeholder-handling pattern as the Stripe secrets.

export async function sendViaResend(params: {
  to: string;
  from: string;
  subject: string;
  html: string;
}): Promise<{ id: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not configured. Set it with `supabase secrets set RESEND_API_KEY=re_...`."
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: params.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Resend API error (${response.status}): ${text}`);
  }

  return response.json();
}
