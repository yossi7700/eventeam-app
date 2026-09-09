"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyProfile, profileCache } from "@/lib/queries/profile";
import {
  EMAIL_TEMPLATE_KINDS,
  emailTemplatesCache,
  listEmailTemplates,
  upsertEmailTemplate,
  type EmailTemplate,
} from "@/lib/queries/email-templates";

const kindLabels: Record<(typeof EMAIL_TEMPLATE_KINDS)[number], string> = {
  registration_confirmation: "Registration Confirmation",
  thank_you: "Thank You",
  company_signup: "Company Signup",
  company_approved: "Company Approved",
  company_rejected: "Company Rejected",
};

// The exact variables each kind is actually sent with, taken from every
// invokeEmailFunction call site (register-guest, stripe-webhook,
// approve-company, request-otp's thank-you cron) -- not a guessed/aspirational
// list. A variable not in this list for a given kind will render literally
// as "{{whatever}}" rather than being replaced.
const kindVariables: Record<(typeof EMAIL_TEMPLATE_KINDS)[number], string[]> = {
  registration_confirmation: ["guest_name", "event_title", "total_amount", "currency"],
  thank_you: ["guest_name", "event_title"],
  company_signup: ["company_name"],
  company_approved: ["company_name"],
  company_rejected: ["company_name", "rejected_reason"],
};

function TemplateForm({
  companyId,
  kind,
  existing,
}: {
  companyId: string;
  kind: (typeof EMAIL_TEMPLATE_KINDS)[number];
  existing: EmailTemplate | undefined;
}) {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState(existing?.subject ?? "");
  const [bodyHtml, setBodyHtml] = useState(existing?.body_html ?? "");
  const [ccEmails, setCcEmails] = useState((existing?.cc_emails ?? []).join(", "));

  const saveMutation = useMutation({
    mutationFn: upsertEmailTemplate,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: emailTemplatesCache.listKey(companyId) }),
  });

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const cc_emails = ccEmails
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);
    saveMutation.mutate({ company_id: companyId, kind, subject, body_html: bodyHtml, cc_emails });
  }

  const variables = kindVariables[kind];

  return (
    <form onSubmit={handleSave} className="space-y-3">
      <p className="text-xs text-gray-500">
        Available variables for this email:{" "}
        {variables.map((v) => (
          <code key={v} className="mr-1 rounded bg-gray-100 px-1 py-0.5">
            {`{{${v}}}`}
          </code>
        ))}
      </p>
      <input
        required
        placeholder="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        className="w-full rounded-md border px-3 py-2"
      />
      <textarea
        required
        rows={12}
        placeholder="HTML body"
        value={bodyHtml}
        onChange={(e) => setBodyHtml(e.target.value)}
        className="w-full rounded-md border px-3 py-2 font-mono text-sm"
      />
      <label className="block text-xs text-gray-500">
        CC additional recipients (comma-separated) on every email of this type
        <input
          placeholder="manager@example.com, office@example.com"
          value={ccEmails}
          onChange={(e) => setCcEmails(e.target.value)}
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
        />
      </label>
      {saveMutation.error && (
        <p className="text-sm text-red-600">{(saveMutation.error as Error).message}</p>
      )}
      <button
        type="submit"
        disabled={saveMutation.isPending}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saveMutation.isPending ? "Saving..." : "Save Template"}
      </button>
    </form>
  );
}

export function EmailTemplatesClient() {
  const { data: profile } = useQuery({
    queryKey: profileCache.meKey,
    queryFn: getMyProfile,
  });
  const companyId = profile?.companies?.id ?? null;

  const { data: templates, isPending, error } = useQuery({
    queryKey: emailTemplatesCache.listKey(companyId),
    queryFn: () => listEmailTemplates(companyId!),
    enabled: !!companyId,
  });

  const [activeKind, setActiveKind] = useState<(typeof EMAIL_TEMPLATE_KINDS)[number]>(
    "registration_confirmation"
  );

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Email Templates</h1>

      <div className="flex flex-wrap gap-2">
        {EMAIL_TEMPLATE_KINDS.map((kind) => (
          <button
            key={kind}
            onClick={() => setActiveKind(kind)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              activeKind === kind ? "bg-black text-white" : "border"
            }`}
          >
            {kindLabels[kind]}
          </button>
        ))}
      </div>

      {isPending && <div className="h-64 animate-pulse rounded-lg bg-gray-100" />}
      {error && <p className="text-sm text-red-600">{error.message}</p>}

      {companyId && templates && (
        <TemplateForm
          // Remounts the form (with fresh initial state) whenever the
          // selected kind or the loaded templates change, rather than an
          // effect reaching back to imperatively resync state.
          key={activeKind}
          companyId={companyId}
          kind={activeKind}
          existing={templates.find((t) => t.kind === activeKind)}
        />
      )}
    </div>
  );
}
