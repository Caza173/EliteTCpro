// AddendumAlertChecker is disabled — deadline notifications are now managed
// exclusively by the backend `deadlineEngine` scheduled function, which properly
// deduplicates and respects addendum_status state.
export default function AddendumAlertChecker() {
  return null;
}