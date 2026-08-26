import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createUserClient, errorResponse, jsonResponse } from "../_shared/supabase.ts";

type ProductInput = {
  name: string;
  description?: string | null;
  price: number;
  currency?: string;
  capacity?: number | null;
  sort_order?: number;
};

type SubEventInput = {
  title: string;
  description?: string | null;
  location?: string | null;
  start_at: string;
  end_at?: string | null;
  capacity?: number | null;
  is_sunset_relative?: boolean;
  sunset_offset_minutes?: number | null;
  sort_order?: number;
  products?: ProductInput[];
};

type CreateEventInput = {
  company_id: string;
  title: string;
  slug: string;
  description?: string | null;
  cover_image_path?: string | null;
  start_date: string;
  end_date: string;
  timezone?: string;
  sub_events?: SubEventInput[];
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return errorResponse("method not allowed", 405);
  }

  let body: CreateEventInput;
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid JSON body", 400);
  }

  if (!body.company_id || !body.title || !body.slug || !body.start_date || !body.end_date) {
    return errorResponse(
      "company_id, title, slug, start_date, and end_date are required",
      422
    );
  }

  const supabase = createUserClient(req);

  const { data, error } = await supabase.rpc("create_event_with_children", {
    p_company_id: body.company_id,
    p_title: body.title,
    p_slug: body.slug,
    p_description: body.description ?? null,
    p_cover_image_path: body.cover_image_path ?? null,
    p_start_date: body.start_date,
    p_end_date: body.end_date,
    p_timezone: body.timezone ?? null,
    p_sub_events: body.sub_events ?? [],
  });

  if (error) {
    const status = error.code === "42501" ? 403 : 400;
    return errorResponse(error.message, status);
  }

  return jsonResponse({ event_id: data }, 201);
});
