import * as React from 'react';
import type { MemberItem } from '../types';

interface UseMembersSearchOptions {
	debounceMs?: number;
	limit?: number;
}

interface UseMembersSearchResult {
	query: string;
	setQuery: (value: string) => void;
	results: MemberItem[];
	isLoading: boolean;
	error: string | null;
	refetch: () => Promise<void>;
}

/**
 * Búsqueda debounced contra /api/members?q= para el combobox de personas.
 */
export function useMembersSearch(
	options: UseMembersSearchOptions = {},
): UseMembersSearchResult {
	const { debounceMs = 300, limit = 20 } = options;

	const [query, setQuery] = React.useState('');
	const [results, setResults] = React.useState<MemberItem[]>([]);
	const [isLoading, setIsLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	const abortRef = React.useRef<AbortController | null>(null);

	const fetchResults = React.useCallback(
		async (term: string) => {
			abortRef.current?.abort();
			const controller = new AbortController();
			abortRef.current = controller;

			setIsLoading(true);
			setError(null);
			try {
				const url = new URL('/api/members', window.location.origin);
				url.searchParams.set('q', term);
				url.searchParams.set('limit', String(limit));
				const response = await fetch(url, {
					credentials: 'include',
					signal: controller.signal,
				});
				const payload = await response.json().catch(() => null);
				if (!response.ok || !payload?.ok) {
					throw new Error(payload?.error ?? 'No se pudo buscar personas');
				}
				setResults(payload.data as MemberItem[]);
			} catch (err) {
				if ((err as { name?: string }).name === 'AbortError') return;
				setError(err instanceof Error ? err.message : 'Error inesperado');
				setResults([]);
			} finally {
				setIsLoading(false);
			}
		},
		[limit],
	);

	React.useEffect(() => {
		const handle = window.setTimeout(() => {
			void fetchResults(query);
		}, debounceMs);
		return () => window.clearTimeout(handle);
	}, [query, debounceMs, fetchResults]);

	return {
		query,
		setQuery,
		results,
		isLoading,
		error,
		refetch: () => fetchResults(query),
	};
}
