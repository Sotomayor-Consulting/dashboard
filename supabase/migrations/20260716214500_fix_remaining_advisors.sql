-- Rezagados de la auditoría de advisors (no cubiertos por la migración anterior):
-- 1. FK compuesta de irs_responsible_party sin índice de cobertura.
-- 2. Política RLS en realtime.messages evaluando auth.uid() por fila.
--    (drop + create porque el schema realtime no forma parte del baseline
--    y la política puede no existir en un proyecto nuevo.)

create index if not exists irs_responsible_party_company_id_member_id_idx
	on public.irs_responsible_party (company_id, member_id);

drop policy if exists user_can_read_their_notifications_topic on realtime.messages;
create policy user_can_read_their_notifications_topic on realtime.messages
	for select to authenticated
	using (
		(topic ~~ 'user:%:notifications'::text)
		and ((split_part(topic, ':'::text, 2))::uuid = (select auth.uid()))
	);
