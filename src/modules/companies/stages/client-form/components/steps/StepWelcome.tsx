const STEPS_NEEDED = [
	{
		num: '01',
		title: 'Información general',
		desc: 'Industria, descripción de operaciones y mercado.',
		time: '~ 3 min',
	},
	{
		num: '02',
		title: 'Miembros',
		desc: 'Nombres completos, documentos y porcentaje de participación.',
		time: '~ 5 min',
	},
	{
		num: '03',
		title: 'Manager',
		desc: 'Persona designada para representar la entidad.',
		time: '~ 3 min',
	},
	{
		num: '04',
		title: 'Revisión y confirmación',
		desc: 'Aprobación final antes del envío del formulario.',
		time: '~ 2 min',
	},
] as const;

export function StepWelcome() {
	return (
		<div className="space-y-10">
			{/* Headline */}
			<h1 className="text-foreground mt-3 text-3xl font-semibold tracking-tight text-balance md:text-4xl">
				Está a un paso de incorporar
				<br className="hidden md:block" /> su empresa en Estados Unidos.
			</h1>
			{/* Lede */}
			<p className="text-muted-foreground mt-4 max-w-xl text-sm leading-relaxed text-pretty">
				Para continuar con el proceso de incorporación de su LLC, complete el
				siguiente formulario.
			</p>
			{/* Lo que necesitará */}
			<div>
				<p className="text-muted-foreground mb-5 text-[10px] font-semibold tracking-[0.15em] uppercase">
					Lo que necesitará
				</p>
				<div className="divide-border divide-y">
					{STEPS_NEEDED.map(({ num, title, desc }) => (
						<div
							key={num}
							className="grid grid-cols-[48px_1fr_auto] items-center gap-6 py-4"
						>
							<span className="text-muted-foreground text-sm font-medium">
								{num}
							</span>
							<div>
								<p className="text-foreground text-sm font-medium">{title}</p>
								<p className="text-muted-foreground mt-1 text-xs leading-relaxed">
									{desc}
								</p>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
