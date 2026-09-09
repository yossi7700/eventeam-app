import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/supabase";

export type City = Tables<"cities">;

// Ported from the old system's DashboardController::searchCities (required
// >=3 chars, case-insensitive substring match on city_name). Queried
// directly via RLS (public read) rather than an Edge Function -- this is a
// plain indexed read, no server trust needed.
export async function searchCities(term: string): Promise<City[]> {
  if (term.trim().length < 3) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("cities")
    .select("*")
    .ilike("city_name", `%${term.trim()}%`)
    .order("city_name")
    .limit(20);

  if (error) throw new Error(error.message);
  return data;
}
