const isNode = typeof window === 'undefined';
const windowObj = isNode ? { localStorage: new Map() } : window;
const storage = windowObj.localStorage;

const toSnakeCase = (str) => {
	return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
	if (isNode) {
		return defaultValue;
	}
	const storageKey = `base44_${toSnakeCase(paramName)}`;
	const urlParams = new URLSearchParams(window.location.search);
	const searchParam = urlParams.get(paramName);
	if (removeFromUrl) {
		urlParams.delete(paramName);
		const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""
			}${window.location.hash}`;
		window.history.replaceState({}, document.title, newUrl);
	}
	if (searchParam) {
		storage.setItem(storageKey, searchParam);
		return searchParam;
	}
	if (defaultValue) {
		storage.setItem(storageKey, defaultValue);
		return defaultValue;
	}
	const storedValue = storage.getItem(storageKey);
	if (storedValue) {
		return storedValue;
	}
	return null;
}

// Cookie helpers for cross-session persistence on mobile
const COOKIE_KEY = 'b44_access_token';
const COOKIE_DAYS = 30;

const setCookie = (value) => {
	if (isNode) return;
	const expires = new Date(Date.now() + COOKIE_DAYS * 864e5).toUTCString();
	document.cookie = `${COOKIE_KEY}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
};

const getCookie = () => {
	if (isNode) return null;
	const match = document.cookie.match(new RegExp('(?:^|; )' + COOKIE_KEY + '=([^;]*)'));
	return match ? decodeURIComponent(match[1]) : null;
};

const clearCookie = () => {
	if (isNode) return;
	document.cookie = `${COOKIE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
};

const getAppParams = () => {
	if (getAppParamValue("clear_access_token") === 'true') {
		storage.removeItem('base44_access_token');
		storage.removeItem('token');
		clearCookie();
	}

	// If token arrives via URL, persist it to cookie for mobile resilience
	const urlParams = new URLSearchParams(window.location.search);
	const urlToken = urlParams.get('access_token');
	if (urlToken) {
		setCookie(urlToken);
	}

	// If localStorage is empty but cookie has the token, restore it
	const storedToken = storage.getItem('base44_access_token');
	if (!storedToken) {
		const cookieToken = getCookie();
		if (cookieToken) {
			storage.setItem('base44_access_token', cookieToken);
		}
	} else {
		// Keep cookie in sync with localStorage
		setCookie(storedToken);
	}

	return {
		appId: getAppParamValue("app_id", { defaultValue: import.meta.env.VITE_BASE44_APP_ID }),
		token: getAppParamValue("access_token", { removeFromUrl: true }),
		fromUrl: getAppParamValue("from_url", { defaultValue: window.location.href }),
		functionsVersion: getAppParamValue("functions_version", { defaultValue: import.meta.env.VITE_BASE44_FUNCTIONS_VERSION }),
		appBaseUrl: getAppParamValue("app_base_url", { defaultValue: import.meta.env.VITE_BASE44_APP_BASE_URL }),
	}
}


export const appParams = {
	...getAppParams()
}