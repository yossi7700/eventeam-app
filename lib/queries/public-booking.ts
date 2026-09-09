import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/supabase";

export type PublicCompanyProfile = Tables<"public_company_profile">;
export type PublicEvent = Tables<"public_events_view">;
export type PublicSubEvent = Tables<"public_sub_events_view">;
export type PublicProduct = Tables<"public_products_view">;
export type PublicDonationField = Tables<"public_donation_fields_view">;
export type PublicSubEventActivity = Tables<"public_sub_event_activities_view">;
export type PublicProductAvailability = Tables<"public_product_availability_view">;

export type ResolvedAdvanceSettings = {
  is_attendees_required: boolean | null;
  is_show_address: boolean | null;
  is_cash_allowed: boolean | null;
  is_donation_allowed: boolean | null;
  is_show_regulation: boolean | null;
  is_show_stripe: boolean | null;
  is_show_app_fee: boolean | null;
  is_enable_donation: boolean | null;
  platform_fee_pct: number | null;
  platform_fee_text: string | null;
};

export type PublicEventWithChildren = PublicEvent & {
  sub_events: (PublicSubEvent & {
    products: (PublicProduct & { remaining: number | null })[];
    activities: PublicSubEventActivity[];
  })[];
  donation_fields: PublicDonationField[];
  advance: ResolvedAdvanceSettings | null;
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

  const [
    { data: subEvents, error: subEventsError },
    { data: donationFields, error: donationError },
    { data: advanceRows, error: advanceError },
  ] = await Promise.all([
    supabase
      .from("public_sub_events_view")
      .select(
        "*, products:public_products_view(*), activities:public_sub_event_activities_view(*)"
      )
      .eq("event_id", event.id)
      .order("sort_order"),
    supabase
      .from("public_donation_fields_view")
      .select("*")
      .eq("event_id", event.id)
      .order("sort_order"),
    supabase.rpc("resolve_event_advance_settings", { p_event_id: event.id }),
  ]);

  if (subEventsError) throw new Error(subEventsError.message);
  if (donationError) throw new Error(donationError.message);
  if (advanceError) throw new Error(advanceError.message);

  // Gap-audit item: old HomeController::getBookingEventDetail returned
  // remaining_seats per sub-event. Fetched as a second pass keyed by
  // product id (the availability view has no event_id column of its own --
  // it inherits visibility by joining through public_sub_events_view) so a
  // sold-out product can show "0 remaining" instead of only failing at
  // submit time.
  const productIds = (subEvents ?? []).flatMap((se) =>
    (se.products ?? [])
      .map((p: PublicProduct) => p.id)
      .filter((id): id is string => id != null)
  );

  let availabilityByProduct = new Map<string, number | null>();
  if (productIds.length > 0) {
    const { data: availability, error: availabilityError } = await supabase
      .from("public_product_availability_view")
      .select("*")
      .in("product_id", productIds);

    if (availabilityError) throw new Error(availabilityError.message);
    availabilityByProduct = new Map(
      (availability ?? []).map((row) => [row.product_id as string, row.remaining])
    );
  }

  const subEventsWithAvailability = (subEvents ?? []).map((se) => ({
    ...se,
    products: (se.products ?? []).map((p: PublicProduct) => ({
      ...p,
      remaining: p.id ? (availabilityByProduct.get(p.id) ?? null) : null,
    })),
  }));

  return {
    ...event,
    sub_events: subEventsWithAvailability as PublicEventWithChildren["sub_events"],
    donation_fields: donationFields ?? [],
    advance: (advanceRows?.[0] as ResolvedAdvanceSettings | undefined) ?? null,
  };
}
