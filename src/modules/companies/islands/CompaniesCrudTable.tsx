import { useState } from 'react';
import CompanyDataTable from './CompanyDataTable';
import AddCompanyDialog from './AddCompanyDialog';
import { companiesColumns } from './CompanyColumns';
import type { CompanyCrudRow } from '../types';

interface CompaniesCrudTableProps {
	data: CompanyCrudRow[];
	estados: string[];
}

export default function CompaniesCrudTable({
	data,
	estados,
}: CompaniesCrudTableProps) {
	const [addOpen, setAddOpen] = useState(false);

	return (
		<>
			<CompanyDataTable
				columns={companiesColumns}
				data={data}
				onAddCompany={() => setAddOpen(true)}
			/>
			<AddCompanyDialog
				open={addOpen}
				onOpenChange={setAddOpen}
				estados={estados}
			/>
		</>
	);
}
