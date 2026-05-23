import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			// Prevent stale data from a prior account session leaking into a new session
			gcTime: 5 * 60 * 1000, // 5 minutes
			staleTime: 30_000,
		},
	},
});

/**
 * Call this on logout or user switch to wipe all cached query data.
 * Prevents cross-account data bleed when sessions change.
 */
export function clearQueryCacheOnLogout() {
	queryClientInstance.clear();
}