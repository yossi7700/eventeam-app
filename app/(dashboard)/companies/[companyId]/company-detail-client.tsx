"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { companiesCache, getCompanyDetail } from "@/lib/queries/companies";
import { approveCompany } from "@/lib/edge-functions";

const companyStatusStyles: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  suspended: "bg-orange-100 text-orange-800",
  rejected: "bg-red-100 text-red-800",
};

const stripeStatusStyles: Record<string, string> = {
  not_connected: "bg-gray-100 text-gray-700",
  onboarding: "bg-yellow-100 text-yellow-800",
  restricted: "bg-orange-100 text-orange-800",
  active: "bg-green-100 text-green-800",
  disabled: "bg-red-100 text-red-800",
};

const eventStatusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-green-100 text-green-800",
  ended: "bg-gray-100 text-gray-700",
  cancelled: "bg-red-100 text-red-800",
};

export function CompanyDetailClient({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();

  const { data: company, isPending, error } = useQuery({
    queryKey: companiesCache.detailKey(companyId),
    queryFn: () => getCompanyDetail(companyId),
  });

  const approveMutation = useMutation({
    mutationFn: approveCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companiesCache.detailKey(companyId) });
      queryClient.invalidateQueries({ queryKey: companiesCache.listKey });
    },
  });

  if (isPending) {
    return (
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
        <div className="h-32 animate-pulse rounded-lg bg-gray-100" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600">Failed to load company: {error.message}</p>;
  }

  if (!company) {
    return <p className="text-sm text-gray-500">Company not found.</p>;
  }

  const stripe = company.stripe_accounts;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/companies" className="text-xs text-gray-500 hover:text-black">
            &larr; Back to companies
          </Link>
          <h1 className="text-2xl font-semibold">{company.name}</h1>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${
            companyStatusStyles[company.status] ?? "bg-gray-100 text-gray-700"
          }`}
        >
          {company.status}
        </span>
      </div>

      {company.status === "pending" && (
        <div className="flex items-center gap-2 rounded-lg border p-4">
          <p className="flex-1 text-sm text-gray-600">
            This company is awaiting approval before it can publish events.
          </p>
          <button
            onClick={() => approveMutation.mutate({ company_id: company.id, approve: true })}
            disabled={approveMutation.isPending}
            className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            Approve
          </button>
          <button
            onClick={() =>
              approveMutation.mutate({
                company_id: company.id,
                approve: false,
                rejected_reason: "Rejected from company detail view",
              })
            }
            disabled={approveMutation.isPending}
            className="rounded-md border border-red-600 px-3 py-1.5 text-xs font-medium text-red-600 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 rounded-lg border p-4 text-sm">
        <div>
          <p className="text-xs text-gray-500">Contact email</p>
          <p>{company.contact_email}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Contact phone</p>
          <p>{company.contact_phone ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Slug</p>
          <p>{company.slug}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Commission %</p>
          <p>{company.company_settings?.admin_commission_pct ?? "—"}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Address</p>
          <p>
            {[company.address_line1, company.city, company.region, company.country]
              .filter(Boolean)
              .join(", ") || "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Created</p>
          <p>{new Date(company.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="mb-2 text-sm font-medium">Stripe Connect</h2>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${
              stripeStatusStyles[stripe?.status ?? "not_connected"] ?? "bg-gray-100 text-gray-700"
            }`}
          >
            {(stripe?.status ?? "not_connected").replace("_", " ")}
          </span>
          {stripe?.charges_enabled && (
            <span className="text-xs text-gray-500">Charges enabled</span>
          )}
          {stripe?.payouts_enabled && (
            <span className="text-xs text-gray-500">Payouts enabled</span>
          )}
        </div>
      </div>

      <div className="rounded-lg border">
        <h2 className="border-b p-4 text-sm font-medium">Events</h2>
        {company.events.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">No events yet.</p>
        ) : (
          <ul className="divide-y">
            {company.events.map((e) => (
              <li key={e.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <Link href={`/events/${e.id}/edit`} className="font-medium hover:underline">
                  {e.title}
                </Link>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${
                    eventStatusStyles[e.status] ?? "bg-gray-100 text-gray-700"
                  }`}
                >
                  {e.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
