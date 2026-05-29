import type { Member } from '../../../../types';
import { countAddressCompleted } from './MemberAddressSection';
import { countDocumentsCompleted } from './MemberDocumentsSection';
import { countIdentityCompleted } from './MemberIdentitySection';
import { countParticipationCompleted } from './MemberParticipationSection';

import type { SocioStatus } from '../SocioPill';

/**
 * Suma de campos completados en las 4 sub-secciones del socio.
 * Total fijo de 5 + 2 + 3 + 3 = 13.
 */
export function getMemberCompletion(member: Member | undefined): {
	completed: number;
	total: number;
	status: SocioStatus;
} {
	const total = 5 + 2 + 3 + 3;
	const completed =
		countIdentityCompleted(member) +
		countParticipationCompleted(member) +
		countDocumentsCompleted(member) +
		countAddressCompleted(member);
	let status: SocioStatus;
	if (completed === 0) status = 'empty';
	else if (completed >= total) status = 'complete';
	else status = 'inProgress';
	return { completed, total, status };
}
