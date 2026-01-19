CREATE OR REPLACE FUNCTION public.mark_pago_visto_secure(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_rol integer;
BEGIN
  -- Verificar rol del usuario
  SELECT rol_id INTO user_rol 
  FROM usuarios 
  WHERE user_id = auth.uid();
  
  -- Solo permitir admin (1) u operaciones (4)
  IF user_rol NOT IN (1, 4) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  
  -- Actualizar pago
  UPDATE pagos 
  SET visto_por_operaciones = TRUE 
  WHERE id_pagos = p_id;
  
  RETURN FOUND;
END;
$$;

-- Permisos
REVOKE ALL ON FUNCTION public.mark_pago_visto_secure(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_pago_visto_secure(uuid) TO authenticated;