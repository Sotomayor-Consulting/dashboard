import type { Transformer } from '../types';
import { safeJsonParse, formatDate, formatName } from '../helpers';
import * as F from './field-map';

interface ConstituyentesData {
  ConstituyentesDeLaLLC?: unknown[];
}

interface ResponsableIRSData {
  Nombre?: string;
  Apellido?: string;
  SSN?: string;
}

export const ss4Transformer: Transformer = {
  id: 'ss4',
  name: 'SS-4 IRS — Application for EIN',
  description: 'Llena el formulario SS-4 con datos de la incorporación LLC',
  entityType: 'incorporation_case',

  evaluate(row: Record<string, unknown>): Record<string, string | boolean | string[]> {
    const miembros = safeJsonParse<ConstituyentesData>(row.informacion_miembros, {});
    const irs = safeJsonParse<ResponsableIRSData>(row.responsable_irs, {});
    const memberCount = Array.isArray(miembros?.ConstituyentesDeLaLLC)
      ? miembros.ConstituyentesDeLaLLC.length
      : 0;
    const multiMember = memberCount > 1;

    return {
      [F.LEGAL_NAME]:             String(row.nombre_1 ?? '').toUpperCase(),
      [F.MAILING_ADDRESS]:        '9140C SW 23RD ST',
      [F.CITY_STATE_ZIP]:         'DAVIE FL 33324',
      [F.COUNTY_STATE]:           'BROWARD, FLORIDA',
      [F.RESPONSIBLE_PARTY]:      formatName(irs?.Nombre, irs?.Apellido),
      [F.SSN_ITIN_EIN]:           irs?.SSN ?? 'FOREIGN',
      [F.MEMBER_COUNT]:           String(memberCount),

      [F.CHECKBOX_LLC]:           true,
      [F.CHECKBOX_REASON_STARTED]: true,

      [F.CHECKBOX_PARTNERSHIP]:   multiMember,
      [F.CHECKBOX_DISREGARDED]:   !multiMember,
      [F.TYPE_ENTITY_OTHER_SPECIFY]: multiMember
        ? ''
        : 'FOREIGN-OWNED U.S. DISREGARDED ENTITY',

      [F.REASON_SPECIFY_TYPE]:    'LLC',
      [F.DATE_STARTED]:           formatDate(row.fecha_de_validacion),
      [F.CLOSING_MONTH]:          'DECEMBER',

      [F.CHECKBOX_PRINCIPAL_OTHER]: true,
      [F.CHECKBOX_NO_PREVIOUS_EIN]: true,

      [F.DESIGNEE_NAME]:          'SEBASTIAN SOTOMAYOR',
      [F.DESIGNEE_ADDRESS]:       '1703 ANDROS ISLE A4 COCONUT CREEK FL 33066',
      [F.DESIGNEE_PHONE]:         '(754) 225-2904',
      [F.DESIGNEE_FAX]:           '(754) 254-4431',

      [F.APPLICANT_PHONE]:        '',
      [F.APPLICANT_FAX]:          '(754) 254-4431',
      [F.MEMBER_NAME_TITLE]:      `${formatName(irs?.Nombre, irs?.Apellido)} - MBR`,
    };
  },
};
