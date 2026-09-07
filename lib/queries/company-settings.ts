import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesUpdate } from "@/types/supabase";

export type CompanySettings = Tables<"company_settings">;
export type Company = Tables<"companies">;

export const companySettingsCache = {
  key: (companyId: string | null) => ["company_settings", companyId] as const,
  companyKey: (companyId: string | null) => ["company", companyId] as const,
};

export async function getCompanySettings(companyId: string): Promise<CompanySettings | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("company_settings")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

// admin_commission_pct is intentionally excluded from this update path --
// it's blocked at the DB level (a trigger silently reverts non-admin
// changes to it) and is only changeable via the OTP-gated
// change_commission_rate flow in Settings > Security.
export async function updateCompanySettings(
  companyId: string,
  patch: Omit<TablesUpdate<"company_settings">, "admin_commission_pct" | "company_id">
): Promise<CompanySettings> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("company_settings")
    .update(patch)
    .eq("company_id", companyId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getCompany(companyId: string): Promise<Company | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateCompany(
  companyId: string,
  patch: Pick<
    TablesUpdate<"companies">,
    "name" | "contact_email" | "contact_phone" | "address_line1" | "address_line2" | "city" | "region" | "postal_code" | "country"
  >
): Promise<Company> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("companies")
    .update(patch)
    .eq("id", companyId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
