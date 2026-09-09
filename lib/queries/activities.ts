import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase";

export type SubEventActivity = Tables<"sub_event_activities">;

export const activitiesCache = {
  listKey: (subEventId: string) => ["sub_event_activities", subEventId] as const,
};

export async function listActivities(subEventId: string): Promise<SubEventActivity[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sub_event_activities")
    .select("*")
    .eq("sub_event_id", subEventId)
    .order("sort_order");

  if (error) throw new Error(error.message);
  return data;
}

export async function createActivity(
  input: TablesInsert<"sub_event_activities">
): Promise<SubEventActivity> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sub_event_activities")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateActivity(
  id: string,
  patch: TablesUpdate<"sub_event_activities">
): Promise<SubEventActivity> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sub_event_activities")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteActivity(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("sub_event_activities").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
