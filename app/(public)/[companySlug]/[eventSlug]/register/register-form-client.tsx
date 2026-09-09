"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  getPublicCompanyProfile,
  getPublicEventWithChildren,
  publicBookingCache,
} from "@/lib/queries/public-booking";
import { saveRegistrationDraft, type DraftLineItem } from "@/lib/registration-draft";

export function RegisterFormClient({
  companySlug,
  eventSlug,
}: {
  companySlug: string;
  eventSlug: string;
}) {
  const router = useRouter();

  const { data: event, isPending } = useQuery({
    queryKey: publicBookingCache.eventKey(companySlug, eventSlug),
    queryFn: () => getPublicEventWithChildren(companySlug, eventSlug),
  });

  const { data: company } = useQuery({
    queryKey: publicBookingCache.companyKey(companySlug),
    queryFn: () => getPublicCompanyProfile(companySlug),
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"card" | "cash" | null>(
    null
  );
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [donationAmount, setDonationAmount] = useState("");
  const [agreedToRegulation, setAgreedToRegulation] = useState(false);

  const advance = event?.advance;
  const cashAllowed = advance?.is_cash_allowed ?? true;
  const cardAllowed = advance?.is_show_stripe ?? true;
  const donationAllowed = advance?.is_donation_allowed ?? false;
  const attendeesRequired = advance?.is_attendees_required ?? false;
  const showRegulation = advance?.is_show_regulation ?? false;

  // Derived during render rather than synced via an effect: if the user
  // hasn't picked a method yet, or their pick is no longer valid once the
  // event's resolved settings load, fall back to whichever is allowed.
  const paymentMethod: "card" | "cash" =
    selectedPaymentMethod === "cash" && cashAllowed
      ? "cash"
      : selectedPaymentMethod === "card" && cardAllowed
        ? "card"
        : cardAllowed
          ? "card"
          : "cash";

  if (isPending) {
    return <div className="mx-auto h-64 max-w-2xl animate-pulse rounded-lg bg-gray-100" />;
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <h1 className="text-xl font-semibold">Event not found</h1>
      </div>
    );
  }

  if (!event.id) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <h1 className="text-xl font-semibold">Event is missing required data</h1>
      </div>
    );
  }
  const eventId: string = event.id;

  const allProducts = event.sub_events.flatMap((se) =>
    se.products.map((p) => ({ ...p, sub_event_id: se.id, sub_event_title: se.title }))
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const lineItems: DraftLineItem[] = allProducts
      .filter((p) => (quantities[p.id!] ?? 0) > 0)
      .map((p) => {
        if (!p.sub_event_id || !p.id) {
          throw new Error("Selected ticket is missing required identifiers.");
        }
        return {
          sub_event_id: p.sub_event_id,
          product_id: p.id,
          quantity: quantities[p.id],
        };
      });

    if (lineItems.length === 0) {
      alert("Please select at least one ticket.");
      return;
    }

    const overCapacity = allProducts.find(
      (p) => p.remaining != null && (quantities[p.id!] ?? 0) > p.remaining
    );
    if (overCapacity) {
      alert(`Only ${overCapacity.remaining} left for "${overCapacity.name}".`);
      return;
    }

    if (attendeesRequired && !email && !phone) {
      alert("Please provide an email or phone number.");
      return;
    }

    if (showRegulation && !agreedToRegulation) {
      alert("Please agree to the terms before continuing.");
      return;
    }

    saveRegistrationDraft({
      event_id: eventId,
      primary_guest_name: name,
      primary_guest_email: email,
      primary_guest_phone: phone || undefined,
      payment_method: paymentMethod,
      guests: [{ full_name: name, email, phone, line_items: lineItems }],
      donations: donationAmount
        ? [{ amount: Number(donationAmount) }]
        : [],
    });

    router.push(
      paymentMethod === "card"
        ? `/${companySlug}/${eventSlug}/register/payment`
        : `/${companySlug}/${eventSlug}/register/confirmation`
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6 py-12">
      <h1 className="text-2xl font-semibold">Register for {event.title}</h1>

      <div className="space-y-3">
        <input
          required
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
        />
        <input
          required
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
        />
        <input
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Tickets</h2>
        {allProducts.map((p) => {
          const soldOut = p.remaining != null && p.remaining <= 0;
          return (
            <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-gray-500">
                  {p.sub_event_title} &middot; {p.price} {p.currency}
                </p>
                {p.remaining != null && (
                  <p className={`text-xs ${soldOut ? "text-red-600" : "text-gray-400"}`}>
                    {soldOut ? "Sold out" : `${p.remaining} remaining`}
                  </p>
                )}
              </div>
              <input
                type="number"
                min={0}
                max={p.remaining ?? undefined}
                disabled={soldOut}
                value={quantities[p.id!] ?? 0}
                onChange={(e) => {
                  const raw = Number(e.target.value);
                  const capped = p.remaining != null ? Math.min(raw, p.remaining) : raw;
                  setQuantities((q) => ({ ...q, [p.id!]: Math.max(0, capped) }));
                }}
                className="w-20 rounded-md border px-2 py-1 text-center disabled:bg-gray-100"
              />
            </div>
          );
        })}
      </div>

      {donationAllowed && event.donation_fields.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Donation (optional)</h2>
          {company?.donation_field_text && (
            <p className="text-sm text-gray-500">{company.donation_field_text}</p>
          )}
          <input
            type="number"
            min={0}
            step="0.01"
            placeholder="Amount"
            value={donationAmount}
            onChange={(e) => setDonationAmount(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
          />
        </div>
      )}

      {(cardAllowed || cashAllowed) && (
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Payment method</h2>
          <div className="flex gap-4">
            {cardAllowed && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={paymentMethod === "card"}
                  onChange={() => setSelectedPaymentMethod("card")}
                />
                Card
              </label>
            )}
            {cashAllowed && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={paymentMethod === "cash"}
                  onChange={() => setSelectedPaymentMethod("cash")}
                />
                Cash (pay at event)
              </label>
            )}
          </div>
          {paymentMethod === "cash" && company?.cod_text && (
            <p className="text-sm text-gray-500">{company.cod_text}</p>
          )}
        </div>
      )}

      {showRegulation && (
        <label className="flex items-start gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={agreedToRegulation}
            onChange={(e) => setAgreedToRegulation(e.target.checked)}
            className="mt-1"
          />
          <span>
            {company?.regulation_text ?? "I agree to the terms and conditions for this event."}
          </span>
        </label>
      )}

      <button
        type="submit"
        className="w-full rounded-md bg-black px-4 py-3 text-sm font-medium text-white"
      >
        Continue
      </button>
    </form>
  );
}
