"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getPublicEventWithChildren, publicBookingCache } from "@/lib/queries/public-booking";
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

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash">("card");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [donationAmount, setDonationAmount] = useState("");

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
        {allProducts.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-gray-500">
                {p.sub_event_title} &middot; {p.price} {p.currency}
              </p>
            </div>
            <input
              type="number"
              min={0}
              value={quantities[p.id!] ?? 0}
              onChange={(e) =>
                setQuantities((q) => ({ ...q, [p.id!]: Number(e.target.value) }))
              }
              className="w-20 rounded-md border px-2 py-1 text-center"
            />
          </div>
        ))}
      </div>

      {event.donation_fields.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Donation (optional)</h2>
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

      <div className="space-y-2">
        <h2 className="text-lg font-medium">Payment method</h2>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={paymentMethod === "card"}
              onChange={() => setPaymentMethod("card")}
            />
            Card
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={paymentMethod === "cash"}
              onChange={() => setPaymentMethod("cash")}
            />
            Cash (pay at event)
          </label>
        </div>
      </div>

      <button
        type="submit"
        className="w-full rounded-md bg-black px-4 py-3 text-sm font-medium text-white"
      >
        Continue
      </button>
    </form>
  );
}
