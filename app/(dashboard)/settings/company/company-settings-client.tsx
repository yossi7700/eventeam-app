"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { getMyProfile, profileCache } from "@/lib/queries/profile";
import {
  companySettingsCache,
  getCompany,
  getCompanySettings,
  updateCompany,
  updateCompanySettings,
} from "@/lib/queries/company-settings";
import {
  createDonationTemplate,
  deleteDonationTemplate,
  donationTemplatesCache,
  listDonationTemplates,
  updateDonationTemplate,
} from "@/lib/queries/donations";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function ProfileForm({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();
  const { data: company, isPending } = useQuery({
    queryKey: companySettingsCache.companyKey(companyId),
    queryFn: () => getCompany(companyId),
  });

  const [name, setName] = useState(company?.name ?? "");
  const [contactEmail, setContactEmail] = useState(company?.contact_email ?? "");
  const [contactPhone, setContactPhone] = useState(company?.contact_phone ?? "");
  const [addressLine1, setAddressLine1] = useState(company?.address_line1 ?? "");
  const [addressLine2, setAddressLine2] = useState(company?.address_line2 ?? "");
  const [city, setCity] = useState(company?.city ?? "");
  const [region, setRegion] = useState(company?.region ?? "");
  const [postalCode, setPostalCode] = useState(company?.postal_code ?? "");
  const [country, setCountry] = useState(company?.country ?? "");
  const [googleMapsUrl, setGoogleMapsUrl] = useState(company?.google_maps_url ?? "");

  const mutation = useMutation({
    mutationFn: () =>
      updateCompany(companyId, {
        name,
        contact_email: contactEmail,
        contact_phone: contactPhone || null,
        address_line1: addressLine1 || null,
        address_line2: addressLine2 || null,
        city: city || null,
        region: region || null,
        postal_code: postalCode || null,
        country: country || null,
        google_maps_url: googleMapsUrl || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companySettingsCache.companyKey(companyId) });
      toast.success("Company profile saved.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isPending) return <Skeleton className="h-96 w-full rounded-xl" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Company profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="cf-name">Company name</Label>
            <Input id="cf-name" required defaultValue={company?.name ?? ""} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cf-email">Contact email</Label>
              <Input
                id="cf-email"
                required
                type="email"
                defaultValue={company?.contact_email ?? ""}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cf-phone">Contact phone</Label>
              <Input id="cf-phone" defaultValue={company?.contact_phone ?? ""} onChange={(e) => setContactPhone(e.target.value)} />
            </div>
          </div>

          <div className="space-y-3 border-t pt-4">
            <div>
              <p className="text-sm font-medium">Event address</p>
              <p className="text-xs text-muted-foreground">
                Shown on the public event page when &quot;Ask for guest address&quot; is enabled
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cf-addr1">Address line 1</Label>
              <Input id="cf-addr1" defaultValue={company?.address_line1 ?? ""} onChange={(e) => setAddressLine1(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cf-addr2">Address line 2 (optional)</Label>
              <Input id="cf-addr2" defaultValue={company?.address_line2 ?? ""} onChange={(e) => setAddressLine2(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cf-city">City</Label>
                <Input id="cf-city" defaultValue={company?.city ?? ""} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cf-region">State / region</Label>
                <Input id="cf-region" defaultValue={company?.region ?? ""} onChange={(e) => setRegion(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cf-postal">Postal / zip code</Label>
                <Input id="cf-postal" defaultValue={company?.postal_code ?? ""} onChange={(e) => setPostalCode(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cf-country">Country</Label>
                <Input id="cf-country" defaultValue={company?.country ?? ""} onChange={(e) => setCountry(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cf-maps">Google Maps link (optional)</Label>
              <Input
                id="cf-maps"
                type="url"
                defaultValue={company?.google_maps_url ?? ""}
                onChange={(e) => setGoogleMapsUrl(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function FrontPageDesignForm({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();
  const { data: settings, isPending } = useQuery({
    queryKey: companySettingsCache.key(companyId),
    queryFn: () => getCompanySettings(companyId),
  });

  const [primaryColor, setPrimaryColor] = useState(settings?.primary_color ?? "#000000");
  const [secondaryColor, setSecondaryColor] = useState(settings?.secondary_color ?? "#ffffff");
  const [fontFamily, setFontFamily] = useState(settings?.font_family ?? "");
  const [aboutText, setAboutText] = useState(settings?.about_text ?? "");
  const [facebookUrl, setFacebookUrl] = useState(settings?.facebook_url ?? "");
  const [instagramUrl, setInstagramUrl] = useState(settings?.instagram_url ?? "");
  const [twitterUrl, setTwitterUrl] = useState(settings?.twitter_url ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(settings?.youtube_url ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(settings?.website_url ?? "");
  const [customCss, setCustomCss] = useState(settings?.custom_css ?? "");
  const [stepTitles, setStepTitles] = useState([
    settings?.step_1_title ?? "",
    settings?.step_2_title ?? "",
    settings?.step_3_title ?? "",
    settings?.step_4_title ?? "",
    settings?.step_5_title ?? "",
  ]);

  const mutation = useMutation({
    mutationFn: () =>
      updateCompanySettings(companyId, {
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        font_family: fontFamily || null,
        about_text: aboutText || null,
        facebook_url: facebookUrl || null,
        instagram_url: instagramUrl || null,
        twitter_url: twitterUrl || null,
        youtube_url: youtubeUrl || null,
        website_url: websiteUrl || null,
        custom_css: customCss || null,
        step_1_title: stepTitles[0] || null,
        step_2_title: stepTitles[1] || null,
        step_3_title: stepTitles[2] || null,
        step_4_title: stepTitles[3] || null,
        step_5_title: stepTitles[4] || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companySettingsCache.key(companyId) });
      toast.success("Design saved.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isPending) return <Skeleton className="h-96 w-full rounded-xl" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Public page design</CardTitle>
        <CardDescription>How your company&apos;s public page looks to guests.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fp-primary">Primary color</Label>
              <input
                id="fp-primary"
                type="color"
                defaultValue={settings?.primary_color ?? "#000000"}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-9 w-full cursor-pointer rounded-md border"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fp-secondary">Secondary color</Label>
              <input
                id="fp-secondary"
                type="color"
                defaultValue={settings?.secondary_color ?? "#ffffff"}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="h-9 w-full cursor-pointer rounded-md border"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fp-font">Font family</Label>
            <Input
              id="fp-font"
              placeholder="e.g. Inter, sans-serif"
              defaultValue={settings?.font_family ?? ""}
              onChange={(e) => setFontFamily(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fp-about">About text</Label>
            <Textarea
              id="fp-about"
              rows={3}
              placeholder="Shown on your public page"
              defaultValue={settings?.about_text ?? ""}
              onChange={(e) => setAboutText(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fp-fb">Facebook URL</Label>
              <Input id="fp-fb" defaultValue={settings?.facebook_url ?? ""} onChange={(e) => setFacebookUrl(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fp-ig">Instagram URL</Label>
              <Input id="fp-ig" defaultValue={settings?.instagram_url ?? ""} onChange={(e) => setInstagramUrl(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fp-tw">Twitter / X URL</Label>
              <Input id="fp-tw" defaultValue={settings?.twitter_url ?? ""} onChange={(e) => setTwitterUrl(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fp-yt">YouTube URL</Label>
              <Input id="fp-yt" defaultValue={settings?.youtube_url ?? ""} onChange={(e) => setYoutubeUrl(e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="fp-web">Website URL</Label>
              <Input id="fp-web" defaultValue={settings?.website_url ?? ""} onChange={(e) => setWebsiteUrl(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Registration flow step titles</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
              {stepTitles.map((title, i) => (
                <Input
                  key={i}
                  placeholder={`Step ${i + 1}`}
                  value={title}
                  onChange={(e) =>
                    setStepTitles((prev) => prev.map((t, j) => (j === i ? e.target.value : t)))
                  }
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fp-css">Custom CSS (advanced)</Label>
            <Textarea
              id="fp-css"
              rows={4}
              placeholder="Applied to your public page"
              defaultValue={settings?.custom_css ?? ""}
              onChange={(e) => setCustomCss(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save design"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// Tri-state mirrors the same "inherit from platform" cascade used on the
// per-event advance settings (event-form-client.tsx) -- here "inherit"
// means "fall back to the hardcoded platform default" instead of "fall
// back to the company default", since this IS the company-default tier.
type TriState = "inherit" | "on" | "off";

const DEFAULT_FIELDS: { key: string; label: string }[] = [
  { key: "default_is_attendees_required", label: "Require attendee contact details" },
  { key: "default_is_show_address", label: "Ask for guest address" },
  { key: "default_is_cash_allowed", label: "Allow cash payment" },
  { key: "default_is_donation_allowed", label: "Allow donations" },
  { key: "default_is_show_regulation", label: "Show terms & regulations" },
  { key: "default_is_show_stripe", label: "Allow card payment (Stripe)" },
  { key: "default_is_show_app_fee", label: "Show platform fee to guests" },
  { key: "default_is_enable_donation", label: "Enable donation field by default" },
];

function EventDefaultsForm({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();
  const { data: settings, isPending } = useQuery({
    queryKey: companySettingsCache.key(companyId),
    queryFn: () => getCompanySettings(companyId),
  });

  const toTri = (v: boolean | null | undefined): TriState =>
    v === null || v === undefined ? "inherit" : v ? "on" : "off";

  const [defaults, setDefaults] = useState<Record<string, TriState>>({});
  const [hydrated, setHydrated] = useState(false);
  const [platformFeePct, setPlatformFeePct] = useState("");
  const [platformFeeText, setPlatformFeeText] = useState("");
  const [regulationText, setRegulationText] = useState("");
  const [donationFieldText, setDonationFieldText] = useState("");
  const [codText, setCodText] = useState("");
  const [beforeSunsetMinutes, setBeforeSunsetMinutes] = useState("");
  const [afterSunsetMinutes, setAfterSunsetMinutes] = useState("");

  if (!hydrated && settings !== undefined) {
    const next: Record<string, TriState> = {};
    for (const { key } of DEFAULT_FIELDS) {
      next[key] = toTri((settings as unknown as Record<string, boolean | null>)?.[key]);
    }
    setDefaults(next);
    setPlatformFeePct(settings?.platform_fee_pct != null ? String(settings.platform_fee_pct) : "");
    setPlatformFeeText(settings?.platform_fee_text ?? "");
    setRegulationText(settings?.regulation_text ?? "");
    setDonationFieldText(settings?.donation_field_text ?? "");
    setCodText(settings?.cod_text ?? "");
    setBeforeSunsetMinutes(
      settings?.before_sunset_minutes != null ? String(settings.before_sunset_minutes) : ""
    );
    setAfterSunsetMinutes(
      settings?.after_sunset_minutes != null ? String(settings.after_sunset_minutes) : ""
    );
    setHydrated(true);
  }

  const mutation = useMutation({
    mutationFn: () => {
      // Gap-audit item: old EventController::companyAutomaticConfigsSave
      // rejected before_sunset_time < 18 (standard candle-lighting floor,
      // also hebcal.com's own default) -- enforced at the DB level now
      // (company_settings_before_sunset_minimum), checked here too for a
      // clear message instead of a raw constraint-violation error.
      if (beforeSunsetMinutes !== "" && Number(beforeSunsetMinutes) < 18) {
        return Promise.reject(
          new Error("Candle-lighting minutes before sunset must be at least 18.")
        );
      }

      const patch: Record<string, boolean | number | string | null> = {
        platform_fee_pct: platformFeePct === "" ? null : Number(platformFeePct),
        platform_fee_text: platformFeeText || null,
        regulation_text: regulationText || null,
        donation_field_text: donationFieldText || null,
        cod_text: codText || null,
        before_sunset_minutes: beforeSunsetMinutes === "" ? null : Number(beforeSunsetMinutes),
        after_sunset_minutes: afterSunsetMinutes === "" ? null : Number(afterSunsetMinutes),
      };
      for (const { key } of DEFAULT_FIELDS) {
        patch[key] = defaults[key] === "inherit" ? null : defaults[key] === "on";
      }
      return updateCompanySettings(
        companyId,
        patch as Parameters<typeof updateCompanySettings>[1]
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companySettingsCache.key(companyId) });
      toast.success("Event defaults saved.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isPending) return <Skeleton className="h-96 w-full rounded-xl" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Event defaults</CardTitle>
        <CardDescription>
          These apply to every new event unless overridden on that event&apos;s own Advance
          settings. Leave &quot;Platform default&quot; to use the platform-wide setting.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-1">
            {DEFAULT_FIELDS.map(({ key, label }, i) => (
              <div key={key}>
                <div className="flex items-center justify-between gap-4 py-2">
                  <span className="text-sm">{label}</span>
                  <Select
                    value={defaults[key] ?? "inherit"}
                    onValueChange={(value) =>
                      setDefaults((prev) => ({ ...prev, [key]: value as TriState }))
                    }
                  >
                    <SelectTrigger size="sm" className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inherit">Platform default</SelectItem>
                      <SelectItem value="on">Yes</SelectItem>
                      <SelectItem value="off">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {i < DEFAULT_FIELDS.length - 1 && <div className="border-b" />}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 border-t pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="ed-fee-pct">Platform fee %</Label>
              <Input
                id="ed-fee-pct"
                type="number"
                min={0}
                max={100}
                step="0.01"
                placeholder="Use platform default"
                value={platformFeePct}
                onChange={(e) => setPlatformFeePct(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ed-fee-text">Platform fee text shown to guests</Label>
              <Input
                id="ed-fee-text"
                placeholder="e.g. Includes a 3% service fee"
                value={platformFeeText}
                onChange={(e) => setPlatformFeeText(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="ed-before">Candle-lighting minutes before sunset</Label>
              <Input
                id="ed-before"
                type="number"
                min={18}
                placeholder="Hebcal default (18)"
                value={beforeSunsetMinutes}
                onChange={(e) => setBeforeSunsetMinutes(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Minimum 18 minutes (standard candle-lighting floor).
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ed-after">Minutes after sunset (for second-event timing)</Label>
              <Input
                id="ed-after"
                type="number"
                placeholder="Optional"
                value={afterSunsetMinutes}
                onChange={(e) => setAfterSunsetMinutes(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3 border-t pt-4">
            <p className="text-xs font-medium text-muted-foreground">
              Text shown on the public booking page alongside the toggles above
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="ed-reg-text">Terms &amp; regulations text</Label>
              <Textarea
                id="ed-reg-text"
                rows={2}
                placeholder="I agree to the terms and conditions for this event."
                value={regulationText}
                onChange={(e) => setRegulationText(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ed-don-text">Donation field text</Label>
              <Textarea
                id="ed-don-text"
                rows={2}
                placeholder="Your donation helps support this event."
                value={donationFieldText}
                onChange={(e) => setDonationFieldText(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ed-cod-text">Cash payment instructions</Label>
              <Textarea
                id="ed-cod-text"
                rows={2}
                placeholder="Please bring exact cash to the event."
                value={codText}
                onChange={(e) => setCodText(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save event defaults"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function DonationCatalogForm({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [suggestedAmount, setSuggestedAmount] = useState("");
  const [allowCustom, setAllowCustom] = useState(true);

  const { data: templates, isPending } = useQuery({
    queryKey: donationTemplatesCache.listKey(companyId),
    queryFn: () => listDonationTemplates(companyId),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: donationTemplatesCache.listKey(companyId) });

  const createMutation = useMutation({
    mutationFn: createDonationTemplate,
    onSuccess: () => {
      invalidate();
      setTitle("");
      setSuggestedAmount("");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updateDonationTemplate(id, { is_active }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDonationTemplate,
    onSuccess: invalidate,
  });

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      company_id: companyId,
      title,
      suggested_amount: suggestedAmount ? Number(suggestedAmount) : null,
      allow_custom_amount: allowCustom,
      sort_order: templates?.length ?? 0,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Donation catalog</CardTitle>
        <CardDescription>
          Define donation fields once here, then add them to any event from the event&apos;s
          Donations page — no need to re-type them each time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPending && <Skeleton className="h-16 w-full rounded-lg" />}

        {templates && templates.length > 0 && (
          <div className="grid gap-2">
            {templates.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.suggested_amount ? `Suggested: $${t.suggested_amount}` : "No suggested amount"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActiveMutation.mutate({ id: t.id, is_active: !t.is_active })}
                  >
                    {t.is_active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(t.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAdd} className="flex items-end gap-2">
          <Input
            required
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1"
          />
          <Input
            type="number"
            min={0}
            step="0.01"
            placeholder="Suggested $"
            value={suggestedAmount}
            onChange={(e) => setSuggestedAmount(e.target.value)}
            className="w-28"
          />
          <Label htmlFor="dc-custom" className="flex items-center gap-1.5 whitespace-nowrap text-xs font-normal text-muted-foreground">
            <Checkbox
              id="dc-custom"
              checked={allowCustom}
              onCheckedChange={(checked) => setAllowCustom(checked === true)}
            />
            Custom amount
          </Label>
          <Button type="submit" disabled={createMutation.isPending}>
            <Plus />
            Add
          </Button>
        </form>
        {createMutation.error && (
          <p className="text-xs text-destructive">{(createMutation.error as Error).message}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function CompanySettingsClient() {
  const { data: profile } = useQuery({
    queryKey: profileCache.meKey,
    queryFn: getMyProfile,
  });

  const companyId = profile?.companies?.id ?? null;

  if (!companyId) {
    return <Skeleton className="h-96 max-w-2xl rounded-xl" />;
  }

  return (
    <div className="max-w-2xl">
      <Tabs defaultValue="profile">
        <TabsList className="mb-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="defaults">Event defaults</TabsTrigger>
          <TabsTrigger value="donations">Donations</TabsTrigger>
          <TabsTrigger value="design">Design</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <ProfileForm companyId={companyId} />
        </TabsContent>
        <TabsContent value="defaults">
          <EventDefaultsForm companyId={companyId} />
        </TabsContent>
        <TabsContent value="donations">
          <DonationCatalogForm companyId={companyId} />
        </TabsContent>
        <TabsContent value="design">
          <FrontPageDesignForm companyId={companyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
