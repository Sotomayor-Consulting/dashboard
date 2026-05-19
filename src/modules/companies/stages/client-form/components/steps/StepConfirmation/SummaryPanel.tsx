import { useFormContext, useWatch } from 'react-hook-form';

import type { Activity } from '../../../data/activities';
import type { ClientFormData } from '../../../types';

interface Props {
	activities: Activity[];
}

const taxLabel = (v: ClientFormData['formaTributacion']) => {
	if (v === 'pass-through') return 'Pass-Through';
	if (v === 'corporation') return 'Corporación';
	return 'No especificada';
};

const adminLabel = (v: ClientFormData['formaAdministracion']) => {
	if (v === 'manager-managed') return 'Manager-Managed';
	if (v === 'member-managed') return 'Member-Managed';
	return 'No especificada';
};

export function SummaryPanel({ activities }: Props) {
	const { control } = useFormContext<ClientFormData>();
	const data = useWatch<ClientFormData>({ control }) as ClientFormData;

	const activity = activities.find((a) => a.id === data.actividad);
	const actividadLabel = data.actividadNoEnLista
		? data.descripcionActividad || 'No especificada'
		: activity
			? `${activity.irs_code} — ${activity.name_es}`
			: 'No especificada';

	const sociosLabel =
		data.miembros
			.filter((m) => m.nombreCompleto)
			.map((m) => m.nombreCompleto)
			.join(', ') || 'No especificados';

	return (
		<div className="bg-muted/50 space-y-4 rounded-xl p-5">
			<h3 className="text-foreground font-medium">Resumen de la solicitud</h3>
			<div className="grid gap-4 text-sm sm:grid-cols-2">
				<SummaryRow
					label="Ingresos de EE.UU."
					value={
						data.ingresosEEUU === null
							? 'No especificado'
							: data.ingresosEEUU
								? 'Sí'
								: 'No'
					}
				/>
				<SummaryRow label="Actividad" value={actividadLabel} />
				<SummaryRow
					label="Administración"
					value={adminLabel(data.formaAdministracion)}
				/>
				<SummaryRow
					label="Tributación"
					value={taxLabel(data.formaTributacion)}
				/>
				<SummaryRow
					label="Socios"
					value={sociosLabel}
					className="sm:col-span-2"
				/>
			</div>
		</div>
	);
}

function SummaryRow({
	label,
	value,
	className,
}: {
	label: string;
	value: string;
	className?: string;
}) {
	return (
		<div className={className}>
			<span className="text-muted-foreground">{label}:</span>{' '}
			<span className="text-foreground font-medium">{value}</span>
		</div>
	);
}
