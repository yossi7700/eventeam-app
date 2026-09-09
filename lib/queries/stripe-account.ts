import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/supabase";

export type StripeAccount = Tables<"stripe_accounts">;

export const stripeAccountCache = {
  key: (companyId: string) => ["stripe_account", companyId] as const,
};

export async function getStripeAccount(companyId: string): Promise<StripeAccount | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("stripe_accounts")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}
