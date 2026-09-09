"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { getMyProfile, profileCache } from "@/lib/queries/profile";
import {
  eventsCache,
  getEventWithChildren,
  getSoldQuantitiesByProduct,
  type EventWithChildren,
} from "@/lib/queries/events";
import { templatesCache } from "@/lib/queries/templates";
import { SubEventActivitiesManager } from "./sub-event-activities-manager";
import { CitySearchInput } from "@/components/city-search-input";
import {
  createEvent,
  updateEvent,
  type EventAdvanceSettings,
  type SubEventInput,
} from "@/lib/edge-functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FormProduct = {
  id?: string;
  name: string;
  price: string;
  capacity: string;
  color: string;
};

// Tri-state: "inherit" means "don't send an override, use the company/
// platform default" (matches the old EventMeta-falls-back-to-EventAdvance
// cascade); "on"/"off" pins an explicit per-event override.
type TriState = "inherit" | "on" | "off";

type FormAdvance = Record<keyof EventAdvanceSettings, TriState>;

const ADVANCE_FIELDS: { key: keyof EventAdvanceSettings; label: string }[] = [
  { key: "is_attendees_required", label: "Require attendee contact details" },
  { key: "is_show_address", label: "Ask for guest address" },
  { key: "is_cash_allowed", label: "Allow cash payment" },
  { key: "is_donation_allowed", label: "Allow donations" },
  { key: "is_show_regulation", label: "Show terms & regulations" },
  { key: "is_show_stripe", label: "Allow card payment (Stripe)" },
  { key: "is_show_app_fee", label: "Show platform fee to guests" },
  { key: "is_enable_donation", label: "Enable donation field on this event" },
];

function emptyAdvance(): FormAdvance {
  return {
    is_attendees_required: "inherit",
    is_show_address: "inherit",
    is_cash_allowed: "inherit",
    is_donation_allowed: "inherit",
    is_show_regulation: "inherit",
    is_show_stripe: "inherit",
    is_show_app_fee: "inherit",
    is_enable_donation: "inherit",
  };
}

function advanceFromExisting(event: {
  override_is_attendees_required: boolean | null;
  override_is_show_address: boolean | null;
  override_is_cash_allowed: boolean | null;
  override_is_donation_allowed: boolean | null;
  override_is_show_regulation: boolean | null;
  override_is_show_stripe: boolean | null;
  override_is_show_app_fee: boolean | null;
  override_is_enable_donation: boolean | null;
}): FormAdvance {
  const toTri = (v: boolean | null): TriState => (v === null ? "inherit" : v ? "on" : "off");
  return {
    is_attendees_required: toTri(event.override_is_attendees_required),
    is_show_address: toTri(event.override_is_show_address),
    is_cash_allowed: toTri(event.override_is_cash_allowed),
    is_donation_allowed: toTri(event.override_is_donation_allowed),
    is_show_regulation: toTri(event.override_is_show_regulation),
    is_show_stripe: toTri(event.override_is_show_stripe),
    is_show_app_fee: toTri(event.override_is_show_app_fee),
    is_enable_donation: toTri(event.override_is_enable_donation),
  };
}

function advanceToPayload(advance: FormAdvance): EventAdvanceSettings {
  const out: EventAdvanceSettings = {};
  for (const { key } of ADVANCE_FIELDS) {
    out[key] = advance[key] === "inherit" ? null : advance[key] === "on";
  }
  return out;
}

type FormSubEvent = {
  id?: string;
  title: string;
  location: string;
  start_at: string;
  capacity: string;
  is_active: boolean;
  products: FormProduct[];
};

type FormState = {
  title: string;
  slug: string;
  description: string;
  start_date: string;
  end_date: string;
  sub_events: FormSubEvent[];
  advance: FormAdvance;
  geonameid: string;
};

function emptyProduct(): FormProduct {
  return { name: "", price: "", capacity: "", color: "" };
}

function emptySubEvent(): FormSubEvent {
  return {
    title: "",
    location: "",
    start_at: "",
    capacity: "",
    is_active: true,
    products: [emptyProduct()],
  };
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
      is_active: se.is_active,
      products: se.products.map((p) => ({
        id: p.id,
        name: p.name,
        price: String(p.price),
        capacity: p.capacity != null ? String(p.capacity) : "",
        color: p.color ?? "",
      })),
    })),
    advance: advanceFromExisting(event),
    geonameid: event.geonameid ?? "",
  };
}

