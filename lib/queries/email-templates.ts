import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesInsert, TablesUpdate, Enums } from "@/types/supabase";

export type EmailTemplate = Tables<"email_templates">;
export type EmailTemplateKind = Enums<"email_template_kind">;

export const EMAIL_TEMPLATE_KINDS: EmailTemplateKind[] = [
  "registration_confirmation",
  "thank_you",
  "company_signup",
  "company_approved",
  "company_rejected",
];

export const emailTemplatesCache = {
  listKey: (companyId: string | null) => ["email_templates", companyId] as const,
};

export async function listEmailTemplates(companyId: string): Promise<EmailTemplate[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .eq("company_id", companyId)
    .order("kind");

  if (error) throw new Error(error.message);
  return data;
}

export async function upsertEmailTemplate(
  input: TablesInsert<"email_templates">
): Promise<EmailTemplate> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("email_templates")
    .upsert(input, { onConflict: "company_id,kind" })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateEmailTemplate(
  id: string,
  patch: TablesUpdate<"email_templates">
): Promise<EmailTemplate> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("email_templates")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
