-- ============================================
-- IMPORTANTE: Usar función con SECURITY DEFINER para evitar recursión infinita
-- ============================================

-- ----------------------
-- FUNCIÓN (ejecutar en SQL Editor)
-- ----------------------

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM user_roles ur 
  JOIN roles r ON r.id = ur.rol_id 
  WHERE ur.user_id = auth.uid() AND r.name = 'admin');
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_cliente()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM user_roles ur 
  JOIN roles r ON r.id = ur.rol_id 
  WHERE ur.user_id = auth.uid() AND r.name = 'cliente');
$$ LANGUAGE SQL STABLE SECURITY DEFINER;


-- ----------------------
-- POLÍTICAS RLS - ADMIN (USING y WITH CHECK)
-- ----------------------

is_admin()


-- ----------------------
-- POLÍTICAS RLS - CLIENTE (USING y WITH CHECK)
-- ----------------------

is_cliente()
AND user_id = auth.uid()


-- ----------------------
-- BUCKETS PRIVADOS
-- ----------------------

((bucket_id = 'documentos_empresas'::text) AND is_admin())
