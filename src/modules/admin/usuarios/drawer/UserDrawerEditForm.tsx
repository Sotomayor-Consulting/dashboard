import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Label } from '@components/ui/Label';

import type { AdminUserDetail } from '@modules/admin/lib/types';

interface Props {
	user: AdminUserDetail;
	onCancel: () => void;
	onSaved: () => void;
}

type Editable = {
	nombre: string;
	apellido: string;
	organizacion: string;
	cargo: string;
	telf: string;
};

function splitFullName(full: string): { nombre: string; apellido: string } {
	const parts = full.trim().split(/\s+/);
	if (parts.length === 0) return { nombre: '', apellido: '' };
	if (parts.length === 1) return { nombre: parts[0] ?? '', apellido: '' };
	return {
		nombre: parts.slice(0, -1).join(' '),
		apellido: parts[parts.length - 1] ?? '',
	};
}

/**
 * Formulario inline de edición de usuario. Reemplaza visualmente la vista
 * de detalle del drawer cuando el viewer entra en modo "Editar".
 */
export function UserDrawerEditForm({ user, onCancel, onSaved }: Props) {
	const qc = useQueryClient();
	const seedNames = splitFullName(user.name);
	const [form, setForm] = useState<Editable>({
		nombre: seedNames.nombre,
		apellido: seedNames.apellido,
		organizacion: user.organization ?? '',
		cargo: user.jobTitle ?? '',
		telf: '',
	});

	const mutation = useMutation({
		mutationFn: async (data: Editable) => {
			const res = await fetch(`/api/admin/users/${user.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});
			if (!res.ok) {
				const err = (await res.json().catch(() => ({}))) as {
					error?: string;
				};
				throw new Error(err.error ?? 'Falló la actualización');
			}
		},
		onSuccess: () => {
			toast.success('Usuario actualizado');
			qc.invalidateQueries({ queryKey: ['admin', 'users'] });
			qc.invalidateQueries({ queryKey: ['admin', 'user', user.id] });
			onSaved();
		},
		onError: (err) => {
			toast.error(err instanceof Error ? err.message : 'No se pudo guardar');
		},
	});

	const setField = (k: keyof Editable, v: string) =>
		setForm((p) => ({ ...p, [k]: v }));

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				mutation.mutate(form);
			}}
			className="space-y-5 px-5 py-5"
		>
			<div className="grid grid-cols-2 gap-3">
				<Field label="Nombre">
					<Input
						value={form.nombre}
						onChange={(e) => setField('nombre', e.target.value)}
						className="!h-9"
					/>
				</Field>
				<Field label="Apellido">
					<Input
						value={form.apellido}
						onChange={(e) => setField('apellido', e.target.value)}
						className="!h-9"
					/>
				</Field>
			</div>

			<Field label="Organización">
				<Input
					value={form.organizacion}
					onChange={(e) => setField('organizacion', e.target.value)}
					placeholder="Sin compañía"
					className="!h-9"
				/>
			</Field>

			<Field label="Cargo">
				<Input
					value={form.cargo}
					onChange={(e) => setField('cargo', e.target.value)}
					placeholder="Sin cargo"
					className="!h-9"
				/>
			</Field>

			<Field label="Teléfono">
				<Input
					value={form.telf}
					onChange={(e) => setField('telf', e.target.value)}
					type="tel"
					placeholder="+1 …"
					className="!h-9"
				/>
			</Field>

			<div className="flex items-center justify-end gap-2 pt-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={onCancel}
					disabled={mutation.isPending}
				>
					Cancelar
				</Button>
				<Button type="submit" size="sm" disabled={mutation.isPending}>
					{mutation.isPending ? 'Guardando…' : 'Guardar cambios'}
				</Button>
			</div>
		</form>
	);
}

function Field({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div>
			<Label className="mb-1.5 block text-[11px] font-medium text-gray-500 dark:text-gray-400">
				{label}
			</Label>
			{children}
		</div>
	);
}
