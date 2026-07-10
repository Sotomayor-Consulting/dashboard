import * as React from 'react';
import CompanyMembersCrudSection from '../components/CompanyMembersCrudSection';
import type { CompanyMemberItem } from '../types';

interface Props {
	initialMembers: CompanyMemberItem[];
	companyId: string;
	canEditDetails: boolean;
}

export default function CompanyMembersPanel({ initialMembers, companyId, canEditDetails }: Props) {
	return (
		<CompanyMembersCrudSection
			initialMembers={initialMembers}
			scope={{ kind: 'company', id: companyId }}
			canEditDetails={canEditDetails}
		/>
	);
}
