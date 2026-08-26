"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyProfile, profileCache } from "@/lib/queries/profile";
import {
  eventsCache,
  getEventWithChildren,
  type EventWithChildren,
} from "@/lib/queries/events";
import { createEvent, updateEvent, type SubEventInput } from "@/lib/edge-functions";

type FormProduct = {
  id?: string;
  name: string;
  price: string;
  capacity: string;
};

type FormSubEvent = {
  id?: string;
  title: string;
  location: string;
  start_at: string;
  capacity: string;
  products: FormProduct[];
};

type FormState = {
  title: string;
  slug: string;
  description: string;
  start_date: string;
  end_date: string;
  sub_events: FormSubEvent[];
};

function emptyProduct(): FormProduct {
  return { name: "", price: "", capacity: "" };
}

function emptySubEvent(): FormSubEvent {
  return { title: "", location: "", start_at: "", capacity: "", products: [emptyProduct()] };
}

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function fromExisting(event: EventWithChildren): FormState {
  return {
    title: event.title,
    slug: event.slug,
    description: event.description ?? "",
    start_date: toDatetimeLocal(event.start_date),
    end_date: toDatetimeLocal(event.end_date),
    sub_events: event.sub_events.map((se) => ({
      id: se.id,
      title: se.title,
      location: se.location ?? "",
      start_at: toDatetimeLocal(se.start_at),
      capacity: se.capacity != null ? String(se.capacity) : "",
      products: se.products.map((p) => ({
        id: p.id,
        name: p.name,
        price: String(p.price),
        capacity: p.capacity != null ? String(p.capacity) : "",
      })),
    })),
  };
}

function toSubEventsPayload(subEvents: FormSubEvent[]): SubEventInput[] {
  return subEvents.map((se, seIndex) => ({
    id: se.id,
    title: se.title,
    location: se.location || null,
    start_at: new Date(se.start_at).toISOString(),
    capacity: se.capacity ? Number(se.capacity) : null,
    sort_order: seIndex,
    products: se.products.map((p, pIndex) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      capacity: p.capacity ? Number(p.capacity) : null,
      sort_order: pIndex,
    })),
  }));
}

