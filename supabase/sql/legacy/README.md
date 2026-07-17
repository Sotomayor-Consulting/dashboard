# Scripts SQL legacy

Estos scripts son la referencia histórica previa a la adopción de migraciones
versionadas con el CLI de Supabase (julio 2026). **No aplicarlos**: todo su
contenido ya está incluido en el baseline
`supabase/migrations/20260715165654_remote_schema.sql`.

Flujo actual para cambios de schema:

```bash
npx supabase migration new <nombre>   # crea supabase/migrations/<ts>_<nombre>.sql
# escribir el SQL, luego:
npx supabase db push                  # aplicar al proyecto vinculado
```
