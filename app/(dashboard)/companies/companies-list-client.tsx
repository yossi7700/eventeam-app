"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { companiesCache, listAllCompanies } from "@/lib/queries/companies";
import { approveCompany } from "@/lib/edge-functions";

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  suspended: "bg-orange-100 text-orange-800",
  rejected: "bg-red-100 text-red-800",
};

export function CompaniesListClient() {
  const queryClient = useQueryClient();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: companies, isPending, error } = useQuery({
    queryKey: companiesCache.listKey,
    queryFn: listAllCompanies,
  });

  const mutation = useMutation({
    mutationFn: approveCompany,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: companiesCache.listKey }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Companies</h1>

      {isPending && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-600">Failed to load companies: {error.message}</p>}

      {companies && (
        <ul className="divide-y rounded-lg border">
          {companies.map((company) => (
            <li key={company.id} className="space-y-2 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{company.name}</p>
                  <p className="text-sm text-gray-500">{company.contact_email}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${
                    statusStyles[company.status] ?? "bg-gray-100 text-gray-700"
                  }`}
                >
                  {company.status}
                </span>
              </div>

              {company.status === "pending" && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => mutation.mutate({ company_id: company.id, approve: true })}
                    disabled={mutation.isPending}
                    className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  >
                    Approve
                  </button>
                  {rejectingId === company.id ? (
                    <>
                      <input
                        placeholder="Reason"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="rounded-md border px-2 py-1 text-xs"
                      />
                      <button
                        onClick={() => {
                          mutation.mutate({
                            company_id: company.id,
                            approve: false,
                            rejected_reason: rejectReason,
                          });
                          setRejectingId(null);
                          setRejectReason("");
                        }}
                        disabled={mutation.isPending}
                        className="rounded-md border border-red-600 px-3 py-1.5 text-xs font-medium text-red-600 disabled:opacity-50"
                      >
                        Confirm reject
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setRejectingId(company.id)}
                      className="rounded-md border px-3 py-1.5 text-xs font-medium"
                    >
                      Reject
                    </button>
                  )}
                </div>
              )}

              {mutation.error && mutation.variables?.company_id === company.id && (
                <p className="text-xs text-red-600">{(mutation.error as Error).message}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
