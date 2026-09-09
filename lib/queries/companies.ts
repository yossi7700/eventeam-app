import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/supabase";

export type Company = Tables<"companies">;

export const companiesCache = {
  listKey: ["companies", "all"] as const,
  detailKey: (companyId: string) => ["companies", "detail", companyId] as const,
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

export type CompanyDetail = Company & {
  company_settings: Tables<"company_settings"> | null;
  stripe_accounts: Tables<"stripe_accounts"> | null;
  events: Pick<Tables<"events">, "id" | "title" | "status" | "start_date" | "end_date">[];
};

// Single round trip for the admin's company-detail view: profile fields +
// settings + Stripe Connect status + this company's events, instead of four
// separate client fetches.
export async function getCompanyDetail(companyId: string): Promise<CompanyDetail | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("companies")
    .select(
      `*,
       company_settings (*),
       stripe_accounts (*),
       events (id, title, status, start_date, end_date)`
    )
    .eq("id", companyId)
    .order("start_date", { referencedTable: "events", ascending: false })
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as CompanyDetail | null;
}
