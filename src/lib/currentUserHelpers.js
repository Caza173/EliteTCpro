/**
 * currentUserHelpers
 * ------------------
 * Utility functions for subsystems that need to read the CurrentUser
 * for audit logging, email defaults, and transaction auto-assignment.
 *
 * Import and call these inside components/functions that already have
 * access to the currentUser object from useCurrentUser().
 */

/**
 * Returns audit metadata — attach to every write operation.
 * @param {object} currentUser — from useCurrentUser().currentUser
 */
export function getAuditMeta(currentUser) {
  return {
    performed_by: currentUser?.id || '',
    performed_by_email: currentUser?.email || '',
    performed_by_name: currentUser?.profile?.full_name || currentUser?.email || '',
    brokerage_id: currentUser?.brokerage_id || '',
  };
}

/**
 * Returns default email-from context for the EmailComposerModal / sendGmailEmail.
 * @param {object} currentUser — from useCurrentUser().currentUser
 */
export function getEmailSenderContext(currentUser) {
  if (!currentUser) return {};
  const { profile } = currentUser;
  return {
    from_email: profile.email,
    senderName: profile.signature.name,
    senderRole: profile.signature.role,
    companyName: profile.signature.company,
    phoneNumber: profile.signature.phone,
    fromName: profile.signature.name,
  };
}

/**
 * Returns default transaction TC assignment fields.
 * @param {object} currentUser — from useCurrentUser().currentUser
 */
export function getTransactionTCDefaults(currentUser) {
  if (!currentUser) return {};
  return {
    assigned_tc_id: currentUser.id,
    agent_email: currentUser.email,
  };
}

/**
 * Returns context string for AI prompts so the AI knows who is operating.
 * @param {object} currentUser — from useCurrentUser().currentUser
 */
export function getAIUserContext(currentUser) {
  if (!currentUser) return '';
  const { profile } = currentUser;
  return [
    `The TC/agent using this system is: ${profile.full_name} (${profile.email}).`,
    profile.company_name ? `Their brokerage/company is: ${profile.company_name}.` : '',
    profile.signature.role ? `Their role is: ${profile.signature.role}.` : '',
  ].filter(Boolean).join(' ');
}

/**
 * Guard: returns true if the user profile has the minimum fields to operate.
 * Use this to gate critical actions.
 * @param {object} currentUser — from useCurrentUser().currentUser
 */
export function canPerformActions(currentUser) {
  if (!currentUser) return false;
  return currentUser.profile_completed === true;
}