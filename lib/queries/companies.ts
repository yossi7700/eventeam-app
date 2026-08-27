import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/supabase";

export type Company = Tables<"companies">;

export const companiesCache = {
  listKey: ["companies", "all"] as const,
};

export async function listAllCompanies(): Promise<Company[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}
