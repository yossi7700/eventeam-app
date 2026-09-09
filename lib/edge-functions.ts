import { createClient } from "@/lib/supabase/client";

export type ProductInput = {
  id?: string;
  name: string;
  description?: string | null;
  price: number;
  currency?: string;
  capacity?: number | null;
  color?: string | null;
  sort_order?: number;
};

export type SubEventInput = {
  id?: string;
  title: string;
  description?: string | null;
  location?: string | null;
  start_at: string;
  end_at?: string | null;
  capacity?: number | null;
  is_sunset_relative?: boolean;
  sunset_offset_minutes?: number | null;
  is_active?: boolean;
  sort_order?: number;
  products?: ProductInput[];
};

// Each flag is a tri-state: true/false pins an explicit per-event override,
// undefined/omitted means "inherit from the company/platform default" (see
// resolve_event_advance_settings). Mirrors the old system's EventMeta
// (per-event) falling back to EventAdvance (per-company/admin default).
export type EventAdvanceSettings = {
  is_attendees_required?: boolean | null;
  is_show_address?: boolean | null;
  is_cash_allowed?: boolean | null;
  is_donation_allowed?: boolean | null;
  is_show_regulation?: boolean | null;
  is_show_stripe?: boolean | null;
  is_show_app_fee?: boolean | null;
  is_enable_donation?: boolean | null;
};

export type CreateEventInput = {
  company_id: string | null;
  title: string;
  slug: string;
  description?: string | null;
  cover_image_path?: string | null;
  start_date: string;
  end_date: string;
  timezone?: string;
  sub_events?: SubEventInput[];
  advance?: EventAdvanceSettings;
  is_master_template?: boolean;
};

export type UpdateEventInput = {
  event_id: string;
  title: string;
  slug: string;
  description?: string | null;
  cover_image_path?: string | null;
  start_date: string;
  end_date: string;
  timezone?: string;
  sub_events?: SubEventInput[];
  advance?: EventAdvanceSettings;
};

async function invoke<TResponse>(
  name: string,
  body: Record<string, unknown>
): Promise<TResponse> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke<TResponse>(name, {
    body,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as TResponse;
}

export function createEvent(input: CreateEventInput) {
  return invoke<{ event_id: string }>("create-event", input);
}

export function updateEvent(input: UpdateEventInput) {
  return invoke<{ event_id: string }>("update-event", input);
}

export type RegisterGuestInput = {
  event_id: string;
  primary_guest_name: string;
  primary_guest_email: string;
  primary_guest_phone?: string;
  payment_method: "card" | "cash";
  guests: {
    full_name: string;
    email?: string;
    phone?: string;
    line_items: { sub_event_id: string; product_id: string; quantity: number }[];
  }[];
  donations?: { donation_field_id?: string; amount: number }[];
};

export type RegisterGuestResponse = {
  registration_id: string;
  total_amount: number;
  currency: string;
  requires_payment: boolean;
  client_secret?: string | null;
};

export function registerGuest(input: RegisterGuestInput) {
  return invoke<RegisterGuestResponse>("register-guest", input);
}

export type DashboardUpcomingEvent = {
  id: string;
  title: string;
  slug: string;
  start_date: string;
  end_date: string;
  company_id: string;
};

export type DashboardRecentRegistrant = {
  id: string;
  primary_guest_name: string;
  primary_guest_email: string;
  status: string;
  created_at: string;
  event_title: string;
  company_name: string;
  price_breakdown: {
    total_amount: number;
    guest_amount: number;
    donation: number;
    commission: number;
    plateform_fee: number;
  };
};

export type DashboardKpis = {
  total_events: number;
  active_events: number;
  total_companies: number | null;
  pending_companies: number | null;
  active_companies: number | null;
  inactive_companies: number | null;
  stripe_connected: number | null;
  total_guests: number;
  total_registrations: number;
  total_earnings: number;
  total_commission: number;
  cash_cleared: number;
  cash_pending: number;
  upcoming_events: DashboardUpcomingEvent[];
  recent_registrants: DashboardRecentRegistrant[];
};

export async function getDashboardKpis(): Promise<DashboardKpis> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke<DashboardKpis>("dashboard-kpis", {
    method: "GET",
  });
  if (error) throw new Error(error.message);
  return data as DashboardKpis;
}

export function approveCompany(input: {
  company_id: string;
  approve: boolean;
  rejected_reason?: string;
}) {
  return invoke<{ success: boolean }>("approve-company", input);
}

export function exportLeadsCsv(eventId: string) {
  return invoke<{ url: string; expires_in_seconds: number }>("export-leads-csv", {
    event_id: eventId,
  });
}

export type GuestPayment = {
  id: string;
  status: string;
  method: "card" | "cash";
  cleared_by: string | null;
  cleared_at: string | null;
};

export function markCashCleared(paymentId: string) {
  return invoke<{ payment: GuestPayment }>("mark-cash-cleared", { payment_id: paymentId });
}

export function notifyCashPending(registrationId: string) {
  return invoke<{ notified: boolean }>("notify-cash-pending", {
    registration_id: registrationId,
  });
}

export type PublishTemplateInput = {
  template_event_id: string;
  target_date: string;
  slug: string;
  geonameid?: string;
  latitude?: number;
  longitude?: number;
};

export function publishTemplateEvent(input: PublishTemplateInput) {
  return invoke<{ event_id: string }>("publish-template-event", input);
}

export type OtpPurpose =
  | "change_stripe_keys"
  | "change_commission_rate"
  | "change_password"
  | "change_email";

export function requestOtp(purpose: OtpPurpose) {
  return invoke<{ requested: boolean; expires_in_seconds: number }>("request-otp", { purpose });
}

export type VerifyOtpInput = {
  purpose: OtpPurpose;
  code: string;
  new_password?: string;
  new_email?: string;
  new_commission_pct?: number;
};

export function verifyOtp(input: VerifyOtpInput) {
  return invoke<{ verified: boolean; purpose: OtpPurpose }>("verify-otp", input);
}
