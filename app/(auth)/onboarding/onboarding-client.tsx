"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Building2, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getMyProfile, profileCache } from "@/lib/queries/profile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function OnboardingClient() {
  const router = useRouter();
  const { data: profile, isPending: profilePending } = useQuery({
    queryKey: profileCache.meKey,
    queryFn: getMyProfile,
  });

  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already onboarded -- nothing to do here.
  if (!profilePending && profile?.companies) {
    router.replace("/pending-approval");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Your session expired. Please log in again.");
      setSubmitting(false);
      return;
    }

    const baseSlug = slugify(name) || "company";
    let slug = baseSlug;
    let attempt = 0;

    // companies.slug is unique -- retry with a random suffix on collision
    // rather than asking the user to pick a slug themselves.
    while (attempt < 5) {
      const { error: insertError } = await supabase.from("companies").insert({
        profile_id: user.id,
        name,
        slug,
        contact_email: contactEmail || user.email!,
      });

      if (!insertError) {
        router.push("/pending-approval");
        return;
      }

      if (insertError.code === "23505") {
        attempt += 1;
        slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
        continue;
      }

      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    setError("Could not generate a unique URL for your company. Try a different name.");
    setSubmitting(false);
  }

  if (profilePending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <Skeleton className="h-72 w-full max-w-sm rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="size-5" />
          </span>
          <h1 className="text-xl font-semibold tracking-tight">Set up your company</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Company details</CardTitle>
            <CardDescription>
              An admin will review and approve your account before you can publish events.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="onboard-name">Company name</Label>
                <Input id="onboard-name" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="onboard-email">Contact email</Label>
                <Input
                  id="onboard-email"
                  type="email"
                  placeholder="Defaults to your login email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Creating..." : "Continue"}
                <ArrowRight />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
