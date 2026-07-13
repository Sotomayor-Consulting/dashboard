import { Icon } from '@iconify/react';

import type { AdminUserDetail } from '@modules/admin/lib/types';

const MAX_VISIBLE = 4;

/**
 * Sección de empresas vinculadas al usuario. Hasta 4 cards visibles;
 * el resto colapsado con un link "Ver las N restantes".
 */
export function UserDrawerCompanies({ user }: { user: AdminUserDetail }) {
	const visible = user.companies.slice(0, MAX_VISIBLE);
	const remaining = user.companies.length - visible.length;

	return (
		<section className="border-t border-gray-200 px-5 py-5 dark:border-gray-800">
			<p className="mb-3 text-[10px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
				Empresas vinculadas ({user.companies.length})
			</p>

			{user.companies.length === 0 ? (
				<div className="rounded-md border border-dashed border-gray-300 p-4 text-center text-[12px] text-gray-500 dark:border-gray-700 dark:text-gray-400">
					Este usuario aún no tiene empresas
				</div>
			) : (
				<div className="space-y-1.5">
					{visible.map((c) => (
						<a
							key={c.id}
							href={`/incorporations/${c.id}`}
							className="flex items-center gap-3 rounded-md border border-gray-200 px-3 py-2 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-neutral-900"
						>
							<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-neutral-800">
								<Icon
									icon="ri:building-2-line"
									className="h-4 w-4 text-gray-500 dark:text-gray-400"
								/>
							</div>
							<div className="min-w-0 flex-1">
								<p className="truncate text-[13px] font-medium text-gray-900 dark:text-gray-100">
									{c.name}
								</p>
								<p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
									{c.type ?? '—'} · {c.state ?? 'Sin estado'}
								</p>
							</div>
							<Icon
								icon="ri:arrow-right-s-line"
								className="h-4 w-4 text-gray-400"
							/>
						</a>
					))}
					{remaining > 0 && (
						<button
							type="button"
							className="mt-1 text-[11.5px] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
						>
							Ver las {remaining} restantes →
						</button>
					)}
				</div>
			)}
		</section>
	);
}
