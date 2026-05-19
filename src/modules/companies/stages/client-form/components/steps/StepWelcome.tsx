import { Icon } from '@iconify/react';

const FEATURES = [
	{
		icon: 'ri:file-check-line',
		title: 'Información precisa',
		desc: 'Recopilamos datos de forma eficiente',
	},
	{
		icon: 'ri:shield-check-line',
		title: 'Datos seguros',
		desc: 'Su información está protegida',
	},
	{
		icon: 'ri:group-line',
		title: 'Asistencia',
		desc: 'Estamos aquí para ayudarle',
	},
] as const;

export function StepWelcome() {
	return (
		<div className="space-y-6">
			<div className="text-center">
				<div className="bg-accent/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
					<Icon icon="ri:building-2-line" className="text-accent h-8 w-8" />
				</div>
				<h1 className="text-foreground text-2xl font-bold text-balance md:text-3xl">
					¡Está a un paso de incorporar su empresa!
				</h1>
				<p className="text-muted-foreground mx-auto mt-3 max-w-xl text-pretty">
					Para continuar con el proceso de incorporación de su LLC en Estados
					Unidos, complete el siguiente formulario.
				</p>
			</div>

			<div className="grid gap-4 pt-4 sm:grid-cols-3">
				{FEATURES.map((f) => (
					<div key={f.title} className="bg-muted/50 rounded-xl p-4 text-center">
						<div className="bg-accent/10 mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg">
							<Icon icon={f.icon} className="text-accent h-5 w-5" />
						</div>
						<h3 className="text-foreground text-sm font-medium">{f.title}</h3>
						<p className="text-muted-foreground mt-1 text-xs">{f.desc}</p>
					</div>
				))}
			</div>

			<div className="bg-accent/5 border-accent/20 mt-6 rounded-xl border p-4">
				<p className="text-foreground text-sm">
					<strong>¡Gracias por confiar en nosotros!</strong> Su empresa está a
					punto de dar un gran paso hacia el éxito.
				</p>
			</div>
		</div>
	);
}
