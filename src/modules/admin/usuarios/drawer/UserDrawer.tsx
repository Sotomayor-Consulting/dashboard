import { Icon } from '@iconify/react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@components/ui/Button';
import { Sheet, SheetContent } from '@components/ui/Sheet';
import { Skeleton } from '@components/ui/Skeleton';

import type { AdminUserDetail, UserRole } from '@modules/admin/lib/types';
import { UserDrawerActivity } from './UserDrawerActivity';
import { UserDrawerCompanies } from './UserDrawerCompanies';
import { UserDrawerEditForm } from './UserDrawerEditForm';
import { UserDrawerEmailModal } from './UserDrawerEmailModal';
import { UserDrawerHeader } from './UserDrawerHeader';
import { UserDrawerRoles } from './UserDrawerRoles';

interface Props {
	userId: string | null;
	viewerRoles: UserRole[];
	onClose: () => void;
}

async function fetchUser(id: string): Promise<AdminUserDetail> {
	const res = await fetch(`/api/admin/users/${id}`);
	if (!res.ok) throw new Error('No se pudo cargar el usuario');
	return res.json() as Promise<AdminUserDetail>;
}

/**
 * Drawer derecho del usuario. NO modal (modal={false}) — la tabla queda
 * operable detrás para permitir cambiar de fila sin cerrar y reabrir.
 */
export function UserDrawer({ userId, viewerRoles, onClose }: Props) {
	const open = userId !== null;
	const canEdit = viewerRoles.includes('admin');
	const [editMode, setEditMode] = useState(false);
	const [emailModalOpen, setEmailModalOpen] = useState(false);

	// Reset editMode al cambiar de usuario o cerrar
	useEffect(() => {
		setEditMode(false);
	}, [userId]);

	const { data, isLoading, isError } = useQuery({
		queryKey: ['admin', 'user', userId],
		queryFn: () => fetchUser(userId!),
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
				className="!w-full sm:!max-w-[400px] !p-0 overflow-y-auto"
				showCloseButton={true}
			>
				{isLoading && (
					<div className="space-y-4 p-5">
						<Skeleton className="h-5 w-24" />
						<Skeleton className="h-12 w-full" />
						<Skeleton className="h-20 w-full" />
						<Skeleton className="h-32 w-full" />
					</div>
				)}

				{isError && (
					<div className="p-5 text-sm text-red-600">
						No se pudo cargar el usuario. Cierra e intenta de nuevo.
					</div>
				)}

				{data && editMode && (
					<>
						<UserDrawerHeader user={data} />
						<UserDrawerEditForm
							user={data}
							onCancel={() => setEditMode(false)}
							onSaved={() => setEditMode(false)}
						/>
					</>
				)}

				{data && !editMode && (
					<>
						<UserDrawerHeader user={data} />
						<UserDrawerRoles user={data} canEdit={canEdit} />
						<UserDrawerCompanies user={data} />
						<UserDrawerActivity user={data} />

						<div className="sticky bottom-0 mt-auto flex items-center gap-2 border-t border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-neutral-950">
							{canEdit && (
								<Button
									variant="outline"
									size="sm"
									className="gap-1.5"
									onClick={() => setEditMode(true)}
								>
									<Icon icon="ri:edit-line" className="h-4 w-4" />
									Editar
								</Button>
							)}
							<Button
								variant="outline"
								size="sm"
								className="gap-1.5"
								onClick={() => setEmailModalOpen(true)}
							>
								<Icon icon="ri:mail-send-line" className="h-4 w-4" />
								Enviar email
							</Button>
							{canEdit && (
								<Button
									size="sm"
									className="ml-auto gap-1.5"
									onClick={() =>
										toast.info('Suplantación en desarrollo', {
											description:
												'Esta función estará disponible próximamente. Requiere setup de sesión sombra para volver a tu cuenta.',
										})
									}
								>
									<Icon icon="ri:user-line" className="h-4 w-4" />
									Suplantar
								</Button>
							)}
						</div>
					</>
				)}
				{data && (
					<UserDrawerEmailModal
						open={emailModalOpen}
						onClose={() => setEmailModalOpen(false)}
						userId={data.id}
						email={data.email}
						userName={data.name}
					/>
				)}
			</SheetContent>
		</Sheet>
	);
}
