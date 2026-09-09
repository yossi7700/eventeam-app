import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase";

export type DonationField = Tables<"donation_fields">;
export type DonationFieldTemplate = Tables<"donation_field_templates">;

export const donationFieldsCache = {
  listKey: (eventId: string) => ["donation_fields", eventId] as const,
};

export const donationTemplatesCache = {
  listKey: (companyId: string) => ["donation_field_templates", companyId] as const,
};

// The company-level reusable catalog (mirrors the old system's
// CompanyDonationFields) -- defined once, then selected per event instead
// of re-typed every time.
export async function listDonationTemplates(
  companyId: string
): Promise<DonationFieldTemplate[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("donation_field_templates")
    .select("*")
    .eq("company_id", companyId)
    .order("sort_order");

  if (error) throw new Error(error.message);
  return data;
}

export async function createDonationTemplate(
  input: TablesInsert<"donation_field_templates">
): Promise<DonationFieldTemplate> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("donation_field_templates")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateDonationTemplate(
  id: string,
  patch: TablesUpdate<"donation_field_templates">
): Promise<DonationFieldTemplate> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("donation_field_templates")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteDonationTemplate(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("donation_field_templates").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// Adds one of the company's catalog templates to a specific event,
// pre-filled from the template but stored as an independent per-event row
// (editable/deletable per event without touching the catalog, matching
// the old system's EventDonation join semantics).
export async function addTemplateToEvent(
  eventId: string,
  template: DonationFieldTemplate,
  sortOrder: number
): Promise<DonationField> {
  return createDonationField({
    event_id: eventId,
    template_id: template.id,
    title: template.title,
    description: template.description,
    suggested_amount: template.suggested_amount,
    allow_custom_amount: template.allow_custom_amount,
    sort_order: sortOrder,
  });
}

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
