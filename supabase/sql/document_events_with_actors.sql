-- View: documents.document_events_with_actors
--
-- Best practices implemented:
--
-- 1. TIMESTAMPTZ: All timestamp columns already use `timestamptz` (UTC-stored,
--    session-timezone-aware). No casting needed. PostgREST returns ISO 8601
--    strings with UTC offset; the browser parses them and formats using the
--    user's local system timezone via Intl.DateTimeFormat.
--
-- 2. CROSS-SCHEMA JOIN: document_events lives in the `documents` schema;
--    user profiles live in `public.usuarios`. PostgreSQL allows cross-schema
--    joins within the same database. We expose the join as a view so callers
--    issue a single query instead of two round-trips (no N+1).
--
-- 3. SECURITY: The view is queried exclusively through supabaseAdmin (service
--    role) in the service layer, which bypasses RLS. Never expose this view
--    directly to anon/authenticated roles without adding proper RLS.

create or replace view documents.document_events_with_actors as
select
    de.id,
    de.document_id,
    de.case_id,
    de.event_type,
    de.from_status,
    de.to_status,
    de.actor_user_id,
    de.actor_role,
    de.notes,
    de.metadata,
    de.created_at,
    nullif(trim(coalesce(u.nombre, '') || ' ' || coalesce(u.apellido, '')), '') as actor_name
from documents.document_events de
left join public.usuarios u on u.user_id = de.actor_user_id;

comment on view documents.document_events_with_actors is
    'Document events enriched with the actor''s display name from public.usuarios. '
    'Timestamps are timestamptz (UTC); format in the client using Intl.DateTimeFormat '
    'to respect the user''s local timezone.';
