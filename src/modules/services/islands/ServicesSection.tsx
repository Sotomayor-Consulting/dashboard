import { useState, useMemo } from 'react';

interface ServiceItem {
	id: string;
	nombre: string;
	descripcion: string;
	categoria: string;
	link_imagen: string;
	link: string;
	estado: string;
}

interface Props {
	services: ServiceItem[];
}

function ServiceCard({ service }: { service: ServiceItem }) {
	return (
		<article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card transition hover:border-accent-gold hover:shadow-sm">
			{/* Image header */}
			<div className="relative aspect-[16/10] w-full overflow-hidden">
				<img
					src={service.link_imagen}
					alt={`Imagen del servicio ${service.nombre}`}
					className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
					loading="lazy"
					decoding="async"
				/>
				<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
			</div>

			{/* Body */}
			<div className="flex flex-1 flex-col p-5">
				<h3 className="mb-2 text-[15px] font-semibold leading-snug text-balance text-card-foreground">
					{service.nombre}
				</h3>
				<p className="mb-5 flex-1 text-[13px] leading-relaxed text-muted-foreground">
					{service.descripcion}
				</p>

				{/* Footer CTA */}
				<div className="flex items-center gap-2">
					<a
						href={service.link}
						target="_blank"
						rel="noreferrer noopener"
						className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-[13px] font-medium text-card-foreground transition-colors hover:bg-muted"
					>
						Solicitar servicio
					</a>
					<a
						href={service.link}
						target="_blank"
						rel="noreferrer noopener"
						aria-label={`Ver detalle de ${service.nombre}`}
						className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-card-foreground"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M7 7h10v10" />
							<path d="M7 17 17 7" />
						</svg>
					</a>
				</div>
			</div>
		</article>
	);
}

export default function ServicesSection({ services }: Props) {
	const categories = useMemo(() => {
		const cats = new Set(services.map((s) => s.categoria));
		return Array.from(cats);
	}, [services]);

	const [activeFilter, setActiveFilter] = useState('Todos');

	const filtered = useMemo(() => {
		if (activeFilter === 'Todos') return services;
		return services.filter((s) => s.categoria === activeFilter);
	}, [services, activeFilter]);

	const filters = ['Todos', ...categories];

	return (
		<section className="mx-auto w-full px-4 py-6 sm:px-6">
			{/* Header */}
			<div className="mb-6 border-b border-border pb-6">
				<h1 className="text-xl font-semibold text-foreground sm:text-2xl">
					Lista de nuestros servicios
				</h1>
				<p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
					Explora los servicios adicionales que ofrecemos para potenciar
					tu empresa. Filtra por categoría para encontrar lo que
					necesitas.
				</p>
			</div>

			{/* Filters */}
			<div className="mb-6 flex flex-wrap gap-2">
				{filters.map((filter) => (
					<button
						key={filter}
						type="button"
						onClick={() => setActiveFilter(filter)}
						className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
							activeFilter === filter
								? 'border border-foreground text-foreground'
								: 'border border-border text-muted-foreground hover:bg-muted'
						}`}
					>
						{filter}
					</button>
				))}
			</div>

			{/* Grid */}
			{filtered.length > 0 ? (
				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{filtered.map((service) => (
						<ServiceCard key={service.id} service={service} />
					))}
				</div>
			) : (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-16 text-center">
					<p className="text-sm text-muted-foreground">
						No hay servicios en esta categoría.
					</p>
				</div>
			)}
		</section>
	);
}
