"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe-client";
import { registerGuest } from "@/lib/edge-functions";
import { loadRegistrationDraft, clearRegistrationDraft } from "@/lib/registration-draft";

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
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full rounded-md bg-black px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? "Processing..." : "Pay now"}
      </button>
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
      <div className="mx-auto max-w-2xl py-16 text-center">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!clientSecret || !registrationId) {
    return <div className="mx-auto h-64 max-w-2xl animate-pulse rounded-lg bg-gray-100" />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-12">
      <h1 className="text-2xl font-semibold">Payment</h1>
      <Elements stripe={getStripe()} options={{ clientSecret }}>
        <CheckoutForm companySlug={companySlug} eventSlug={eventSlug} registrationId={registrationId} />
      </Elements>
    </div>
  );
}