function toSubEventsPayload(subEvents: FormSubEvent[]): SubEventInput[] {
  return subEvents.map((se, seIndex) => ({
    id: se.id,
    title: se.title,
    location: se.location || null,
    start_at: new Date(se.start_at).toISOString(),
    capacity: se.capacity ? Number(se.capacity) : null,
    is_active: se.is_active,
    sort_order: seIndex,
    products: se.products.map((p, pIndex) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      capacity: p.capacity ? Number(p.capacity) : null,
      color: p.color || null,
      sort_order: pIndex,
    })),
  }));
}

export function EventFormClient({
  mode,
  eventId,
  isTemplate = false,
}: {
  mode: "create" | "edit";
  eventId?: string;
  /** Admin-only master-template mode: no company_id, is_master_template = true. */
  isTemplate?: boolean;
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

  const existingProductIds = (existingEvent?.sub_events ?? []).flatMap((se) =>
    se.products.map((p) => p.id)
  );

  // Gap-audit item: old EventController::getEventDetail computed
  // remaining_seats per sub-event against its capacity; the edit form
  // could change capacity but never showed how many tickets were already
  // sold against it.
  const { data: soldByProduct } = useQuery({
    queryKey: ["events", "sold-quantities", eventId],
    queryFn: () => getSoldQuantitiesByProduct(existingProductIds),
    enabled: mode === "edit" && existingProductIds.length > 0,
  });

  const [form, setForm] = useState<FormState>(() =>
    existingEvent ? fromExisting(existingEvent) : {
      title: "",
      slug: "",
      description: "",
      start_date: "",
      end_date: "",
      sub_events: [emptySubEvent()],
      advance: emptyAdvance(),
      geonameid: "",
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

      const advance = advanceToPayload(form.advance);

      if (mode === "create") {
        if (!isTemplate && !companyId) throw new Error("No company found for this account.");
        return createEvent({
          company_id: isTemplate ? null : companyId,
          title: form.title,
          slug: form.slug,
          description: form.description || null,
          start_date: new Date(form.start_date).toISOString(),
          end_date: new Date(form.end_date).toISOString(),
          sub_events,
          advance,
          is_master_template: isTemplate,
          geonameid: form.geonameid || null,
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
        advance,
        geonameid: form.geonameid || null,
      });
    },
    onSuccess: async (data) => {
      if (isTemplate) {
        await queryClient.invalidateQueries({ queryKey: templatesCache.listKey });
        router.push(`/templates/${data.event_id}/edit`);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: eventsCache.listKey(companyId) });
      if (mode === "edit" && eventId) {
        await queryClient.invalidateQueries({ queryKey: eventsCache.detailKey(eventId) });
      }
      router.push(`/events/${data.event_id}/edit`);
    },
  });

  if (mode === "edit" && eventPending) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }

  function updateSubEvent(index: number, patch: Partial<FormSubEvent>) {
    setForm((f) => ({
      ...f,
      sub_events: f.sub_events.map((se, i) => (i === index ? { ...se, ...patch } : se)),
    }));
  }

  function updateAdvance(key: keyof EventAdvanceSettings, value: TriState) {
    setForm((f) => ({ ...f, advance: { ...f.advance, [key]: value } }));
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
      className="max-w-2xl space-y-6"
    >
      <h1 className="text-2xl font-semibold tracking-tight">
        {isTemplate
          ? mode === "create"
            ? "New Template"
            : "Edit Template"
          : mode === "create"
            ? "New Event"
            : "Edit Event"}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Event details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ev-title">Title</Label>
            <Input
              id="ev-title"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-slug">Slug</Label>
            <Input
              id="ev-slug"
              required
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-desc">Description</Label>
            <Textarea
              id="ev-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Location</Label>
            <p className="text-xs text-muted-foreground">
              Needed for sunset/candle-lighting-based sub-events and activities
            </p>
            <CitySearchInput
              geonameid={form.geonameid}
              onChange={(geonameid) => setForm({ ...form, geonameid })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ev-start">Start</Label>
              <Input
                id="ev-start"
                required
                type="datetime-local"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-end">End</Label>
              <Input
                id="ev-end"
                required
                type="datetime-local"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Sub-events</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setForm((f) => ({ ...f, sub_events: [...f.sub_events, emptySubEvent()] }))
            }
          >
            <Plus />
            Add sub-event
          </Button>
        </div>

        {form.sub_events.map((se, seIndex) => (
          <Card key={seIndex}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Sub-event {seIndex + 1}</CardTitle>
              <div className="flex items-center gap-3">
                <Label htmlFor={`se-active-${seIndex}`} className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                  <Switch
                    id={`se-active-${seIndex}`}
                    checked={se.is_active}
                    onCheckedChange={(checked) => updateSubEvent(seIndex, { is_active: checked })}
                  />
                  Visible to guests
                </Label>
                {form.sub_events.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        sub_events: f.sub_events.filter((_, i) => i !== seIndex),
                      }))
                    }
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                required
                placeholder="Title"
                value={se.title}
                onChange={(e) => updateSubEvent(seIndex, { title: e.target.value })}
              />
              <div className="grid grid-cols-3 gap-3">
                <Input
                  placeholder="Location"
                  value={se.location}
                  onChange={(e) => updateSubEvent(seIndex, { location: e.target.value })}
                />
                <Input
                  required
                  type="datetime-local"
                  value={se.start_at}
                  onChange={(e) => updateSubEvent(seIndex, { start_at: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Capacity"
                  value={se.capacity}
                  onChange={(e) => updateSubEvent(seIndex, { capacity: e.target.value })}
                />
              </div>

              <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Ticket types</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      updateSubEvent(seIndex, { products: [...se.products, emptyProduct()] })
                    }
                  >
                    <Plus className="size-3.5" />
                    Add ticket type
                  </Button>
                </div>
                {se.products.map((p, pIndex) => {
                  const sold = p.id ? soldByProduct?.[p.id] : undefined;
                  return (
                    <div key={pIndex} className="space-y-1">
                      <div className="grid grid-cols-12 gap-2">
                        <Input
                          required
                          placeholder="Name"
                          value={p.name}
                          onChange={(e) => updateProduct(seIndex, pIndex, { name: e.target.value })}
                          className="col-span-5"
                        />
                        <Input
                          required
                          type="number"
                          step="0.01"
                          placeholder="Price"
                          value={p.price}
                          onChange={(e) => updateProduct(seIndex, pIndex, { price: e.target.value })}
                          className="col-span-3"
                        />
                        <Input
                          type="number"
                          placeholder="Capacity"
                          value={p.capacity}
                          onChange={(e) =>
                            updateProduct(seIndex, pIndex, { capacity: e.target.value })
                          }
                          className="col-span-3"
                        />
                        <input
                          type="color"
                          title="Ticket color"
                          value={p.color || "#e5e7eb"}
                          onChange={(e) => updateProduct(seIndex, pIndex, { color: e.target.value })}
                          className="col-span-1 h-9 w-full cursor-pointer rounded-md border"
                        />
                      </div>
                      {sold != null && sold > 0 && (
                        <div className="flex items-center gap-1.5 pl-1">
                          <Badge variant="secondary" className="text-[11px]">
                            {sold} sold
                          </Badge>
                          {p.capacity && (
                            <span className="text-xs text-muted-foreground">
                              {Math.max(Number(p.capacity) - sold, 0)} remaining
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {se.id && <SubEventActivitiesManager subEventId={se.id} />}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Advance settings</h2>
          <p className="text-sm text-muted-foreground">
            Leave a setting on &quot;Default&quot; to inherit your company/platform default; pick
            Yes/No to override it just for this event.
          </p>
        </div>
        <Card>
          <CardContent className="space-y-1">
            {ADVANCE_FIELDS.map(({ key, label }, i) => (
              <div key={key}>
                <div className="flex items-center justify-between gap-4 py-2">
                  <span className="text-sm">{label}</span>
                  <Select
                    value={form.advance[key]}
                    onValueChange={(value) => updateAdvance(key, value as TriState)}
                  >
                    <SelectTrigger size="sm" className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inherit">Default</SelectItem>
                      <SelectItem value="on">Yes</SelectItem>
                      <SelectItem value="off">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {i < ADVANCE_FIELDS.length - 1 && <div className="border-b" />}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {mutation.error && (
        <Alert variant="destructive">
          <AlertDescription>{(mutation.error as Error).message}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Saving..." : mode === "create" ? "Create Event" : "Save Changes"}
      </Button>
    </form>
  );
}
