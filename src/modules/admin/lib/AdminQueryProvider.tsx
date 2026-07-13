import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

/**
 * Provider de TanStack Query para islands del panel admin.
 * Cada island monta su propio QueryClient (los islands de Astro están
 * aislados entre sí; no comparten cache, lo cual es correcto en SSR-first).
 */
export function AdminQueryProvider({ children }: { children: ReactNode }) {
	const [client] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 30_000,
						refetchOnWindowFocus: false,
						retry: 1,
					},
				},
			}),
	);

	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
