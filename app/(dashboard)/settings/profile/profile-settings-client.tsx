"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyProfile, profileCache, updateMyProfile } from "@/lib/queries/profile";

export function ProfileSettingsClient() {
  const queryClient = useQueryClient();
  const { data: profile, isPending } = useQuery({
    queryKey: profileCache.meKey,
    queryFn: getMyProfile,
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [hydrated, setHydrated] = useState(false);

  if (!hydrated && profile) {
    setFullName(profile.full_name ?? "");
    setPhone(profile.phone ?? "");
    setHydrated(true);
  }

  const mutation = useMutation({
    mutationFn: () => updateMyProfile({ full_name: fullName, phone: phone || null }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileCache.meKey }),
  });

  if (isPending) {
    return <div className="h-32 max-w-xl animate-pulse rounded-lg bg-gray-100" />;
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-3 rounded-lg border p-4"
      >
        <input
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        <input
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        {mutation.error && (
          <p className="text-xs text-red-600">{(mutation.error as Error).message}</p>
        )}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {mutation.isPending ? "Saving..." : "Save profile"}
        </button>
      </form>
    </div>
  );
}
