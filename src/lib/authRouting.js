export function buildLoginPath(redirectTo = '/Dashboard') {
  const nextPath = typeof redirectTo === 'string' && redirectTo.length > 0 ? redirectTo : '/Dashboard';
  return `/TCSignIn?next=${encodeURIComponent(nextPath)}`;
}

export function redirectToLogin(redirectTo = '/Dashboard') {
  if (typeof window === 'undefined') {
    return;
  }

  window.location.href = buildLoginPath(redirectTo);
}