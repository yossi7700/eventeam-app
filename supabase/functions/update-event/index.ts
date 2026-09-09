import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createUserClient, errorResponse, jsonResponse } from "../_shared/supabase.ts";
import { handleCors } from "../_shared/cors.ts";

type ProductInput = {
  id?: string;
  name: string;
  description?: string | null;
  price: number;
  currency?: string;
  capacity?: number | null;
  sort_order?: number;
};

type SubEventInput = {
  id?: string;
  title: string;
  description?: string | null;
  location?: string | null;
  start_at: string;
  end_at?: string | null;
  capacity?: number | null;
  is_sunset_relative?: boolean;
  is_active?: boolean;
  sunset_offset_minutes?: number | null;
  sort_order?: number;
  products?: ProductInput[];
};

type EventAdvanceSettings = {
  is_attendees_required?: boolean | null;
  is_show_address?: boolean | null;
  is_cash_allowed?: boolean | null;
  is_donation_allowed?: boolean | null;
  is_show_regulation?: boolean | null;
  is_show_stripe?: boolean | null;
  is_show_app_fee?: boolean | null;
  is_enable_donation?: boolean | null;
};

type UpdateEventInput = {
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
  geonameid?: string | null;
};

Deno.serve(async (req: Request) => {
  const { preflight, headers: corsHeaders } = handleCors(req);
  if (preflight) return preflight;

  if (req.method !== "POST" && req.method !== "PUT") {
    return errorResponse("method not allowed", 405, corsHeaders);
  }

  let body: UpdateEventInput;
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid JSON body", 400, corsHeaders);
  }

  if (!body.event_id || !body.title || !body.slug || !body.start_date || !body.end_date) {
    return errorResponse(
      "event_id, title, slug, start_date, and end_date are required",
      422,
      corsHeaders
    );
  }

  const supabase = createUserClient(req);

  const { error } = await supabase.rpc("update_event_with_children", {
    p_event_id: body.event_id,
    p_title: body.title,
    p_slug: body.slug,
    p_description: body.description ?? null,
    p_cover_image_path: body.cover_image_path ?? null,
    p_start_date: body.start_date,
    p_end_date: body.end_date,
    p_timezone: body.timezone ?? null,
    p_sub_events: body.sub_events ?? [],
    p_advance: body.advance ?? null,
    p_geonameid: body.geonameid ?? null,
  });

  if (error) {
    const status = error.code === "42501" ? 403 : error.code === "P0002" ? 404 : 400;
    return errorResponse(error.message, status, corsHeaders);
  }

  return jsonResponse({ event_id: body.event_id }, 200, corsHeaders);
});
