import { useCallback, useEffect, useRef } from 'react';

import { CLIENT_FORM_DRAFT_KEY } from '../constants';
import type { ClientFormData, SerializableClientFormData } from '../types';

/**
 * Quita los `File` del payload antes de serializar a localStorage.
 * Los uploads se vuelven a pedir si el usuario reabre el wizard.
 */
const toSerializable = (data: ClientFormData): SerializableClientFormData => ({
	...data,
	// `facturaServicioBasico` se omite (es File).
	// El cast siguiente está bien porque el tipo Serializable lo excluye.
	miembros: data.miembros.map(
		({ pasaporte: _p, facturaServicio: _f, ...rest }) => rest,
	),
	managers: data.managers.map(
		({ pasaporte: _p, facturaServicio: _f, ...rest }) => rest,
	),
});

/**
 * Hidrata `ClientFormData` desde el draft serializado, dejando los `File`
 * en null (no son persistibles).
 */
const fromSerializable = (
	stored: SerializableClientFormData,
): ClientFormData => ({
	...stored,
	// La pregunta sí/no/sci ya no existe: drafts viejos se normalizan a 'si'
	// para no validar campos que ya no se renderizan.
	direccionOperativaEEUU: 'si',
	facturaServicioBasico: null,
	facturaServicioBasicoEEUU: null,
	// Defaults para drafts guardados antes de añadir el shape de dirección
	// unificado. Sin esto los `undefined` rompen Zod / la UI al rehidratar.
	linea2: stored.linea2 ?? '',
	miembros: stored.miembros.map((m) => ({
		...m,
		tipoIdentificacionFiscal: m.tipoIdentificacionFiscal ?? '',
		sitioWeb: m.sitioWeb ?? '',
		linea2: m.linea2 ?? '',
		ciudad: m.ciudad ?? '',
		estado: m.estado ?? '',
		condado: m.condado ?? '',
		codigoPostal: m.codigoPostal ?? '',
		pasaporte: null,
		facturaServicio: null,
	})),
	managers: stored.managers.map((m) => ({
		...m,
		linea2: m.linea2 ?? '',
		ciudad: m.ciudad ?? '',
		estado: m.estado ?? '',
		condado: m.condado ?? '',
		codigoPostal: m.codigoPostal ?? '',
		pasaporte: null,
		facturaServicio: null,
	})),
});

export interface UseLocalStorageDraftOptions {
	/** Key opcional para particionar drafts por empresa/usuario. */
	key?: string;
	/** ms entre escrituras a localStorage. */
	debounceMs?: number;
}

export interface UseLocalStorageDraftApi {
	loadDraft: () => ClientFormData | null;
	saveDraft: (data: ClientFormData) => void;
	clearDraft: () => void;
}

export function useLocalStorageDraft({
	key = CLIENT_FORM_DRAFT_KEY,
	debounceMs = 400,
}: UseLocalStorageDraftOptions = {}): UseLocalStorageDraftApi {
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const loadDraft = useCallback((): ClientFormData | null => {
		if (typeof window === 'undefined') return null;
		try {
			const raw = window.localStorage.getItem(key);
			if (!raw) return null;
			const parsed = JSON.parse(raw) as SerializableClientFormData;
			return fromSerializable(parsed);
		} catch (e) {
			console.warn('No se pudo cargar el draft del formulario:', e);
			return null;
		}
	}, [key]);

	const saveDraft = useCallback(
		(data: ClientFormData) => {
			if (typeof window === 'undefined') return;
			if (timerRef.current) clearTimeout(timerRef.current);
			timerRef.current = setTimeout(() => {
				try {
					const payload = toSerializable(data);
					window.localStorage.setItem(key, JSON.stringify(payload));
				} catch (e) {
					console.warn('No se pudo guardar el draft del formulario:', e);
				}
			}, debounceMs);
		},
		[key, debounceMs],
	);

	const clearDraft = useCallback(() => {
		if (typeof window === 'undefined') return;
		window.localStorage.removeItem(key);
	}, [key]);

	useEffect(() => {
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, []);

	return { loadDraft, saveDraft, clearDraft };
}
