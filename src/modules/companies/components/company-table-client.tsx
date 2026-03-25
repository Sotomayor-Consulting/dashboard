import { CompanyTable } from './company-table';
import { columns } from './company-columns';
import type { CompanyTableRow } from '../types';

interface Props {
	data: CompanyTableRow[];
}

export function CompaniesTableClient({ data }: Props) {
	return <CompanyTable columns={columns} data={data} />;
}
