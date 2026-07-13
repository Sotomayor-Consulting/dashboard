import type { AstroCookies } from 'astro';

export const INCORPORATION_DRAFT_COOKIE = 'incorporation_start_draft';

const DRAFT_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export const START_DRAFT_DEFAULT = {
	tipo_de_empresa: 'LLC',
	estado_de_empresa: 12,
	nombre_1: '',
	nombre_2: '',
	nombre_3: '',
	estado_de: 'draft',
	current_step: 0,
} as const;

export interface IncorporationStartDraft {
	tipo_de_empresa: string;
	estado_de_empresa: number;
	nombre_1: string;
	nombre_2: string;
	nombre_3: string;
	estado_de: string;
	current_step: number;
}

function toNonEmptyString(value: unknown, fallback: string): string {
	if (typeof value !== 'string') return fallback;
	const trimmed = value.trim();
	return trimmed || fallback;
}

function toStep(value: unknown): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
	return Math.max(0, Math.min(3, Math.trunc(value)));
}

function toStateId(value: unknown): number {
	if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
		return Math.trunc(value);
	}

	if (typeof value === 'string') {
		const parsed = Number(value);
		if (Number.isFinite(parsed) && parsed > 0) {
			return Math.trunc(parsed);
		}
	}

	return START_DRAFT_DEFAULT.estado_de_empresa;
}

export function normalizeIncorporationDraft(
	value: unknown,
): IncorporationStartDraft {
	const source = value && typeof value === 'object' ? value : {};
	const draft = source as Record<string, unknown>;

	return {
		tipo_de_empresa: toNonEmptyString(
			draft.tipo_de_empresa,
			START_DRAFT_DEFAULT.tipo_de_empresa,
		),
		estado_de_empresa: toStateId(draft.estado_de_empresa),
		nombre_1:
			typeof draft.nombre_1 === 'string' ? draft.nombre_1.trim() : '',
		nombre_2:
			typeof draft.nombre_2 === 'string' ? draft.nombre_2.trim() : '',
		nombre_3:
			typeof draft.nombre_3 === 'string' ? draft.nombre_3.trim() : '',
		estado_de: toNonEmptyString(
			draft.estado_de,
			START_DRAFT_DEFAULT.estado_de,
		),
		current_step: toStep(draft.current_step),
	};
}

export function readIncorporationDraftCookie(
	cookies: AstroCookies,
): IncorporationStartDraft {
	const raw = cookies.get(INCORPORATION_DRAFT_COOKIE)?.value;
	if (!raw) return { ...START_DRAFT_DEFAULT };

	try {
		return normalizeIncorporationDraft(JSON.parse(decodeURIComponent(raw)));
	} catch {
		return { ...START_DRAFT_DEFAULT };
	}
}

export function writeIncorporationDraftCookie(
	cookies: AstroCookies,
	draft: IncorporationStartDraft,
) {
	cookies.set(
		INCORPORATION_DRAFT_COOKIE,
		encodeURIComponent(JSON.stringify(normalizeIncorporationDraft(draft))),
		{
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: import.meta.env.PROD,
			maxAge: DRAFT_MAX_AGE_SECONDS,
		},
	);
}

export function clearIncorporationDraftCookie(cookies: AstroCookies) {
	cookies.set(INCORPORATION_DRAFT_COOKIE, '', {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: import.meta.env.PROD,
		maxAge: 0,
	});
}
