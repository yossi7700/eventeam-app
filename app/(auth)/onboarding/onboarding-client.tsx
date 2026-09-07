"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getMyProfile, profileCache } from "@/lib/queries/profile";

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
    return <div className="mx-auto mt-24 h-48 max-w-sm animate-pulse rounded-lg bg-gray-100" />;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center space-y-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold">Set up your company</h1>
        <p className="mt-1 text-sm text-gray-500">
          An admin will review and approve your account before you can publish events.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          required
          placeholder="Company name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        <input
          type="email"
          placeholder="Contact email (defaults to your login email)"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Continue"}
        </button>
      </form>
    </div>
  );
}
