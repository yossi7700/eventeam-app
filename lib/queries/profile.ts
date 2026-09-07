import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesUpdate } from "@/types/supabase";

export type ProfileWithCompany = Tables<"profiles"> & {
  companies: Tables<"companies"> | null;
};

export const profileCache = {
  meKey: ["profile", "me"] as const,
};

export async function getMyProfile(): Promise<ProfileWithCompany | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // companies has two FKs to profiles (profile_id and approved_by), so the
  // embed must name the constraint explicitly or PostgREST rejects it as
  // ambiguous.
  const { data, error } = await supabase
    .from("profiles")
    .select("*, companies!companies_profile_id_fkey(*)")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as ProfileWithCompany | null;
}

export async function updateMyProfile(
  patch: Pick<TablesUpdate<"profiles">, "full_name" | "phone">
): Promise<Tables<"profiles">> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
