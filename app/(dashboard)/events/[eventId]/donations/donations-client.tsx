"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addTemplateToEvent,
  createDonationField,
  deleteDonationField,
  donationFieldsCache,
  donationTemplatesCache,
  listDonationFields,
  listDonationTemplates,
  updateDonationField,
} from "@/lib/queries/donations";
import { getMyProfile, profileCache } from "@/lib/queries/profile";

export function DonationsClient({ eventId }: { eventId: string }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [suggestedAmount, setSuggestedAmount] = useState("");
  const [allowCustom, setAllowCustom] = useState(true);

  const { data: profile } = useQuery({
    queryKey: profileCache.meKey,
    queryFn: getMyProfile,
  });
  const companyId = profile?.companies?.id ?? null;

  const { data: fields, isPending, error } = useQuery({
    queryKey: donationFieldsCache.listKey(eventId),
    queryFn: () => listDonationFields(eventId),
  });

  const { data: templates } = useQuery({
    queryKey: companyId ? donationTemplatesCache.listKey(companyId) : ["donation_field_templates", "none"],
    queryFn: () => listDonationTemplates(companyId!),
    enabled: !!companyId,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: donationFieldsCache.listKey(eventId) });

  const createMutation = useMutation({
    mutationFn: createDonationField,
    onSuccess: () => {
      invalidate();
      setTitle("");
      setSuggestedAmount("");
    },
  });

  const addFromTemplateMutation = useMutation({
    mutationFn: (templateId: string) => {
      const template = templates?.find((t) => t.id === templateId);
      if (!template) throw new Error("Template not found");
      return addTemplateToEvent(eventId, template, fields?.length ?? 0);
    },
    onSuccess: invalidate,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updateDonationField(id, { is_active }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDonationField,
    onSuccess: invalidate,
  });

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      event_id: eventId,
      title,
      suggested_amount: suggestedAmount ? Number(suggestedAmount) : null,
      allow_custom_amount: allowCustom,
      sort_order: fields?.length ?? 0,
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Donation Fields</h1>

      {isPending && <div className="h-24 animate-pulse rounded-lg bg-gray-100" />}
      {error && <p className="text-sm text-red-600">{error.message}</p>}

      {fields && fields.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {fields.map((f) => (
            <li key={f.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium">{f.title}</p>
                <p className="text-sm text-gray-500">
                  {f.suggested_amount ? `Suggested: $${f.suggested_amount}` : "No suggested amount"}
                  {f.allow_custom_amount ? " · custom amount allowed" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    toggleActiveMutation.mutate({ id: f.id, is_active: !f.is_active })
                  }
                  className="rounded-md border px-3 py-1.5 text-xs font-medium"
                >
                  {f.is_active ? "Deactivate" : "Activate"}
                </button>
                <button
                  onClick={() => deleteMutation.mutate(f.id)}
                  className="rounded-md border border-red-600 px-3 py-1.5 text-xs font-medium text-red-600"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {templates && templates.length > 0 && (
        <div className="space-y-2 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Add from your donation catalog</h2>
            <Link href="/settings/company" className="text-xs text-gray-500 hover:text-black">
              Manage catalog
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {templates
              .filter((t) => !fields?.some((f) => f.template_id === t.id))
              .map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => addFromTemplateMutation.mutate(t.id)}
                  disabled={addFromTemplateMutation.isPending}
                  className="rounded-full border px-3 py-1 text-xs font-medium disabled:opacity-50"
                >
                  + {t.title}
                </button>
              ))}
          </div>
          {addFromTemplateMutation.error && (
            <p className="text-xs text-red-600">
              {(addFromTemplateMutation.error as Error).message}
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleAdd} className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Add a one-off donation field</h2>
        <input
          required
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            step="0.01"
            placeholder="Suggested amount (optional)"
            value={suggestedAmount}
            onChange={(e) => setSuggestedAmount(e.target.value)}
            className="flex-1 rounded-md border px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allowCustom}
              onChange={(e) => setAllowCustom(e.target.checked)}
            />
            Allow custom amount
          </label>
        </div>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Add
        </button>
      </form>
    </div>
  );
}
