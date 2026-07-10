import * as React from 'react';
import { useCompanyAddresses } from '../hooks/use-company-addresses';
import CompanyAddressesSection from '../components/CompanyAddressesSection';
import type { CompanyAddressItem } from '../types';

interface Props {
	addresses: CompanyAddressItem[];
	companyId: string;
	canEditDetails: boolean;
}

export default function CompanyAddressesPanel({ addresses, companyId, canEditDetails }: Props) {
	const addressesState = useCompanyAddresses(addresses, companyId);

	return (
		<CompanyAddressesSection
			canEditDetails={canEditDetails}
			{...addressesState}
		/>
	);
}
