import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/supabase";

export type TemplateEvent = Tables<"events">;

export const templatesCache = {
  listKey: ["templates"] as const,
};

export async function listMasterTemplates(): Promise<TemplateEvent[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("is_master_template", true)
    .order("title");

  if (error) throw new Error(error.message);
  return data;
}
