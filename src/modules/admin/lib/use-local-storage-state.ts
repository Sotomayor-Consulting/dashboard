import { useEffect, useState } from 'react';

/**
 * useState que persiste el valor en `localStorage` bajo `key`.
 * SSR-safe: solo lee/escribe en client (after mount).
 */
export function useLocalStorageState<T>(
	key: string,
	initial: T,
): [T, (next: T | ((prev: T) => T)) => void] {
	const [value, setValue] = useState<T>(() => {
		if (typeof window === 'undefined') return initial;
		try {
			const raw = window.localStorage.getItem(key);
			return raw ? (JSON.parse(raw) as T) : initial;
		} catch {
			return initial;
		}
	});

	useEffect(() => {
		if (typeof window === 'undefined') return;
		try {
			window.localStorage.setItem(key, JSON.stringify(value));
		} catch {
			// quota / private mode → ignoramos
		}
	}, [key, value]);

	return [value, setValue];
}
