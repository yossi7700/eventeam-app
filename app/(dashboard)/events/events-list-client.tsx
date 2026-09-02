"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getMyProfile, profileCache } from "@/lib/queries/profile";
import { eventsCache, listEvents } from "@/lib/queries/events";

function EventsSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
      ))}
    </div>
  );
}

export function EventsListClient() {
  const { data: profile, isPending: profilePending } = useQuery({
    queryKey: profileCache.meKey,
    queryFn: getMyProfile,
  });

  const companyId = profile?.companies?.id ?? null;

  const {
    data: events,
    isPending: eventsPending,
    error,
  } = useQuery({
    queryKey: eventsCache.listKey(companyId),
    queryFn: () => listEvents(companyId!),
    enabled: !!companyId,
  });

  const isLoading = profilePending || (!!companyId && eventsPending);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Events</h1>
        <Link
          href="/events/new"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
        >
          New Event
        </Link>
      </div>

      {isLoading && <EventsSkeleton />}

      {error && (
        <p className="text-sm text-red-600">Failed to load events: {error.message}</p>
      )}

      {!isLoading && events && events.length === 0 && (
        <p className="text-sm text-gray-500">
          No events yet. Create your first event to get started.
        </p>
      )}

      {events && events.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {events.map((event) => (
            <li key={event.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
              <Link href={`/events/${event.id}/edit`} className="flex-1">
                <p className="font-medium">{event.title}</p>
                <p className="text-sm text-gray-500">
                  {new Date(event.start_date).toLocaleDateString()} -{" "}
                  {new Date(event.end_date).toLocaleDateString()}
                </p>
              </Link>
              <div className="flex items-center gap-3">
                <Link href={`/events/${event.id}/donations`} className="text-sm text-blue-600">
                  Donations
                </Link>
                <Link href={`/events/${event.id}/leads`} className="text-sm text-blue-600">
                  Leads
                </Link>
                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium capitalize text-gray-700">
                  {event.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