export function EventFormClient({
  mode,
  eventId,
}: {
  mode: "create" | "edit";
  eventId?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: profileCache.meKey,
    queryFn: getMyProfile,
  });
  const companyId = profile?.companies?.id ?? null;

  const { data: existingEvent, isPending: eventPending } = useQuery({
    queryKey: mode === "edit" && eventId ? eventsCache.detailKey(eventId) : ["events", "new"],
    queryFn: () => getEventWithChildren(eventId!),
    enabled: mode === "edit" && !!eventId,
  });

  const [form, setForm] = useState<FormState>(() =>
    existingEvent ? fromExisting(existingEvent) : {
      title: "",
      slug: "",
      description: "",
      start_date: "",
      end_date: "",
      sub_events: [emptySubEvent()],
    }
  );
  const [hydrated, setHydrated] = useState(mode === "create");

  if (!hydrated && existingEvent) {
    setForm(fromExisting(existingEvent));
    setHydrated(true);
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const sub_events = toSubEventsPayload(form.sub_events);

      if (mode === "create") {
        if (!companyId) throw new Error("No company found for this account.");
        return createEvent({
          company_id: companyId,
          title: form.title,
          slug: form.slug,
          description: form.description || null,
          start_date: new Date(form.start_date).toISOString(),
          end_date: new Date(form.end_date).toISOString(),
          sub_events,
        });
      }

      return updateEvent({
        event_id: eventId!,
        title: form.title,
        slug: form.slug,
        description: form.description || null,
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date).toISOString(),
        sub_events,
      });
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: eventsCache.listKey(companyId) });
      if (mode === "edit" && eventId) {
        await queryClient.invalidateQueries({ queryKey: eventsCache.detailKey(eventId) });
      }
      router.push(`/events/${data.event_id}/edit`);
    },
  });

  if (mode === "edit" && eventPending) {
    return <div className="h-64 animate-pulse rounded-lg bg-gray-100" />;
  }

  function updateSubEvent(index: number, patch: Partial<FormSubEvent>) {
    setForm((f) => ({
      ...f,
      sub_events: f.sub_events.map((se, i) => (i === index ? { ...se, ...patch } : se)),
    }));
  }

  function updateProduct(seIndex: number, pIndex: number, patch: Partial<FormProduct>) {
    setForm((f) => ({
      ...f,
      sub_events: f.sub_events.map((se, i) =>
        i === seIndex
          ? {
              ...se,
              products: se.products.map((p, j) => (j === pIndex ? { ...p, ...patch } : p)),
            }
          : se
      ),
    }));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="max-w-2xl space-y-8"
    >
      <h1 className="text-2xl font-semibold">
        {mode === "create" ? "New Event" : "Edit Event"}
      </h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Title</label>
          <input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="mt-1 w-full rounded-md border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Slug</label>
          <input
            required
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            className="mt-1 w-full rounded-md border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="mt-1 w-full rounded-md border px-3 py-2"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Start</label>
            <input
              required
              type="datetime-local"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className="mt-1 w-full rounded-md border px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">End</label>
            <input
              required
              type="datetime-local"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              className="mt-1 w-full rounded-md border px-3 py-2"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Sub-events</h2>
          <button
            type="button"
            onClick={() =>
              setForm((f) => ({ ...f, sub_events: [...f.sub_events, emptySubEvent()] }))
            }
            className="text-sm text-blue-600"
          >
            + Add sub-event
          </button>
        </div>

        {form.sub_events.map((se, seIndex) => (
          <div key={seIndex} className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Sub-event {seIndex + 1}</span>
              {form.sub_events.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      sub_events: f.sub_events.filter((_, i) => i !== seIndex),
                    }))
                  }
                  className="text-xs text-red-600"
                >
                  Remove
                </button>
              )}
            </div>
            <input
              required
              placeholder="Title"
              value={se.title}
              onChange={(e) => updateSubEvent(seIndex, { title: e.target.value })}
              className="w-full rounded-md border px-3 py-2"
            />
            <div className="grid grid-cols-3 gap-3">
              <input
                placeholder="Location"
                value={se.location}
                onChange={(e) => updateSubEvent(seIndex, { location: e.target.value })}
                className="rounded-md border px-3 py-2"
              />
              <input
                required
                type="datetime-local"
                value={se.start_at}
                onChange={(e) => updateSubEvent(seIndex, { start_at: e.target.value })}
                className="rounded-md border px-3 py-2"
              />
              <input
                type="number"
                placeholder="Capacity"
                value={se.capacity}
                onChange={(e) => updateSubEvent(seIndex, { capacity: e.target.value })}
                className="rounded-md border px-3 py-2"
              />
            </div>

            <div className="space-y-2 pl-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Ticket types</span>
                <button
                  type="button"
                  onClick={() =>
                    updateSubEvent(seIndex, { products: [...se.products, emptyProduct()] })
                  }
                  className="text-xs text-blue-600"
                >
                  + Add ticket type
                </button>
              </div>
              {se.products.map((p, pIndex) => (
                <div key={pIndex} className="grid grid-cols-4 gap-2">
                  <input
                    required
                    placeholder="Name"
                    value={p.name}
                    onChange={(e) => updateProduct(seIndex, pIndex, { name: e.target.value })}
                    className="col-span-2 rounded-md border px-2 py-1.5 text-sm"
                  />
                  <input
                    required
                    type="number"
                    step="0.01"
                    placeholder="Price"
                    value={p.price}
                    onChange={(e) => updateProduct(seIndex, pIndex, { price: e.target.value })}
                    className="rounded-md border px-2 py-1.5 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Capacity"
                    value={p.capacity}
                    onChange={(e) =>
                      updateProduct(seIndex, pIndex, { capacity: e.target.value })
                    }
                    className="rounded-md border px-2 py-1.5 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {mutation.error && (
        <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>
      )}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {mutation.isPending ? "Saving..." : mode === "create" ? "Create Event" : "Save Changes"}
      </button>
    </form>
  );
}
