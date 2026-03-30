import { IncorporationTable } from './incorporation-table';
import { columns } from './incorporation-columns';
import type { IncorporationRelations } from '../types';

interface Props {
	data: IncorporationRelations[];
}

export function IncorporationTableClient({ data }: Props) {
	return <IncorporationTable columns={columns} data={data} />;
}
