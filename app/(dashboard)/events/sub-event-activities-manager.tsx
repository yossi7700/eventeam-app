"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import {
  activitiesCache,
  createActivity,
  deleteActivity,
  listActivities,
  updateActivity,
  type SubEventActivity,
} from "@/lib/queries/activities";
import type { Enums } from "@/types/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ActivityType = Enums<"sub_event_activity_type">;

const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  fixed_time: "Fixed time",
  before_sunset: "Minutes before sunset",
  after_sunset: "Minutes after sunset",
  before_candle: "Minutes before candle-lighting",
  after_candle: "Minutes after candle-lighting",
};

// Gap-audit port of the old system's SubEventActivity: a named schedule
// item within a sub-event (e.g. "Kiddush", "Drasha"), shown/hidden via
// is_show, with its display time computed one of 5 ways (see
// lib/activity-time.ts for the actual resolution logic used on the public
// page -- this form only collects the raw values).
export function SubEventActivitiesManager({ subEventId }: { subEventId: string }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [activityType, setActivityType] = useState<ActivityType>("fixed_time");
  const [fixedTime, setFixedTime] = useState("");
  const [timeMinutes, setTimeMinutes] = useState("");

  const { data: activities, isPending } = useQuery({
    queryKey: activitiesCache.listKey(subEventId),
    queryFn: () => listActivities(subEventId),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: activitiesCache.listKey(subEventId) });

  const createMutation = useMutation({
    mutationFn: createActivity,
    onSuccess: () => {
      invalidate();
      setTitle("");
      setFixedTime("");
      setTimeMinutes("");
    },
  });

  const toggleShowMutation = useMutation({
    mutationFn: ({ id, is_show }: { id: string; is_show: boolean }) =>
      updateActivity(id, { is_show }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteActivity,
    onSuccess: invalidate,
  });

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      sub_event_id: subEventId,
      title,
      activity_type: activityType,
      fixed_time: activityType === "fixed_time" ? fixedTime : null,
      time_minutes: activityType === "fixed_time" ? null : Number(timeMinutes),
      sort_order: activities?.length ?? 0,
    });
  }

  return (
    <div className="space-y-2 rounded-lg border border-dashed p-3">
      <p className="text-xs font-medium text-muted-foreground">Activities (agenda items)</p>

      {isPending && <Skeleton className="h-9 w-full" />}

      {activities && activities.length > 0 && (
        <ul className="space-y-1">
          {activities.map((a: SubEventActivity) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-md border bg-background px-2 py-1.5 text-xs"
            >
              <span className="flex items-center gap-1.5">
                {a.title}
                <Badge variant="outline" className="text-[10px] font-normal">
                  {ACTIVITY_TYPE_LABELS[a.activity_type]}{" "}
                  {a.activity_type === "fixed_time" ? a.fixed_time : `${a.time_minutes}m`}
                </Badge>
              </span>
              <span className="flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => toggleShowMutation.mutate({ id: a.id, is_show: !a.is_show })}
                  title={a.is_show ? "Hide" : "Show"}
                >
                  {a.is_show ? <Eye /> : <EyeOff />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteMutation.mutate(a.id)}
                  title="Delete"
                >
                  <Trash2 />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-2">
        <Input
          required
          placeholder="Title (e.g. Kiddush)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-8 flex-1 text-xs"
        />
        <Select value={activityType} onValueChange={(v) => setActivityType(v as ActivityType)}>
          <SelectTrigger size="sm" className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(ACTIVITY_TYPE_LABELS) as ActivityType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {ACTIVITY_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {activityType === "fixed_time" ? (
          <Input
            required
            type="time"
            value={fixedTime}
            onChange={(e) => setFixedTime(e.target.value)}
            className="h-8 w-28 text-xs"
          />
        ) : (
          <Input
            required
            type="number"
            min={0}
            placeholder="Minutes"
            value={timeMinutes}
            onChange={(e) => setTimeMinutes(e.target.value)}
            className="h-8 w-24 text-xs"
          />
        )}
        <Button type="submit" size="sm" disabled={createMutation.isPending}>
          <Plus className="size-3.5" />
          Add
        </Button>
      </form>
      {createMutation.error && (
        <p className="text-xs text-destructive">{(createMutation.error as Error).message}</p>
      )}
    </div>
  );
}
