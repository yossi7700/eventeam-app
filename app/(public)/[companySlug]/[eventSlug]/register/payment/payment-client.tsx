"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Lock } from "lucide-react";
import { getStripe } from "@/lib/stripe-client";
import { registerGuest } from "@/lib/edge-functions";
import { loadRegistrationDraft, clearRegistrationDraft } from "@/lib/registration-draft";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

function CheckoutForm({
  companySlug,
  eventSlug,
  registrationId,
}: {
  companySlug: string;
  eventSlug: string;
  registrationId: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/${companySlug}/${eventSlug}/register/confirmation?registration_id=${registrationId}`,
      },
    });

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed. Please try again.");
      setSubmitting(false);
      return;
    }

    clearRegistrationDraft();
    router.push(`/${companySlug}/${eventSlug}/register/confirmation?registration_id=${registrationId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={!stripe || submitting} size="lg" className="w-full">
        <Lock />
        {submitting ? "Processing..." : "Pay now"}
      </Button>
    </form>
  );
}

export function PaymentClient({
  companySlug,
  eventSlug,
}: {
  companySlug: string;
  eventSlug: string;
}) {
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const draft = loadRegistrationDraft();
    if (!draft) {
      router.replace(`/${companySlug}/${eventSlug}/register`);
      return;
    }

    registerGuest({
      event_id: draft.event_id,
      primary_guest_name: draft.primary_guest_name,
      primary_guest_email: draft.primary_guest_email,
      primary_guest_phone: draft.primary_guest_phone,
      payment_method: draft.payment_method,
      guests: draft.guests,
      donations: draft.donations,
    })
      .then((response) => {
        if (!response.requires_payment || !response.client_secret) {
          clearRegistrationDraft();
          router.replace(
            `/${companySlug}/${eventSlug}/register/confirmation?registration_id=${response.registration_id}`
          );
          return;
        }
        setRegistrationId(response.registration_id);
        setClientSecret(response.client_secret);
      })
      .catch((err: Error) => setError(err.message));
    // Intentionally runs once on mount -- registration should not be
    // re-submitted on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl py-16">
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!clientSecret || !registrationId) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-12">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payment</h1>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Lock className="size-3.5" />
          Secured by Stripe
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Card details</CardTitle>
        </CardHeader>
        <CardContent>
          <Elements stripe={getStripe()} options={{ clientSecret }}>
            <CheckoutForm companySlug={companySlug} eventSlug={eventSlug} registrationId={registrationId} />
          </Elements>
        </CardContent>
      </Card>
    </div>
  );
}
