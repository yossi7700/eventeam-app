import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/supabase";

export type PublicCompanyProfile = Tables<"public_company_profile">;
export type PublicEvent = Tables<"public_events_view">;
export type PublicSubEvent = Tables<"public_sub_events_view">;
export type PublicProduct = Tables<"public_products_view">;
export type PublicDonationField = Tables<"public_donation_fields_view">;

export type PublicEventWithChildren = PublicEvent & {
  sub_events: (PublicSubEvent & { products: PublicProduct[] })[];
  donation_fields: PublicDonationField[];
};

export const publicBookingCache = {
  companyKey: (slug: string) => ["public", "company", slug] as const,
  eventKey: (companySlug: string, eventSlug: string) =>
    ["public", "event", companySlug, eventSlug] as const,
};

export async function getPublicCompanyProfile(
  slug: string
): Promise<PublicCompanyProfile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("public_company_profile")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function listPublicEventsForCompany(
  companySlug: string
): Promise<PublicEvent[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("public_events_view")
    .select("*")
    .eq("company_slug", companySlug)
    .order("start_date", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

// Single round trip for the whole public event page: event + sub_events +
// products + donation fields. Avoids a client-side waterfall on the
// highest-traffic, most latency-sensitive page in the app.
export async function getPublicEventWithChildren(
  companySlug: string,
  eventSlug: string
): Promise<PublicEventWithChildren | null> {
  const supabase = createClient();

  const { data: event, error: eventError } = await supabase
    .from("public_events_view")
    .select("*")
    .eq("company_slug", companySlug)
    .eq("slug", eventSlug)
    .maybeSingle();

  if (eventError) throw new Error(eventError.message);
  if (!event || !event.id) return null;

  const [{ data: subEvents, error: subEventsError }, { data: donationFields, error: donationError }] =
    await Promise.all([
      supabase
        .from("public_sub_events_view")
        .select("*, products:public_products_view(*)")
        .eq("event_id", event.id)
        .order("sort_order"),
      supabase
        .from("public_donation_fields_view")
        .select("*")
        .eq("event_id", event.id)
        .order("sort_order"),
    ]);

  if (subEventsError) throw new Error(subEventsError.message);
  if (donationError) throw new Error(donationError.message);

  return {
    ...event,
    sub_events: (subEvents ?? []) as PublicEventWithChildren["sub_events"],
    donation_fields: donationFields ?? [],
  };
}
