import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/supabase";

export type EventListItem = Tables<"events">;

export type EventWithChildren = Tables<"events"> & {
  sub_events: (Tables<"sub_events"> & {
    products: Tables<"products">[];
  })[];
};

export const eventsCache = {
  listKey: (companyId: string | null) => ["events", companyId] as const,
  detailKey: (eventId: string) => ["events", "detail", eventId] as const,
};

export async function listEvents(companyId: string): Promise<EventListItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("company_id", companyId)
    .order("start_date", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

// Single round trip: event + its sub_events + each sub_event's products.
// Avoids the N+1 client-side waterfall the old system had on its event
// detail page.
export async function getEventWithChildren(
  eventId: string
): Promise<EventWithChildren | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("events")
    .select(
      `*,
       sub_events (
         *,
         products (*)
       )`
    )
    .eq("id", eventId)
    .order("sort_order", { referencedTable: "sub_events" })
    .order("sort_order", { referencedTable: "sub_events.products" })
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as EventWithChildren | null;
}

// Gap-audit item: old system's EventController::getEventDetail computed
// remaining_seats per sub-event (capacity - taken seats) on the company's
// own event-detail response. The dashboard event edit page can edit
// capacity but never showed how many tickets are already sold against
// it. guest_line_items already has a company-scoped RLS select policy
// (their own event's registrations), so this reads it directly rather
// than going through the public-only availability view (which requires
// the event to be active/ended, excluding drafts a company is still
// editing).
export async function getSoldQuantitiesByProduct(
  productIds: string[]
): Promise<Record<string, number>> {
  if (productIds.length === 0) return {};
  const supabase = createClient();
  const { data, error } = await supabase
    .from("guest_line_items")
    .select("product_id, quantity")
    .in("product_id", productIds);

  if (error) throw new Error(error.message);

  const sold: Record<string, number> = {};
  for (const row of data ?? []) {
    if (!row.product_id) continue;
    sold[row.product_id] = (sold[row.product_id] ?? 0) + (row.quantity ?? 0);
  }
  return sold;
}

export async function deleteEvent(eventId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) throw new Error(error.message);
}

export async function setEventStatus(
  eventId: string,
  status: Tables<"events">["status"]
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("events")
    .update({ status })
    .eq("id", eventId);
  if (error) throw new Error(error.message);
}
