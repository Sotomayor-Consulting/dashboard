-- Aggressive cleanup for legacy triggers/functions on shared.notifications
-- that still reference OLD.is_read / NEW.is_read.
--
-- Run this in Supabase SQL Editor, then retry marking a notification as read.

-- 1) Inspect what is still attached to the table.
select
	t.tgname as trigger_name,
	p.proname as function_name,
	n.nspname as function_schema
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace cn on cn.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace n on n.oid = p.pronamespace
where cn.nspname = 'shared'
	and c.relname = 'notifications'
	and not t.tgisinternal;

-- 2) Drop every user-defined trigger on shared.notifications.
do $$
declare
	r record;
begin
	for r in
		select t.tgname
		from pg_trigger t
		join pg_class c on c.oid = t.tgrelid
		join pg_namespace n on n.oid = c.relnamespace
		where n.nspname = 'shared'
			and c.relname = 'notifications'
			and not t.tgisinternal
	loop
		execute format(
			'drop trigger if exists %I on shared.notifications',
			r.tgname
		);
	end loop;
end
$$;

-- 3) Optional: inspect functions whose body still mentions is_read.
select
	n.nspname as schema_name,
	p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where pg_get_functiondef(p.oid) ilike '%is_read%'
order by 1, 2;
