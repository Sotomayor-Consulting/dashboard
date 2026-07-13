import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('domain:beta-feedback');

export interface BetaFeedbackRow {
	id: string;
	user_id: string | null;
	rating: number | null;
	category: 'bug' | 'sugerencia' | 'ux' | 'general';
	message: string;
	page_url: string | null;
	user_agent: string | null;
	metadata: Record<string, unknown>;
	created_at: string;
	user_name: string | null;
	user_email: string | null;
}

interface FeedbackRaw {
	id: string;
	user_id: string | null;
	rating: number | null;
	category: BetaFeedbackRow['category'];
	message: string;
	page_url: string | null;
	user_agent: string | null;
	metadata: Record<string, unknown> | null;
	created_at: string;
}

interface UsuarioLite {
	user_id: string;
	nombre: string | null;
	apellido: string | null;
	correo: string | null;
}

export const getBetaFeedbackList = async (
	supabase: SupabaseClient,
): Promise<BetaFeedbackRow[]> => {
	const { data, error } = await supabase
		.from('beta_feedback')
		.select(
			'id, user_id, rating, category, message, page_url, user_agent, metadata, created_at',
		)
		.order('created_at', { ascending: false })
		.limit(500);

	if (error) {
		log.error('feedback select failed', { err: error });
		return [];
	}
	const rows = (data ?? []) as FeedbackRaw[];
	if (rows.length === 0) return [];

	const userIds = Array.from(
		new Set(rows.map((r) => r.user_id).filter((v): v is string => !!v)),
	);

	const usersById = new Map<string, UsuarioLite>();
	if (userIds.length > 0) {
		const { data: users, error: usersErr } = await supabase
			.from('usuarios')
			.select('user_id, nombre, apellido, correo')
			.in('user_id', userIds);
		if (usersErr) {
			log.error('usuarios lookup failed', { err: usersErr });
		} else {
			for (const u of (users ?? []) as UsuarioLite[]) {
				usersById.set(u.user_id, u);
			}
		}
	}

	return rows.map((r) => {
		const u = r.user_id ? usersById.get(r.user_id) : undefined;
		const fullName = `${u?.nombre ?? ''} ${u?.apellido ?? ''}`.trim();
		return {
			id: r.id,
			user_id: r.user_id,
			rating: r.rating,
			category: r.category,
			message: r.message,
			page_url: r.page_url,
			user_agent: r.user_agent,
			metadata: r.metadata ?? {},
			created_at: r.created_at,
			user_name: fullName || null,
			user_email: u?.correo ?? null,
		};
	});
};
