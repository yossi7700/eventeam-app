"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard } from "lucide-react";
import { getMyProfile, profileCache } from "@/lib/queries/profile";
import { getStripeAccount, stripeAccountCache } from "@/lib/queries/stripe-account";
import {
  completeStripeConnectOnboarding,
  getStripeConnectAuthorizeUrl,
} from "@/lib/edge-functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

const statusVariants: Record<string, "outline" | "default" | "secondary" | "destructive"> = {
  not_connected: "outline",
  onboarding: "secondary",
  restricted: "secondary",
  active: "default",
  disabled: "destructive",
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
    return <Skeleton className="h-56 max-w-2xl rounded-xl" />;
  }

  const status = account?.status ?? "not_connected";
  const isConnected = status !== "not_connected";

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-4 text-muted-foreground" />
            Stripe Connect
          </CardTitle>
          <Badge variant={statusVariants[status] ?? "outline"} className="capitalize">
            {status.replace("_", " ")}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {completeMutation.isPending && (
            <p className="text-sm text-muted-foreground">Finishing Stripe connection...</p>
          )}

          {isConnected && account && (
            <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/30 p-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Business name</p>
                <p>{account.business_name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Business email</p>
                <p>{account.business_email ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Account type</p>
                <p className="capitalize">{account.account_type ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bank account</p>
                <p>
                  {account.bank_name
                    ? `${account.bank_name} ****${account.bank_account_last4 ?? ""}`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Charges enabled</p>
                <p>{account.charges_enabled ? "Yes" : "No"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Payouts enabled</p>
                <p>{account.payouts_enabled ? "Yes" : "No"}</p>
              </div>
            </div>
          )}

          {!isConnected && (
            <p className="text-sm text-muted-foreground">
              Connect your Stripe account to accept card payments from guests. Cash payments work
              regardless of this connection.
            </p>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={() => {
              setError(null);
              connectMutation.mutate();
            }}
            disabled={connectMutation.isPending}
          >
            {connectMutation.isPending
              ? "Redirecting to Stripe..."
              : isConnected
                ? "Reconnect Stripe"
                : "Connect Stripe"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
