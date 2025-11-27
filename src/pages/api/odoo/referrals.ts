import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { getReferralsByEmail } from '../../../services/partnerService';

export const GET: APIRoute = async ({ request, cookies }) => {
  // 1. Inicializar Supabase en el contexto del servidor
  // Usamos las variables de entorno públicas para inicializar el cliente
  const supabase = createClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_ANON_KEY
  );

  // 2. Obtener el Token de Acceso (JWT)
  // Estrategia A: Leer desde Cookie (Lo más común en aplicaciones Web)
  // Nota: El nombre de la cookie depende de tu configuración. Por defecto suele ser 'sb-access-token'
  // o 'sb-[tu-project-id]-auth-token'.
  const accessToken = cookies.get('sb-access-token')?.value || 
                      cookies.get('sb-refresh-token')?.value;

  // Estrategia B: Leer desde Header 'Authorization: Bearer ...' (Común si llamas desde una App Móvil o SPA externa)
  // const authHeader = request.headers.get('Authorization');
  // const accessToken = authHeader?.split(' ')[1];

  // Validación temprana
  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'No autorizado: Falta token de sesión' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 3. Validar el usuario con Supabase
  // Esto verifica criptográficamente que el token es válido y no ha expirado
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);

  if (error || !user || !user.email) {
    return new Response(JSON.stringify({ error: 'Sesión inválida o expirada' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 4. Usar el email verificado del usuario para llamar a Odoo
  // Ya no dependemos de lo que el usuario escriba en la URL
  const result = await getReferralsByEmail(user.email);

  // 5. Responder
  return new Response(JSON.stringify(result), {
    status: 200, 
    headers: { 'Content-Type': 'application/json' }
  });
}