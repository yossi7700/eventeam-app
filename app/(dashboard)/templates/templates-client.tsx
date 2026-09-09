"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { listMasterTemplates, templatesCache } from "@/lib/queries/templates";
import { searchCities, type City } from "@/lib/queries/cities";
import { publishTemplateEvent } from "@/lib/edge-functions";
import { getMyProfile, profileCache } from "@/lib/queries/profile";

export function TemplatesClient() {
  const router = useRouter();
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [targetDate, setTargetDate] = useState("");
  const [slug, setSlug] = useState("");
  const [cityTerm, setCityTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const { data: profile } = useQuery({
    queryKey: profileCache.meKey,
    queryFn: getMyProfile,
  });
  const isAdmin = profile?.role === "admin";

  const { data: templates, isPending, error } = useQuery({
    queryKey: templatesCache.listKey,
    queryFn: listMasterTemplates,
  });

  const { data: cityResults } = useQuery({
    queryKey: ["cities", "search", cityTerm],
    queryFn: () => searchCities(cityTerm),
    enabled: cityTerm.trim().length >= 3 && !selectedCity,
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
      geonameid: selectedCity ? selectedCity.geonameid : undefined,
      latitude: !selectedCity && latitude ? Number(latitude) : undefined,
      longitude: !selectedCity && longitude ? Number(longitude) : undefined,
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Event Templates</h1>
        {isAdmin && (
          <Link
            href="/templates/new"
            className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white"
          >
            + New Template
          </Link>
        )}
      </div>
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
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Link
                      href={`/templates/${t.id}/edit`}
                      className="rounded-md border px-3 py-1.5 text-xs font-medium"
                    >
                      Edit
                    </Link>
                  )}
                  <button
                    onClick={() => setPublishingId(publishingId === t.id ? null : t.id)}
                    className="rounded-md border px-3 py-1.5 text-xs font-medium"
                  >
                    {publishingId === t.id ? "Cancel" : "Publish"}
                  </button>
                </div>
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

                  <div className="space-y-1">
                    {selectedCity ? (
                      <div className="flex items-center justify-between rounded-md border bg-gray-50 px-3 py-2 text-sm">
                        <span>
                          {selectedCity.city_name}
                          {selectedCity.region_name ? `, ${selectedCity.region_name}` : ""} (
                          {selectedCity.country_code})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCity(null);
                            setCityTerm("");
                          }}
                          className="text-xs text-gray-500 hover:text-black"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          placeholder="Search for your city (min 3 characters)"
                          value={cityTerm}
                          onChange={(e) => setCityTerm(e.target.value)}
                          className="w-full rounded-md border px-3 py-2 text-sm"
                        />
                        {cityResults && cityResults.length > 0 && (
                          <ul className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-sm">
                            {cityResults.map((c) => (
                              <li key={c.geonameid}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCity(c);
                                    setCityTerm("");
                                  }}
                                  className="block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                                >
                                  {c.city_name}
                                  {c.region_name ? `, ${c.region_name}` : ""} ({c.country_code})
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        {cityTerm.trim().length >= 3 && cityResults && cityResults.length === 0 && (
                          <p className="mt-1 text-xs text-gray-500">
                            No matches. Try a different spelling, or use exact coordinates below.
                          </p>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowAdvanced((v) => !v)}
                      className="text-xs text-gray-500 hover:text-black"
                    >
                      {showAdvanced ? "Hide" : "Use exact coordinates instead"}
                    </button>

                    {showAdvanced && (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          step="any"
                          placeholder="Latitude"
                          value={latitude}
                          onChange={(e) => setLatitude(e.target.value)}
                          className="rounded-md border px-3 py-2 text-sm"
                        />
                        <input
                          type="number"
                          step="any"
                          placeholder="Longitude"
                          value={longitude}
                          onChange={(e) => setLongitude(e.target.value)}
                          className="rounded-md border px-3 py-2 text-sm"
                        />
                      </div>
                    )}
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
