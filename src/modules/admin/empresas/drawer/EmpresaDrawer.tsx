import { Icon } from '@iconify/react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from '@components/ui/Button';
import { Sheet, SheetContent } from '@components/ui/Sheet';
import { Skeleton } from '@components/ui/Skeleton';

import type { AdminEmpresaDetail } from '@modules/admin/lib/empresa-types';
import { InitialsAvatar } from '@modules/admin/usuarios/cells/InitialsAvatar';
import {
	EntityTypeBadge,
	LegalStatusBadge,
} from '../cells/EntityBadge';

interface Props {
	empresaId: string | null;
	onClose: () => void;
}

async function fetchEmpresa(id: string): Promise<AdminEmpresaDetail> {
	const res = await fetch(`/api/admin/empresas/${id}`);
	if (!res.ok) throw new Error('No se pudo cargar la empresa');
	return res.json() as Promise<AdminEmpresaDetail>;
}

export function EmpresaDrawer({ empresaId, onClose }: Props) {
	const open = empresaId !== null;

	const { data, isLoading, isError } = useQuery({
		queryKey: ['admin', 'empresa-legal', empresaId],
		queryFn: () => fetchEmpresa(empresaId!),
		enabled: open,
	});

	return (
		<Sheet
			open={open}
			modal={false}
			onOpenChange={(o) => {
				if (!o) onClose();
			}}
		>
			<SheetContent
				side="right"
				className="!w-full overflow-y-auto !p-0 sm:!max-w-[420px]"
				showCloseButton={true}
			>
				{isLoading && (
					<div className="space-y-4 p-5">
						<Skeleton className="h-12 w-full" />
						<Skeleton className="h-20 w-full" />
						<Skeleton className="h-32 w-full" />
					</div>
				)}

				{isError && (
					<div className="p-5 text-sm text-red-600">
						No se pudo cargar la empresa.
					</div>
				)}

				{data && (
					<>
						{/* Header */}
						<div className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
							<div className="flex items-center gap-2">
								<LegalStatusBadge status={data.legalStatus} />
								<EntityTypeBadge type={data.entityType} />
							</div>
							<div className="mt-3 flex items-center gap-3">
								<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-neutral-800">
									<Icon
										icon="ri:building-2-line"
										className="h-5 w-5 text-gray-500 dark:text-gray-400"
									/>
								</div>
								<div className="min-w-0">
									<p className="truncate text-[16px] font-semibold text-gray-900 dark:text-gray-100">
										{data.legalName}
									</p>
									<p className="mt-0.5 text-[11.5px] text-gray-500 dark:text-gray-400">
										{data.formationState ?? 'Sin estado'} ·{' '}
										{data.incorporationDate
											? format(new Date(data.incorporationDate), 'dd MMM yyyy', {
													locale: es,
												})
											: 'Sin fecha'}
									</p>
								</div>
							</div>
						</div>

						{/* Datos legales */}
						<section className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
							<p className="mb-3 text-[10px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
								Datos legales
							</p>
							<dl className="grid grid-cols-2 gap-3 text-[12px]">
								<KV label="EIN" value={data.ein} mono />
								<KV label="Filing #" value={data.filingNumber} mono />
								<KV label="Clasificación fiscal" value={data.taxClassification} />
								<KV label="Tipo de gestión" value={data.managementType} />
								<KV
									label="Ingreso fuente US"
									value={data.usSourceIncome ? 'Sí' : 'No'}
								/>
							</dl>
						</section>

						{/* Owner */}
						{data.owner && (
							<section className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
								<p className="mb-3 text-[10px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
									Owner
								</p>
								<div className="flex items-center gap-3">
									{data.owner.avatarUrl ? (
										<img
											src={data.owner.avatarUrl}
											alt={data.owner.name}
											className="h-8 w-8 rounded-full"
										/>
									) : (
										<InitialsAvatar
											name={data.owner.name}
											seed={data.owner.email || data.owner.id}
											size={32}
										/>
									)}
									<div className="min-w-0">
										<p className="truncate text-[13px] font-medium text-gray-900 dark:text-gray-100">
											{data.owner.name}
										</p>
										<p className="truncate text-[11.5px] text-gray-500 dark:text-gray-400">
											{data.owner.email}
										</p>
									</div>
								</div>
							</section>
						)}

						{/* Miembros */}
						{data.members.length > 0 && (
							<section className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
								<p className="mb-3 text-[10px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
									Miembros ({data.members.length})
								</p>
								<div className="space-y-1.5">
									{data.members.map((m) => (
										<div
											key={m.id}
											className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 dark:border-gray-800"
										>
											<div className="min-w-0">
												<p className="truncate text-[12.5px] font-medium text-gray-900 dark:text-gray-100">
													{m.fullName}
												</p>
												{m.email && (
													<p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
														{m.email}
													</p>
												)}
											</div>
											<div className="flex shrink-0 items-center gap-2">
												{m.isManager && (
													<span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
														Manager
													</span>
												)}
												{m.percentage !== null && (
													<span className="font-mono text-[11.5px] tabular-nums text-gray-600 dark:text-gray-300">
														{m.percentage}%
													</span>
												)}
											</div>
										</div>
									))}
								</div>
							</section>
						)}

						{/* Direcciones */}
						{data.addresses.length > 0 && (
							<section className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
								<p className="mb-3 text-[10px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
									Direcciones
								</p>
								<div className="space-y-1.5">
									{data.addresses.map((a) => (
										<div
											key={a.id}
											className="rounded-md border border-gray-200 px-3 py-2 dark:border-gray-800"
										>
											<p className="text-[10.5px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
												{a.type ?? 'Dirección'}
											</p>
											<p className="mt-1 text-[12px] text-gray-700 dark:text-gray-200">
												{[a.line1, a.city, a.state, a.zip].filter(Boolean).join(', ')}
											</p>
										</div>
									))}
								</div>
							</section>
						)}

						{/* Footer */}
						<div className="sticky bottom-0 mt-auto flex items-center gap-2 border-t border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-neutral-950">
							{data.incorporationId && (
								<Button
									variant="outline"
									size="sm"
									className="gap-1.5"
									render={
										<a href={`/incorporations/${data.incorporationId}`}>
											<Icon icon="ri:file-list-3-line" className="h-4 w-4" />
											Ver proceso
										</a>
									}
								/>
							)}
							<Button
								size="sm"
								className="ml-auto gap-1.5"
								render={
									<a href={`/companies/${data.id}`}>
										Ir al detalle
										<Icon icon="ri:arrow-right-line" className="h-4 w-4" />
									</a>
								}
							/>
						</div>
					</>
				)}
			</SheetContent>
		</Sheet>
	);
}

function KV({
	label,
	value,
	mono,
}: {
	label: string;
	value: string | null | undefined;
	mono?: boolean;
}) {
	return (
		<div>
			<dt className="text-[10px] font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
				{label}
			</dt>
			<dd
				className={
					'mt-0.5 text-gray-900 dark:text-gray-100 ' +
					(mono ? 'font-mono tabular-nums' : '')
				}
			>
				{value || <span className="text-gray-400 italic">—</span>}
			</dd>
		</div>
	);
}
