"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyProfile, profileCache } from "@/lib/queries/profile";
import { getStripeAccount, stripeAccountCache } from "@/lib/queries/stripe-account";
import {
  completeStripeConnectOnboarding,
  getStripeConnectAuthorizeUrl,
} from "@/lib/edge-functions";

const statusStyles: Record<string, string> = {
  not_connected: "bg-gray-100 text-gray-700",
  onboarding: "bg-yellow-100 text-yellow-800",
  restricted: "bg-orange-100 text-orange-800",
  active: "bg-green-100 text-green-800",
  disabled: "bg-red-100 text-red-800",
};

// Gap-audit item: STRIPE_CONNECT_REDIRECT_URI (see TODO-FOR-YOSSI.md) has
// always pointed at /settings/payment, but this page never existed --
// stripe-connect-onboarding's authorize-url/code-exchange flow was
// completely unreachable from the UI. This is the company-facing
// equivalent of the old system's StripeConnectDetailController display
// (business name/email, connected bank last4) plus the "Connect Stripe"
// action itself.
export function PaymentSettingsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const exchangedCode = useRef<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: profileCache.meKey,
    queryFn: getMyProfile,
  });
  const companyId = profile?.companies?.id ?? null;

  const { data: account, isPending } = useQuery({
    queryKey: companyId ? stripeAccountCache.key(companyId) : ["stripe_account", "none"],
    queryFn: () => getStripeAccount(companyId!),
    enabled: !!companyId,
  });

  const connectMutation = useMutation({
    mutationFn: getStripeConnectAuthorizeUrl,
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (err: Error) => setError(err.message),
  });

  const completeMutation = useMutation({
    mutationFn: completeStripeConnectOnboarding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stripeAccountCache.key(companyId!) });
      router.replace("/settings/payment");
    },
    onError: (err: Error) => setError(err.message),
  });

  // Stripe redirects back here with ?code=... after the company authorizes
  // the connection -- exchange it exactly once.
  useEffect(() => {
    const code = searchParams.get("code");
    if (code && exchangedCode.current !== code) {
      exchangedCode.current = code;
      completeMutation.mutate(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (!companyId || isPending) {
    return <div className="h-40 animate-pulse rounded-lg bg-gray-100" />;
  }

  const status = account?.status ?? "not_connected";
  const isConnected = status !== "not_connected";

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Payment Settings</h1>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Stripe Connect</h2>
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${
              statusStyles[status] ?? "bg-gray-100 text-gray-700"
            }`}
          >
            {status.replace("_", " ")}
          </span>
        </div>

        {completeMutation.isPending && (
          <p className="text-sm text-gray-500">Finishing Stripe connection...</p>
        )}

        {isConnected && account && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Business name</p>
              <p>{account.business_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Business email</p>
              <p>{account.business_email ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Account type</p>
              <p className="capitalize">{account.account_type ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Bank account</p>
              <p>
                {account.bank_name
                  ? `${account.bank_name} ****${account.bank_account_last4 ?? ""}`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Charges enabled</p>
              <p>{account.charges_enabled ? "Yes" : "No"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Payouts enabled</p>
              <p>{account.payouts_enabled ? "Yes" : "No"}</p>
            </div>
          </div>
        )}

        {!isConnected && (
          <p className="text-sm text-gray-500">
            Connect your Stripe account to accept card payments from guests. Cash payments work
            regardless of this connection.
          </p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={() => {
            setError(null);
            connectMutation.mutate();
          }}
          disabled={connectMutation.isPending}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {connectMutation.isPending
            ? "Redirecting to Stripe..."
            : isConnected
              ? "Reconnect Stripe"
              : "Connect Stripe"}
        </button>
      </div>
    </div>
  );
}
