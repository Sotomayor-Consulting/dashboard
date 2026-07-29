-- Nominee Manager designado: un miembro del staff de Sotomayor Consulting
-- que figura como Manager de la LLC en el filing público del Estado cuando
-- el cliente paga ese servicio de privacidad (patrón "Nominee Manager" que
-- usan formadoras de LLC enfocadas en privacidad, ej. Wyoming/Delaware).
--
-- Distinto de company_members.is_manager, que representa a un socio real de
-- la LLC marcado como manager para efectos de management_type.
--
-- Sigue el mismo patrón catálogo + asignación que registered agent:
--   catalogs.registered_agents      -> public.company_registered_agents
--   catalogs.nominee_managers (NEW) -> public.company_nominee_managers (NEW)

-- ============ catalogs.nominee_managers ============
CREATE TABLE catalogs.nominee_managers (
	id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
	user_id uuid NOT NULL,
	legal_full_name text NOT NULL,
	title text,
	is_active boolean DEFAULT true NOT NULL,
	created_at timestamp with time zone DEFAULT now() NOT NULL,
	updated_at timestamp with time zone
);

ALTER TABLE catalogs.nominee_managers ENABLE ROW LEVEL SECURITY;

ALTER TABLE catalogs.nominee_managers
	ADD CONSTRAINT nominee_managers_pkey PRIMARY KEY (id);

ALTER TABLE catalogs.nominee_managers
	ADD CONSTRAINT nominee_managers_user_id_fkey
	FOREIGN KEY (user_id) REFERENCES public.usuarios (user_id) ON UPDATE CASCADE;

ALTER TABLE catalogs.nominee_managers
	ADD CONSTRAINT nominee_managers_user_id_key UNIQUE (user_id);

GRANT DELETE, INSERT, SELECT, UPDATE ON catalogs.nominee_managers TO authenticated;
GRANT ALL ON catalogs.nominee_managers TO service_role;

CREATE POLICY nominee_managers_select
	ON catalogs.nominee_managers
	FOR SELECT TO authenticated
	USING (public.is_company_staff());

CREATE POLICY nominee_managers_write
	ON catalogs.nominee_managers
	TO authenticated
	USING (public.is_company_staff())
	WITH CHECK (public.is_company_staff());

-- ============ public.company_nominee_managers ============
CREATE TABLE public.company_nominee_managers (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	company_id uuid NOT NULL,
	nominee_manager_id bigint NOT NULL,
	start_date date DEFAULT CURRENT_DATE NOT NULL,
	end_date date,
	created_at timestamp with time zone DEFAULT now() NOT NULL,
	updated_at timestamp with time zone
);

ALTER TABLE public.company_nominee_managers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.company_nominee_managers
	ADD CONSTRAINT company_nominee_managers_pkey PRIMARY KEY (id);

ALTER TABLE public.company_nominee_managers
	ADD CONSTRAINT company_nominee_managers_company_id_fkey
	FOREIGN KEY (company_id) REFERENCES public.companies (id) ON UPDATE CASCADE;

ALTER TABLE public.company_nominee_managers
	ADD CONSTRAINT company_nominee_managers_nominee_manager_id_fkey
	FOREIGN KEY (nominee_manager_id) REFERENCES catalogs.nominee_managers (id) ON UPDATE CASCADE;

CREATE UNIQUE INDEX company_nominee_managers_one_active
	ON public.company_nominee_managers (company_id)
	WHERE end_date IS NULL;

CREATE INDEX company_nominee_managers_company_idx
	ON public.company_nominee_managers (company_id);

CREATE INDEX company_nominee_managers_nominee_manager_idx
	ON public.company_nominee_managers (nominee_manager_id);

GRANT ALL ON public.company_nominee_managers TO anon;
GRANT ALL ON public.company_nominee_managers TO authenticated;
GRANT ALL ON public.company_nominee_managers TO service_role;

CREATE POLICY company_nominee_managers_select
	ON public.company_nominee_managers
	FOR SELECT TO authenticated
	USING (public.user_can_access_company(company_id));

CREATE POLICY company_nominee_managers_write
	ON public.company_nominee_managers
	TO authenticated
	USING (public.is_company_staff() AND public.user_can_access_company(company_id))
	WITH CHECK (public.is_company_staff() AND public.user_can_access_company(company_id));
