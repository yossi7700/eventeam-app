// Holds the in-progress registration form state between the /register and
// /register/payment steps. sessionStorage is sufficient here -- this is
// throwaway client-side state for a single booking flow, not something
// that needs to survive across devices or sessions.

export type DraftLineItem = {
  sub_event_id: string;
  product_id: string;
  quantity: number;
};

export type DraftGuest = {
  full_name: string;
  email?: string;
  phone?: string;
  line_items: DraftLineItem[];
};

export type DraftDonation = {
  donation_field_id?: string;
  amount: number;
};

export type RegistrationDraft = {
  event_id: string;
  primary_guest_name: string;
  primary_guest_email: string;
  primary_guest_phone?: string;
  payment_method: "card" | "cash";
  guests: DraftGuest[];
  donations: DraftDonation[];
};

const KEY = "eventeam:registration-draft";

export function saveRegistrationDraft(draft: RegistrationDraft) {
  sessionStorage.setItem(KEY, JSON.stringify(draft));
}

export function loadRegistrationDraft(): RegistrationDraft | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RegistrationDraft;
  } catch {
    return null;
  }
}

export function clearRegistrationDraft() {
  sessionStorage.removeItem(KEY);
}
