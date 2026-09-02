"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { listMasterTemplates, templatesCache } from "@/lib/queries/templates";
import { publishTemplateEvent } from "@/lib/edge-functions";

export function TemplatesClient() {
  const router = useRouter();
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [targetDate, setTargetDate] = useState("");
  const [slug, setSlug] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const { data: templates, isPending, error } = useQuery({
    queryKey: templatesCache.listKey,
    queryFn: listMasterTemplates,
  });

  const publishMutation = useMutation({
    mutationFn: publishTemplateEvent,
    onSuccess: (data) => router.push(`/events/${data.event_id}/edit`),
  });

  function handlePublish(templateId: string) {
    publishMutation.mutate({
      template_event_id: templateId,
      target_date: targetDate,
      slug,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Event Templates</h1>
      <p className="text-sm text-gray-500">
        Publish a company event from an admin-provided template, with sub-event times computed
        relative to sunset for your chosen date and location.
      </p>

      {isPending && <div className="h-24 animate-pulse rounded-lg bg-gray-100" />}
      {error && <p className="text-sm text-red-600">{error.message}</p>}

      {templates && templates.length === 0 && (
        <p className="text-sm text-gray-500">No templates are available yet.</p>
      )}

      {templates && templates.length > 0 && (
        <ul className="space-y-3">
          {templates.map((t) => (
            <li key={t.id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{t.title}</p>
                <button
                  onClick={() => setPublishingId(publishingId === t.id ? null : t.id)}
                  className="rounded-md border px-3 py-1.5 text-xs font-medium"
                >
                  {publishingId === t.id ? "Cancel" : "Publish"}
                </button>
              </div>

              {publishingId === t.id && (
                <div className="mt-3 space-y-2">
                  <input
                    required
                    placeholder="URL slug for the new event"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />
                  <input
                    required
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      required
                      type="number"
                      step="any"
                      placeholder="Latitude"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      className="rounded-md border px-3 py-2 text-sm"
                    />
                    <input
                      required
                      type="number"
                      step="any"
                      placeholder="Longitude"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      className="rounded-md border px-3 py-2 text-sm"
                    />
                  </div>
                  {publishMutation.error && (
                    <p className="text-xs text-red-600">
                      {(publishMutation.error as Error).message}
                    </p>
                  )}
                  <button
                    onClick={() => handlePublish(t.id)}
                    disabled={publishMutation.isPending}
                    className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {publishMutation.isPending ? "Publishing..." : "Confirm Publish"}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
