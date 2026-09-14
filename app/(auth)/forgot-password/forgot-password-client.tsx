"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ForgotPasswordClient() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    setSubmitting(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Mail className="size-6" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              If an account exists for <strong className="text-foreground">{email}</strong>,
              we&apos;ve sent a password reset link. Open it in the same browser and click it
              only once — the link is single-use and expires after a short time.
            </p>
          </CardContent>
        </Card>
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
          <h1 className="text-xl font-semibold tracking-tight">Reset your password</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Forgot password</CardTitle>
            <CardDescription>
              Enter your account email and we&apos;ll send you a link to set a new password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="fp-email">Email</Label>
                <Input
                  id="fp-email"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Sending..." : "Send reset link"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
