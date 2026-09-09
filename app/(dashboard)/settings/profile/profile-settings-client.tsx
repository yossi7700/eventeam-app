"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getMyProfile, profileCache, updateMyProfile } from "@/lib/queries/profile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileCache.meKey });
      toast.success("Profile saved.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isPending) {
    return <Skeleton className="h-56 max-w-xl rounded-xl" />;
  }

  return (
    <div className="max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Full name</Label>
              <Input id="profile-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-phone">Phone</Label>
              <Input id="profile-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
