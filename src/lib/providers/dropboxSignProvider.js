// Dropbox Sign provider — browser-safe client helper
// All actual API calls are made from backend functions (createSignatureRequest, etc.)
// This file provides constants and utilities for the frontend.

export const DROPBOX_SIGN_BASE_URL = "https://api.hellosign.com/v3";

export const PROVIDER_NAME = "dropbox_sign";

export const ROLE_TO_SIGNER_INDEX = {
  buyer: 1,
  seller: 3,
  agent: 5,
  attorney: 6,
  lender: 7,
  title: 8,
  other: 9,
};

export const STATUS_LABELS = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  partially_signed: "Partially Signed",
  completed: "Completed",
  declined: "Declined",
  expired: "Expired",
  cancelled: "Cancelled",
  error: "Error",
};

export function getStatusColor(status) {
  const map = {
    draft: "bg-slate-100 text-slate-500",
    sent: "bg-blue-50 text-blue-600",
    viewed: "bg-indigo-50 text-indigo-600",
    partially_signed: "bg-amber-50 text-amber-600",
    completed: "bg-emerald-50 text-emerald-700",
    declined: "bg-red-50 text-red-600",
    expired: "bg-orange-50 text-orange-600",
    cancelled: "bg-slate-100 text-slate-400",
    error: "bg-red-50 text-red-600",
  };
  return map[status] || map.draft;
}