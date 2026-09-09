import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/supabase";

export type RegistrationWithGuests = Tables<"registrations"> & {
  guests: Tables<"guests">[];
  guest_payments: Tables<"guest_payments">[];
};

export const leadsCache = {
  listKey: (eventId: string) => ["leads", eventId] as const,
};

export async function listRegistrationsForEvent(
  eventId: string
): Promise<RegistrationWithGuests[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("registrations")
    .select("*, guests(*), guest_payments(*)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as RegistrationWithGuests[];
}
