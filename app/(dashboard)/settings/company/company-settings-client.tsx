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
  const [websiteUrl, setWebsiteUrl] = useState(settings?.website_url ?? "");
  const [customCss, setCustomCss] = useState(settings?.custom_css ?? "");

  const mutation = useMutation({
    mutationFn: () =>
      updateCompanySettings(companyId, {
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        font_family: fontFamily || null,
        about_text: aboutText || null,
        facebook_url: facebookUrl || null,
        instagram_url: instagramUrl || null,
        website_url: websiteUrl || null,
        custom_css: customCss || null,
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

      <div className="grid grid-cols-3 gap-3">
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
          placeholder="Website URL"
          defaultValue={settings?.website_url ?? ""}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        />
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
      <FrontPageDesignForm companyId={companyId} />
    </div>
  );
}
