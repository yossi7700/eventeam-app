"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LayoutTemplate, MapPin, Plus, Rocket } from "lucide-react";
import { listMasterTemplates, templatesCache } from "@/lib/queries/templates";
import { searchCities, type City } from "@/lib/queries/cities";
import { publishTemplateEvent } from "@/lib/edge-functions";
import { getMyProfile, profileCache } from "@/lib/queries/profile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Event Templates</h1>
          <p className="text-sm text-muted-foreground">
            Publish a company event from an admin-provided template, with sub-event times
            computed relative to sunset for your chosen date and location.
          </p>
        </div>
        {isAdmin && (
          <Button render={<Link href="/templates/new" />} size="sm">
            <Plus />
            New Template
          </Button>
        )}
      </div>

      {isPending && (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {templates && templates.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <LayoutTemplate className="size-6" />
            No templates are available yet.
          </CardContent>
        </Card>
      )}

      {templates && templates.length > 0 && (
        <div className="grid gap-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{t.title}</p>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <Button variant="outline" size="sm" render={<Link href={`/templates/${t.id}/edit`} />}>
                        Edit
                      </Button>
                    )}
                    <Button
                      variant={publishingId === t.id ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setPublishingId(publishingId === t.id ? null : t.id)}
                    >
                      {publishingId === t.id ? "Cancel" : "Publish"}
                    </Button>
                  </div>
                </div>

                {publishingId === t.id && (
                  <div className="space-y-3 border-t pt-3">
                    <Input
                      required
                      placeholder="URL slug for the new event"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                    />
                    <Input
                      required
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                    />

                    <div className="space-y-1.5">
                      {selectedCity ? (
                        <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="size-3.5 text-muted-foreground" />
                            {selectedCity.city_name}
                            {selectedCity.region_name ? `, ${selectedCity.region_name}` : ""} (
                            {selectedCity.country_code})
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCity(null);
                              setCityTerm("");
                            }}
                          >
                            Change
                          </Button>
                        </div>
                      ) : (
                        <div className="relative">
                          <Input
                            placeholder="Search for your city (min 3 characters)"
                            value={cityTerm}
                            onChange={(e) => setCityTerm(e.target.value)}
                          />
                          {cityResults && cityResults.length > 0 && (
                            <ul className="absolute z-10 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
                              {cityResults.map((c) => (
                                <li key={c.geonameid}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedCity(c);
                                      setCityTerm("");
                                    }}
                                    className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                                  >
                                    {c.city_name}
                                    {c.region_name ? `, ${c.region_name}` : ""} ({c.country_code})
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                          {cityTerm.trim().length >= 3 && cityResults && cityResults.length === 0 && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              No matches. Try a different spelling, or use exact coordinates below.
                            </p>
                          )}
                        </div>
                      )}

                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto px-0 text-xs text-muted-foreground"
                        onClick={() => setShowAdvanced((v) => !v)}
                      >
                        {showAdvanced ? "Hide" : "Use exact coordinates instead"}
                      </Button>

                      {showAdvanced && (
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            step="any"
                            placeholder="Latitude"
                            value={latitude}
                            onChange={(e) => setLatitude(e.target.value)}
                          />
                          <Input
                            type="number"
                            step="any"
                            placeholder="Longitude"
                            value={longitude}
                            onChange={(e) => setLongitude(e.target.value)}
                          />
                        </div>
                      )}
                    </div>

                    {publishMutation.error && (
                      <Alert variant="destructive">
                        <AlertDescription>{(publishMutation.error as Error).message}</AlertDescription>
                      </Alert>
                    )}
                    <Button onClick={() => handlePublish(t.id)} disabled={publishMutation.isPending} className="w-full">
                      <Rocket />
                      {publishMutation.isPending ? "Publishing..." : "Confirm Publish"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
