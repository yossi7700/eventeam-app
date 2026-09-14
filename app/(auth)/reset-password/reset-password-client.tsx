"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Reached either:
//  (a) with ?code=... still unexchanged -- auth/callback deliberately
//      forwards the recovery code here rather than exchanging it itself,
//      because that route is exactly what email link scanners
//      (Gmail/Outlook "Safe Links") pre-fetch in the background before
//      the user opens the email, which would silently burn the
//      one-time-use code before the user's real click. Confirmed live
//      via Supabase auth logs: a "One-time token not found" / PKCE
//      verifier mismatch on a link the user had genuinely only clicked
//      once.
//  (b) with an already-active session (the exchange below succeeded on
//      a previous render, or the user is just changing their password
//      while logged in) -- goes straight to the password form.
// Gating the exchange behind an explicit "Continue" click means only a
// real human visit can ever consume the code.
export function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  const [sessionReady, setSessionReady] = useState(!code);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleContinue() {
    if (!code) return;
    setConfirming(true);
    setConfirmError(null);

    const supabase = createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    setConfirming(false);

    if (exchangeError) {
      setConfirmError(
        exchangeError.message.toLowerCase().includes("verifier")
          ? "This link was opened in a different browser than the one you requested it from. Please request a new reset link and open it in that same browser."
          : "This link is invalid or has expired. Please request a new one."
      );
      return;
    }

    setSessionReady(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (!sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <KeyRound className="size-5" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight">Reset your password</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Confirm it&apos;s you</CardTitle>
              <CardDescription>Click below to continue resetting your password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {confirmError && (
                <Alert variant="destructive">
                  <AlertDescription>{confirmError}</AlertDescription>
                </Alert>
              )}
              <Button onClick={handleContinue} disabled={confirming} className="w-full">
                {confirming ? "Confirming..." : "Continue"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <KeyRound className="size-5" />
          </span>
          <h1 className="text-xl font-semibold tracking-tight">Set a new password</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">New password</CardTitle>
            <CardDescription>Choose a new password for your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="rp-password">New password</Label>
                <Input
                  id="rp-password"
                  required
                  type="password"
                  minLength={8}
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rp-confirm">Confirm new password</Label>
                <Input
                  id="rp-confirm"
                  required
                  type="password"
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Saving..." : "Save new password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
