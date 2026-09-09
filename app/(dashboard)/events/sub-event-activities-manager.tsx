"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activitiesCache,
  createActivity,
  deleteActivity,
  listActivities,
  updateActivity,
  type SubEventActivity,
} from "@/lib/queries/activities";
import type { Enums } from "@/types/supabase";

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
    <div className="space-y-2 rounded-md border border-dashed p-3">
      <p className="text-xs font-medium text-gray-500">Activities (agenda items)</p>

      {isPending && <div className="h-10 animate-pulse rounded bg-gray-100" />}

      {activities && activities.length > 0 && (
        <ul className="space-y-1">
          {activities.map((a: SubEventActivity) => (
            <li key={a.id} className="flex items-center justify-between rounded border px-2 py-1 text-xs">
              <span>
                {a.title} &middot; {ACTIVITY_TYPE_LABELS[a.activity_type]}{" "}
                {a.activity_type === "fixed_time" ? a.fixed_time : `(${a.time_minutes}m)`}
              </span>
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleShowMutation.mutate({ id: a.id, is_show: !a.is_show })}
                  className="text-gray-500 hover:text-black"
                >
                  {a.is_show ? "Hide" : "Show"}
                </button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(a.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
        <input
          required
          placeholder="Title (e.g. Kiddush)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 rounded-md border px-2 py-1 text-xs"
        />
        <select
          value={activityType}
          onChange={(e) => setActivityType(e.target.value as ActivityType)}
          className="rounded-md border px-2 py-1 text-xs"
        >
          {(Object.keys(ACTIVITY_TYPE_LABELS) as ActivityType[]).map((t) => (
            <option key={t} value={t}>
              {ACTIVITY_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        {activityType === "fixed_time" ? (
          <input
            required
            type="time"
            value={fixedTime}
            onChange={(e) => setFixedTime(e.target.value)}
            className="rounded-md border px-2 py-1 text-xs"
          />
        ) : (
          <input
            required
            type="number"
            min={0}
            placeholder="Minutes"
            value={timeMinutes}
            onChange={(e) => setTimeMinutes(e.target.value)}
            className="w-24 rounded-md border px-2 py-1 text-xs"
          />
        )}
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded-md bg-black px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          Add
        </button>
      </form>
      {createMutation.error && (
        <p className="text-xs text-red-600">{(createMutation.error as Error).message}</p>
      )}
    </div>
  );
}
