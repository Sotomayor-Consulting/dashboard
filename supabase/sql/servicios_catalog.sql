create table if not exists public.servicios (
	id bigserial primary key,
	id_servicios text not null unique,
	nombre text,
	descripcion text,
	precio numeric(10, 2),
	categoria text,
	etiqueta text,
	servicio_activo boolean default true,
	odoo_default_code text,
	odoo_product_template_id integer,
	created_at timestamptz not null default now()
);

insert into public.servicios (
	id,
	id_servicios,
	nombre,
	descripcion,
	precio,
	categoria,
	etiqueta,
	servicio_activo
)
values
	(
		1,
		'plan-basico',
		'Plan Básico',
		'Constituye tu LLC con lo esencial para operar legalmente.',
		350,
		'checkout',
		'plan-basico',
		true
	),
	(
		2,
		'plan-business',
		'Plan Business',
		'Estrategia fiscal y legal completa para tu LLC.',
		950,
		'checkout',
		'plan-business',
		true
	),
	(
		3,
		'plan-estandar',
		'Plan Estándar',
		'Incluye soporte legal y documentos clave para operar.',
		650,
		'checkout',
		'plan-estandar',
		true
	),
	(
		4,
		'plan-diseno-upgrade',
		'Plan Diseño - upgrade',
		'Ideal para redefinir la estructura de una LLC ya existente.',
		350,
		'checkout',
		'plan-diseno-upgrade',
		true
	)
on conflict (id_servicios) do update
set
	nombre = excluded.nombre,
	descripcion = excluded.descripcion,
	precio = excluded.precio,
	categoria = excluded.categoria,
	etiqueta = excluded.etiqueta,
	servicio_activo = excluded.servicio_activo;

select setval(
	pg_get_serial_sequence('public.servicios', 'id'),
	coalesce((select max(id) from public.servicios), 1),
	true
);
