import { createClient } from "@/lib/supabase/client";

export type ProductInput = {
  id?: string;
  name: string;
  description?: string | null;
  price: number;
  currency?: string;
  capacity?: number | null;
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
  sort_order?: number;
  products?: ProductInput[];
};

export type CreateEventInput = {
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
