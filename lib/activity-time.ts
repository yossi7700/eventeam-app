import type { PublicSubEventActivity } from "@/lib/queries/public-booking";

// Mirrors the old system's helper.php::showActivity(): resolves each
// activity's displayed time against that day's candle-lighting/sunset
// time, per its activity_type. sunsetTime/candleLightingTime should come
// from the same sunset-times Edge Function call already used for
// publishing sunset-relative sub-events -- pass null for either if
// unavailable (e.g. no location context on this page) and any activity
// needing that anchor renders a placeholder instead of a wrong time.
export function resolveActivityTime(
  activity: PublicSubEventActivity,
  sunsetTime: Date | null,
  candleLightingTime: Date | null
): string | null {
  if (activity.activity_type === "fixed_time") {
    return activity.fixed_time;
  }

  const minutes = activity.time_minutes ?? 0;
  const format = (d: Date) =>
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });

  switch (activity.activity_type) {
    case "before_sunset":
      return sunsetTime ? format(new Date(sunsetTime.getTime() - minutes * 60_000)) : null;
    case "after_sunset":
      return sunsetTime ? format(new Date(sunsetTime.getTime() + minutes * 60_000)) : null;
    case "before_candle":
      return candleLightingTime
        ? format(new Date(candleLightingTime.getTime() - minutes * 60_000))
        : null;
    case "after_candle":
      return candleLightingTime
        ? format(new Date(candleLightingTime.getTime() + minutes * 60_000))
        : null;
    default:
      return null;
  }
}
