import type { TaxClasification, Managmentype, EntityLLC, LegalStatus } from '../types';

export const taxClassificationMap: Record<TaxClasification, string> = {
	disregarded_entity: 'Entidad de paso',
	corporation: 'Corporación',
} as const;

export const managementTypeMap: Record<Managmentype, string> = {
	'member-managed': 'Administrado por miembros',
	'manager-managed': 'Administrado por gerentes',
};

export const entityTypeMap: Record<EntityLLC, string> = {
	llc: 'LLC'
};

export const legalStatusMap: Record<LegalStatus, string> = {
	active: 'Activa',
	inactive: 'Inactiva',
	suspended: 'Suspendida',
	pending: 'Pendiente',
	dissolved: 'Disuelta',
}
