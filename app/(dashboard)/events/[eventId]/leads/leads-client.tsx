"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { leadsCache, listRegistrationsForEvent } from "@/lib/queries/leads";
import { exportLeadsCsv } from "@/lib/edge-functions";

const paymentStatusStyles: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-700",
  refunded: "bg-red-100 text-red-800",
};

export function LeadsClient({ eventId }: { eventId: string }) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const { data: registrations, isPending, error } = useQuery({
    queryKey: leadsCache.listKey(eventId),
    queryFn: () => listRegistrationsForEvent(eventId),
  });

  const exportMutation = useMutation({
    mutationFn: () => exportLeadsCsv(eventId),
    onSuccess: (data) => setDownloadUrl(data.url),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Leads</h1>
        <button
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {exportMutation.isPending ? "Generating..." : "Export CSV"}
        </button>
      </div>

      {exportMutation.error && (
        <p className="text-sm text-red-600">{(exportMutation.error as Error).message}</p>
      )}

      {downloadUrl && (
        <p className="text-sm">
          Export ready:{" "}
          <a href={downloadUrl} className="text-blue-600 underline" target="_blank" rel="noreferrer">
            Download CSV
          </a>{" "}
          (link expires in 5 minutes)
        </p>
      )}

      {isPending && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-600">Failed to load leads: {error.message}</p>}

      {registrations && registrations.length === 0 && (
        <p className="text-sm text-gray-500">No registrations yet for this event.</p>
      )}

      {registrations && registrations.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {registrations.map((r) => (
            <li key={r.id} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{r.primary_guest_name}</p>
                  <p className="text-sm text-gray-500">
                    {r.primary_guest_email} &middot; {r.guests.length} guest(s)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    ${Number(r.total_amount).toFixed(2)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${
                      paymentStatusStyles[r.status] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
