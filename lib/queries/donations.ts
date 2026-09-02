import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase";

export type DonationField = Tables<"donation_fields">;

export const donationFieldsCache = {
  listKey: (eventId: string) => ["donation_fields", eventId] as const,
};

export async function listDonationFields(eventId: string): Promise<DonationField[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("donation_fields")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order");

  if (error) throw new Error(error.message);
  return data;
}

export async function createDonationField(
  input: TablesInsert<"donation_fields">
): Promise<DonationField> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("donation_fields")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateDonationField(
  id: string,
  patch: TablesUpdate<"donation_fields">
): Promise<DonationField> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("donation_fields")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteDonationField(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("donation_fields").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
