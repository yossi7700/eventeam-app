"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchCities, type City } from "@/lib/queries/cities";

// Shared city-search widget (factored out of templates-client.tsx so
// event-form-client.tsx can resolve a geonameid too, needed for
// sub-event-activity sunset/candle-lighting time resolution).
export function CitySearchInput({
  geonameid,
  onChange,
}: {
  geonameid: string;
  onChange: (geonameid: string, label: string) => void;
}) {
  const [term, setTerm] = useState("");
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  const { data: results } = useQuery({
    queryKey: ["cities", "search", term],
    queryFn: () => searchCities(term),
    enabled: term.trim().length >= 3 && !geonameid,
  });

  function selectCity(c: City) {
    const label = `${c.city_name}${c.region_name ? `, ${c.region_name}` : ""} (${c.country_code})`;
    setSelectedLabel(label);
    setTerm("");
    onChange(c.geonameid, label);
  }

  if (geonameid) {
    return (
      <div className="flex items-center justify-between rounded-md border bg-gray-50 px-3 py-2 text-sm">
        <span>{selectedLabel ?? `Location set (geonameid ${geonameid})`}</span>
        <button
          type="button"
          onClick={() => {
            setSelectedLabel(null);
            onChange("", "");
          }}
          className="text-xs text-gray-500 hover:text-black"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        placeholder="Search for a city (min 3 characters)"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        className="w-full rounded-md border px-3 py-2 text-sm"
      />
      {results && results.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-sm">
          {results.map((c) => (
            <li key={c.geonameid}>
              <button
                type="button"
                onClick={() => selectCity(c)}
                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
              >
                {c.city_name}
                {c.region_name ? `, ${c.region_name}` : ""} ({c.country_code})
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
