import { executeKw } from '../lib/odoo/client';
import type { OdooPartner, ServiceResponse } from '../types/odoo';

type EnsureContactPayload = {
  email: string;
  name: string;
  phone?: string;
  city?: string;
};

export async function ensureContactByEmail(
  payload: EnsureContactPayload
): Promise<ServiceResponse<OdooPartner | null>> {
  const { email, name, phone, city } = payload;

  try {
    // 1) Buscar si ya existe un partner con ese correo
    const existing = await executeKw(
      'res.partner',
      'search_read',
      [[['email', '=', email]]],
      { fields: ['id', 'name', 'email', 'phone', 'city'], limit: 1 }
    ) as OdooPartner[];

    if (existing && existing.length > 0) {
      // Ya existe → devolvemos el mismo y no creamos nada
      return {
        success: true,
        data: existing[0],
      };
    }

    // 2) Si NO existe → creamos un nuevo contacto en Odoo
    const partnerData: Record<string, unknown> = {
      name,
      email,
      type: 'contact',        // contacto normal
      company_type: 'person', // persona natural
    };

    if (phone) partnerData.phone = phone;
    if (city) partnerData.city = city;

    // create devuelve el ID del nuevo partner
    const newId = await executeKw(
      'res.partner',
      'create',
      [partnerData]
    ) as number;

    // 3) Leer el partner recién creado para devolverlo completo
    const created = await executeKw(
      'res.partner',
      'read',
      [[newId]],
      { fields: ['id', 'name', 'email', 'phone', 'city'] }
    ) as OdooPartner[];

    return {
      success: true,
      data: created[0] ?? null,
    };

  } catch (error) {
    console.error(
      `[Odoo Service Error] Fallo al crear/verificar contacto. Razón: ${(error as Error).message}`,
    );

    return {
      success: false,
      data: null,
      error: 'No se pudo sincronizar el contacto con Odoo.',
    };
  }
}
