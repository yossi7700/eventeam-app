"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Banknote, CreditCard, Minus, Plus, Ticket } from "lucide-react";
import {
  getPublicCompanyProfile,
  getPublicEventWithChildren,
  publicBookingCache,
} from "@/lib/queries/public-booking";
import { saveRegistrationDraft, type DraftLineItem } from "@/lib/registration-draft";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

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
  const showAppFee = advance?.is_show_app_fee ?? false;
  const platformFeePct = advance?.platform_fee_pct ?? 0;

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
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-12">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
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

  // Gap-audit item: old reg-test.blade.php's updateTotal() showed a live
  // running total including the platform-fee line before checkout ("Add
  // 5% ($X) for platform fee"), so a guest always knew the final charge
  // before paying. This estimate mirrors register_guest_for_event's own
  // math (subtotal + donation, fee on that combined base) -- the server
  // is still the actual source of truth for the charge amount.
  const ticketsSubtotal = allProducts.reduce(
    (sum, p) => sum + Number(p.price ?? 0) * (quantities[p.id!] ?? 0),
    0
  );
  const donationValue = Number(donationAmount) || 0;
  const feeBase = ticketsSubtotal + donationValue;
  const estimatedPlatformFee = showAppFee ? Math.round(feeBase * (platformFeePct / 100) * 100) / 100 : 0;
  const estimatedTotal = feeBase + estimatedPlatformFee;
  const ticketCount = Object.values(quantities).reduce((sum, q) => sum + q, 0);

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
      toast.error("Please select at least one ticket.");
      return;
    }

    const overCapacity = allProducts.find(
      (p) => p.remaining != null && (quantities[p.id!] ?? 0) > p.remaining
    );
    if (overCapacity) {
      toast.error(`Only ${overCapacity.remaining} left for "${overCapacity.name}".`);
      return;
    }

    if (attendeesRequired && !email && !phone) {
      toast.error("Please provide an email or phone number.");
      return;
    }

    if (showRegulation && !agreedToRegulation) {
      toast.error("Please agree to the terms before continuing.");
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Register</h1>
        <p className="text-sm text-muted-foreground">for {event.title}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="reg-name">Full name</Label>
            <Input id="reg-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="reg-email">Email</Label>
              <Input
                id="reg-email"
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-phone">Phone (optional)</Label>
              <Input id="reg-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tickets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {allProducts.map((p) => {
            const soldOut = p.remaining != null && p.remaining <= 0;
            const qty = quantities[p.id!] ?? 0;
            return (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  <span
                    aria-hidden
                    className="mt-1 size-3 shrink-0 rounded-full border"
                    style={{ backgroundColor: p.color ?? "var(--muted)" }}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {p.sub_event_title} &middot; {p.price} {p.currency}
                    </p>
                    {p.remaining != null && (
                      <p className={`text-xs ${soldOut ? "text-destructive" : "text-muted-foreground"}`}>
                        {soldOut ? "Sold out" : `${p.remaining} remaining`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={soldOut || qty <= 0}
                    onClick={() =>
                      setQuantities((q) => ({ ...q, [p.id!]: Math.max(0, (q[p.id!] ?? 0) - 1) }))
                    }
                  >
                    <Minus />
                  </Button>
                  <span className="w-6 text-center text-sm font-medium tabular-nums">{qty}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={soldOut || (p.remaining != null && qty >= p.remaining)}
                    onClick={() =>
                      setQuantities((q) => {
                        const next = (q[p.id!] ?? 0) + 1;
                        return { ...q, [p.id!]: p.remaining != null ? Math.min(next, p.remaining) : next };
                      })
                    }
                  >
                    <Plus />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {donationAllowed && event.donation_fields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Donation (optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {company?.donation_field_text && (
              <p className="text-sm text-muted-foreground">{company.donation_field_text}</p>
            )}
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                $
              </span>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                value={donationAmount}
                onChange={(e) => setDonationAmount(e.target.value)}
                className="pl-6"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {(cardAllowed || cashAllowed) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <RadioGroup
              value={paymentMethod}
              onValueChange={(v) => setSelectedPaymentMethod(v as "card" | "cash")}
              className="grid gap-2 sm:grid-cols-2"
            >
              {cardAllowed && (
                <Label
                  htmlFor="pm-card"
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5"
                >
                  <RadioGroupItem value="card" id="pm-card" />
                  <CreditCard className="size-4 text-muted-foreground" />
                  Card
                </Label>
              )}
              {cashAllowed && (
                <Label
                  htmlFor="pm-cash"
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5"
                >
                  <RadioGroupItem value="cash" id="pm-cash" />
                  <Banknote className="size-4 text-muted-foreground" />
                  Cash (pay at event)
                </Label>
              )}
            </RadioGroup>
            {paymentMethod === "cash" && company?.cod_text && (
              <p className="text-sm text-muted-foreground">{company.cod_text}</p>
            )}
          </CardContent>
        </Card>
      )}

      {showRegulation && (
        <Label htmlFor="reg-terms" className="flex items-start gap-2 text-sm font-normal text-muted-foreground">
          <Checkbox
            id="reg-terms"
            checked={agreedToRegulation}
            onCheckedChange={(checked) => setAgreedToRegulation(checked === true)}
            className="mt-0.5"
          />
          <span>
            {company?.regulation_text ?? "I agree to the terms and conditions for this event."}
          </span>
        </Label>
      )}

      {ticketsSubtotal > 0 && (
        <Card className="bg-muted/40">
          <CardContent className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Tickets ({ticketCount})</span>
              <span>${ticketsSubtotal.toFixed(2)}</span>
            </div>
            {donationValue > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Donation</span>
                <span>${donationValue.toFixed(2)}</span>
              </div>
            )}
            {showAppFee && estimatedPlatformFee > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>
                  Platform fee ({platformFeePct}%)
                  {advance?.platform_fee_text ? ` — ${advance.platform_fee_text}` : ""}
                </span>
                <span>${estimatedPlatformFee.toFixed(2)}</span>
              </div>
            )}
            <Separator className="my-1" />
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>${estimatedTotal.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Button type="submit" size="lg" className="w-full">
        <Ticket />
        Continue
      </Button>
    </form>
  );
}
