import { clearAccessToken, getAccessToken, setAccessToken } from '@/lib/session';

const isNode = typeof window === 'undefined';

function removeQueryParam(paramName) {
  if (isNode) {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.delete(paramName);
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
}

function bootstrapTokenFromUrl() {
  if (isNode) {
    return null;
  }

  const url = new URL(window.location.href);
  if (url.searchParams.get('clear_access_token') === 'true') {
    clearAccessToken();
    removeQueryParam('clear_access_token');
  }

  const accessToken = url.searchParams.get('access_token');
  if (!accessToken) {
    return getAccessToken();
  }

  setAccessToken(accessToken);
  removeQueryParam('access_token');
  return accessToken;
}

export const appParams = {
  appId: null,
  token: bootstrapTokenFromUrl(),
  fromUrl: isNode ? '/' : window.location.href,
  functionsVersion: null,
  appBaseUrl: import.meta.env.VITE_API_BASE_URL || (isNode ? '' : window.location.origin),
};