export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { safeBack } from '@infrastructure/security/headers';
import { ACTIVE_COMPANY_COOKIE } from '@shared/cookies';
import { clearIncorporationDraftCookie } from '@shared/incorporation-draft';

const BACK_PATH = '/';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * `incorporations.state` es el enum `incorporation_state` (draft|active|upgrade).
 * Los drafts guardados en clientes viejos aún pueden traer los valores legacy
 * en español — se normalizan aquí para no romper el insert.
 */
const normalizeIncorporationState = (
	value: string | undefined,
): 'draft' | 'active' | 'upgrade' => {
	switch (value?.trim()) {
		case 'active':
		case 'Activo':
			return 'active';
		case 'upgrade':
		case 'Upgrade':
			return 'upgrade';
		default:
			return 'draft';
	}
};

const json = (status: number, payload: unknown) =>
	new Response(JSON.stringify(payload), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

const isJsonRequest = (request: Request) =>
	(request.headers.get('accept') ?? '').includes('application/json');

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	try {
		const back = safeBack(url.searchParams.get('back'), BACK_PATH);
		const wantsJson = isJsonRequest(request);
		const respond = (
			status: number,
			message: string,
			extra: Record<string, unknown> = {},
		) => {
			if (wantsJson) {
				return json(status, { ok: status < 400, message, ...extra });
			}

			const kind = status < 400 ? 'success' : 'error';
			return redirect(
				`${back}?status=${kind}&msg=${encodeURIComponent(message)}`,
			);
		};

		// 1) Cliente Supabase SSR
		const supabase = createSupabaseServerClient({
			headers: request.headers,
			cookies,
		});

		// 2) Usuario
		const {
			data: { user: actor },
			error: uerr,
		} = await supabase.auth.getUser();
		if (uerr || !actor) {
			return respond(401, 'No autenticado');
		}

		// 3) Form data
		const form = await request.formData();
		const tipo_de_empresa = form.get('tipo_de_empresa')?.toString();
		const estado_de_empresa = form.get('estado_de_empresa')?.toString();
		const nombre_1 = form.get('nombre_1')?.toString() || '';
		const nombre_2 = form.get('nombre_2')?.toString() || '';
		const nombre_3 = form.get('nombre_3')?.toString() || '';
		const estado_de = form.get('estado_de')?.toString();

		// 4) Validaciones - CORREGIDAS
		if (!tipo_de_empresa) {
			return respond(400, 'El tipo de empresa es obligatorio');
		}
		if (!estado_de_empresa) {
			return respond(400, 'El estado de incorporación es obligatorio');
		}

		// Validar que al menos un nombre no esté vacío - CORREGIDO
		const nombres = [nombre_1, nombre_2, nombre_3];
		const alMenosUnNombre = nombres.some(
			(nombre) => nombre && nombre.trim() !== '',
		);
		if (!alMenosUnNombre) {
			return respond(400, 'Al menos un nombre de empresa es obligatorio');
		}

		let formationStateId: number | null = null;
		const normalizedState = estado_de_empresa.trim();
		const parsedStateId = Number(normalizedState);
		if (Number.isInteger(parsedStateId) && parsedStateId > 0) {
			formationStateId = parsedStateId;
		} else {
			const { data: stateRow, error: stateError } = await supabase
				.from('states')
				.select('id')
				.eq('name', normalizedState)
				.maybeSingle<{ id: number }>();

			if (stateError) {
				return respond(500, `DB: ${stateError.message}`);
			}

			if (!stateRow) {
				return respond(400, 'El estado de incorporación seleccionado no existe');
			}

			formationStateId = stateRow.id;
		}

		// 5) Insert
		const { data: created, error } = await supabase
			.from('incorporations')
			.insert([
			{
				user_id: actor.id,
				entity_type: tipo_de_empresa,
				principal_name: nombre_1.trim() || null,
				possible_names: [
					...new Set(nombres.map((n) => n.trim()).filter(Boolean)),
				],
				formation_state_id: formationStateId,
				state: normalizeIncorporationState(estado_de),
				porcentaje_de_incorporacion: 1,
			},
		])
			.select('id')
			.single<{ id: string }>();

		if (error) {
			return respond(500, `DB: ${error.message}`);
		}

		if (created?.id) {
			cookies.set(ACTIVE_COMPANY_COOKIE, created.id, {
				path: '/',
				sameSite: 'lax',
				httpOnly: false,
				secure: import.meta.env.PROD,
				maxAge: ONE_YEAR_SECONDS,
			});
		}

		clearIncorporationDraftCookie(cookies);

		// 6) OK
		return respond(200, 'Empresa registrada', {
			incorporationId: created?.id ?? null,
			redirectTo: BACK_PATH,
		});
	} catch (e: any) {
		const msg = typeof e?.message === 'string' ? e.message : 'Error inesperado';
		if (isJsonRequest(request)) {
			return json(500, { ok: false, message: msg });
		}
		return redirect(`${BACK_PATH}?status=error&msg=${encodeURIComponent(msg)}`);
	}
};
