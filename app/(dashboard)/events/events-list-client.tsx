"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Heart, Plus, Users } from "lucide-react";
import { getMyProfile, profileCache } from "@/lib/queries/profile";
import { eventsCache, listEvents, setEventStatus } from "@/lib/queries/events";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const statusVariants: Record<string, "outline" | "default" | "secondary" | "destructive"> = {
  draft: "outline",
  active: "default",
  ended: "secondary",
  cancelled: "destructive",
};

function EventsSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CalendarDays className="size-6" />
        </span>
        <div>
          <p className="font-medium">No events yet</p>
          <p className="text-sm text-muted-foreground">
            Create your first event to start accepting registrations.
          </p>
        </div>
        <Button render={<Link href="/events/new" />} size="sm" className="mt-1">
          <Plus />
          New event
        </Button>
      </CardContent>
    </Card>
  );
}

export function EventsListClient() {
  const { data: profile, isPending: profilePending } = useQuery({
    queryKey: profileCache.meKey,
    queryFn: getMyProfile,
  });

  const companyId = profile?.companies?.id ?? null;
  const queryClient = useQueryClient();

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

  const toggleStatusMutation = useMutation({
    mutationFn: ({ eventId, status }: { eventId: string; status: "draft" | "active" }) =>
      setEventStatus(eventId, status),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: eventsCache.listKey(companyId) }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
          <p className="text-sm text-muted-foreground">
            Manage your events, publish drafts, and track registrations.
          </p>
        </div>
        <Button render={<Link href="/events/new" />}>
          <Plus />
          New event
        </Button>
      </div>

      {isLoading && <EventsSkeleton />}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load events</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {!isLoading && events && events.length === 0 && <EmptyState />}

      {events && events.length > 0 && (
        <div className="grid gap-3">
          {events.map((event) => (
            <Card key={event.id} className="transition-shadow hover:shadow-md py-0">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <Link href={`/events/${event.id}/edit`} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{event.title}</p>
                    <Badge variant={statusVariants[event.status] ?? "outline"} className="capitalize">
                      {event.status}
                    </Badge>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <CalendarDays className="size-3.5" />
                    {new Date(event.start_date).toLocaleDateString()} –{" "}
                    {new Date(event.end_date).toLocaleDateString()}
                  </p>
                </Link>
                <div className="flex items-center gap-2">
                  <Button render={<Link href={`/events/${event.id}/donations`} />} variant="ghost" size="sm">
                    <Heart className="size-3.5" />
                    Donations
                  </Button>
                  <Button render={<Link href={`/events/${event.id}/leads`} />} variant="ghost" size="sm">
                    <Users className="size-3.5" />
                    Leads
                  </Button>
                  {(event.status === "draft" || event.status === "active") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toggleStatusMutation.mutate({
                          eventId: event.id,
                          status: event.status === "active" ? "draft" : "active",
                        })
                      }
                      disabled={toggleStatusMutation.isPending}
                    >
                      {event.status === "active" ? "Unpublish" : "Publish"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
