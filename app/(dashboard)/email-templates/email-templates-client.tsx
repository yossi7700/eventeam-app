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
  type EmailTemplateKind,
} from "@/lib/queries/email-templates";

const kindLabels: Record<EmailTemplateKind, string> = {
  registration_confirmation: "Registration Confirmation",
  thank_you: "Thank You",
  company_signup: "Company Signup",
  company_approved: "Company Approved",
  company_rejected: "Company Rejected",
};

function TemplateForm({
  companyId,
  kind,
  existing,
}: {
  companyId: string;
  kind: EmailTemplateKind;
  existing: EmailTemplate | undefined;
}) {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState(existing?.subject ?? "");
  const [bodyHtml, setBodyHtml] = useState(existing?.body_html ?? "");

  const saveMutation = useMutation({
    mutationFn: upsertEmailTemplate,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: emailTemplatesCache.listKey(companyId) }),
  });

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    saveMutation.mutate({ company_id: companyId, kind, subject, body_html: bodyHtml });
  }

  return (
    <form onSubmit={handleSave} className="space-y-3">
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
        placeholder="HTML body (supports variables like {{guest_name}}, {{event_title}})"
        value={bodyHtml}
        onChange={(e) => setBodyHtml(e.target.value)}
        className="w-full rounded-md border px-3 py-2 font-mono text-sm"
      />
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

  const [activeKind, setActiveKind] = useState<EmailTemplateKind>("registration_confirmation");

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
