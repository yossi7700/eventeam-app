"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

function ProfileForm({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();
  const { data: company, isPending } = useQuery({
    queryKey: companySettingsCache.companyKey(companyId),
    queryFn: () => getCompany(companyId),
  });

  const [name, setName] = useState(company?.name ?? "");
  const [contactEmail, setContactEmail] = useState(company?.contact_email ?? "");
  const [contactPhone, setContactPhone] = useState(company?.contact_phone ?? "");

  const mutation = useMutation({
    mutationFn: () =>
      updateCompany(companyId, {
        name,
        contact_email: contactEmail,
        contact_phone: contactPhone || null,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: companySettingsCache.companyKey(companyId) }),
  });

  if (isPending) return <div className="h-32 animate-pulse rounded-lg bg-gray-100" />;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="space-y-3 rounded-lg border p-4"
    >
      <h2 className="text-sm font-medium">Company profile</h2>
      <input
        required
        placeholder="Company name"
        defaultValue={company?.name ?? ""}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-md border px-3 py-2 text-sm"
      />
      <input
        required
        type="email"
        placeholder="Contact email"
        defaultValue={company?.contact_email ?? ""}
        onChange={(e) => setContactEmail(e.target.value)}
        className="w-full rounded-md border px-3 py-2 text-sm"
      />
      <input
        placeholder="Contact phone"
        defaultValue={company?.contact_phone ?? ""}
        onChange={(e) => setContactPhone(e.target.value)}
        className="w-full rounded-md border px-3 py-2 text-sm"
      />
      {mutation.error && (
        <p className="text-xs text-red-600">{(mutation.error as Error).message}</p>
      )}
      <button
        type="submit"
        disabled={mutation.isPending}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {mutation.isPending ? "Saving..." : "Save profile"}
      </button>
    </form>
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
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: companySettingsCache.key(companyId) }),
  });

  if (isPending) return <div className="h-64 animate-pulse rounded-lg bg-gray-100" />;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="space-y-3 rounded-lg border p-4"
    >
      <h2 className="text-sm font-medium">Public page design</h2>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-gray-500">
          Primary color
          <input
            type="color"
            defaultValue={settings?.primary_color ?? "#000000"}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border"
          />
        </label>
        <label className="text-xs text-gray-500">
          Secondary color
          <input
            type="color"
            defaultValue={settings?.secondary_color ?? "#ffffff"}
            onChange={(e) => setSecondaryColor(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border"
          />
        </label>
      </div>

      <input
        placeholder="Font family (e.g. Inter, sans-serif)"
        defaultValue={settings?.font_family ?? ""}
        onChange={(e) => setFontFamily(e.target.value)}
        className="w-full rounded-md border px-3 py-2 text-sm"
      />

      <textarea
        rows={3}
        placeholder="About text (shown on your public page)"
        defaultValue={settings?.about_text ?? ""}
        onChange={(e) => setAboutText(e.target.value)}
        className="w-full rounded-md border px-3 py-2 text-sm"
      />

      <div className="grid grid-cols-2 gap-3">
        <input
          placeholder="Facebook URL"
          defaultValue={settings?.facebook_url ?? ""}
          onChange={(e) => setFacebookUrl(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        />
        <input
          placeholder="Instagram URL"
          defaultValue={settings?.instagram_url ?? ""}
          onChange={(e) => setInstagramUrl(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        />
        <input
          placeholder="Twitter / X URL"
          defaultValue={settings?.twitter_url ?? ""}
          onChange={(e) => setTwitterUrl(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        />
        <input
          placeholder="YouTube URL"
          defaultValue={settings?.youtube_url ?? ""}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        />
        <input
          placeholder="Website URL"
          defaultValue={settings?.website_url ?? ""}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          className="col-span-2 rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <span className="text-xs font-medium text-gray-500">
          Registration flow step titles
        </span>
        <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-5">
          {stepTitles.map((title, i) => (
            <input
              key={i}
              placeholder={`Step ${i + 1}`}
              value={title}
              onChange={(e) =>
                setStepTitles((prev) => prev.map((t, j) => (j === i ? e.target.value : t)))
              }
              className="rounded-md border px-2 py-1.5 text-sm"
            />
          ))}
        </div>
      </div>

      <textarea
        rows={4}
        placeholder="Custom CSS (advanced, applied to your public page)"
        defaultValue={settings?.custom_css ?? ""}
        onChange={(e) => setCustomCss(e.target.value)}
        className="w-full rounded-md border px-3 py-2 font-mono text-xs"
      />

      {mutation.error && (
        <p className="text-xs text-red-600">{(mutation.error as Error).message}</p>
      )}
      <button
        type="submit"
        disabled={mutation.isPending}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {mutation.isPending ? "Saving..." : "Save design"}
      </button>
    </form>
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
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: companySettingsCache.key(companyId) }),
  });

  if (isPending) return <div className="h-64 animate-pulse rounded-lg bg-gray-100" />;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="space-y-3 rounded-lg border p-4"
    >
      <div>
        <h2 className="text-sm font-medium">Event defaults</h2>
        <p className="text-xs text-gray-500">
          These apply to every new event unless overridden on that event&apos;s own Advance
          settings. Leave &quot;Platform default&quot; to use the platform-wide setting.
        </p>
      </div>

      <div className="space-y-2">
        {DEFAULT_FIELDS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <span className="text-sm">{label}</span>
            <select
              value={defaults[key] ?? "inherit"}
              onChange={(e) =>
                setDefaults((prev) => ({ ...prev, [key]: e.target.value as TriState }))
              }
              className="rounded-md border px-2 py-1 text-sm"
            >
              <option value="inherit">Platform default</option>
              <option value="on">Yes</option>
              <option value="off">No</option>
            </select>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 border-t pt-3">
        <label className="text-xs text-gray-500">
          Platform fee %
          <input
            type="number"
            min={0}
            max={100}
            step="0.01"
            placeholder="Use platform default"
            value={platformFeePct}
            onChange={(e) => setPlatformFeePct(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs text-gray-500">
          Platform fee text shown to guests
          <input
            placeholder="e.g. Includes a 3% service fee"
            value={platformFeeText}
            onChange={(e) => setPlatformFeeText(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t pt-3">
        <label className="text-xs text-gray-500">
          Candle-lighting minutes before sunset
          <input
            type="number"
            placeholder="Hebcal default (18)"
            value={beforeSunsetMinutes}
            onChange={(e) => setBeforeSunsetMinutes(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs text-gray-500">
          Minutes after sunset (for second-event timing)
          <input
            type="number"
            placeholder="Optional"
            value={afterSunsetMinutes}
            onChange={(e) => setAfterSunsetMinutes(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="space-y-2 border-t pt-3">
        <p className="text-xs font-medium text-gray-500">
          Text shown on the public booking page alongside the toggles above
        </p>
        <label className="block text-xs text-gray-500">
          Terms &amp; regulations text (shown when &quot;Show terms &amp; regulations&quot; is
          on)
          <textarea
            rows={2}
            placeholder="I agree to the terms and conditions for this event."
            value={regulationText}
            onChange={(e) => setRegulationText(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs text-gray-500">
          Donation field text (shown when donations are enabled)
          <textarea
            rows={2}
            placeholder="Your donation helps support this event."
            value={donationFieldText}
            onChange={(e) => setDonationFieldText(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs text-gray-500">
          Cash payment instructions (shown when cash is selected)
          <textarea
            rows={2}
            placeholder="Please bring exact cash to the event."
            value={codText}
            onChange={(e) => setCodText(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </label>
      </div>

      {mutation.error && (
        <p className="text-xs text-red-600">{(mutation.error as Error).message}</p>
      )}
      <button
        type="submit"
        disabled={mutation.isPending}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {mutation.isPending ? "Saving..." : "Save event defaults"}
      </button>
    </form>
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
    <div className="space-y-3 rounded-lg border p-4">
      <div>
        <h2 className="text-sm font-medium">Donation catalog</h2>
        <p className="text-xs text-gray-500">
          Define donation fields once here, then add them to any event from the event&apos;s
          Donations page — no need to re-type them each time.
        </p>
      </div>

      {isPending && <div className="h-16 animate-pulse rounded-lg bg-gray-100" />}

      {templates && templates.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {templates.map((t) => (
            <li key={t.id} className="flex items-center justify-between px-3 py-2">
              <div>
                <p className="text-sm font-medium">{t.title}</p>
                <p className="text-xs text-gray-500">
                  {t.suggested_amount ? `Suggested: $${t.suggested_amount}` : "No suggested amount"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleActiveMutation.mutate({ id: t.id, is_active: !t.is_active })}
                  className="rounded-md border px-2 py-1 text-xs font-medium"
                >
                  {t.is_active ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(t.id)}
                  className="rounded-md border border-red-600 px-2 py-1 text-xs font-medium text-red-600"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex items-end gap-2">
        <input
          required
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 rounded-md border px-3 py-2 text-sm"
        />
        <input
          type="number"
          min={0}
          step="0.01"
          placeholder="Suggested $"
          value={suggestedAmount}
          onChange={(e) => setSuggestedAmount(e.target.value)}
          className="w-28 rounded-md border px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-1 whitespace-nowrap text-xs text-gray-500">
          <input
            type="checkbox"
            checked={allowCustom}
            onChange={(e) => setAllowCustom(e.target.checked)}
          />
          Custom amount
        </label>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Add
        </button>
      </form>
      {createMutation.error && (
        <p className="text-xs text-red-600">{(createMutation.error as Error).message}</p>
      )}
    </div>
  );
}

export function CompanySettingsClient() {
  const { data: profile } = useQuery({
    queryKey: profileCache.meKey,
    queryFn: getMyProfile,
  });

  const companyId = profile?.companies?.id ?? null;

  if (!companyId) {
    return <div className="h-32 animate-pulse rounded-lg bg-gray-100" />;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Company Settings</h1>
      <ProfileForm companyId={companyId} />
      <EventDefaultsForm companyId={companyId} />
      <DonationCatalogForm companyId={companyId} />
      <FrontPageDesignForm companyId={companyId} />
    </div>
  );
}
