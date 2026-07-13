import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { PaymentBadge } from '../../cells/PaymentBadge';
import type { AdminCompanyDetail } from '@modules/admin/lib/incorporation-types';

const fmtUSD = new Intl.NumberFormat('es-EC', {
	style: 'currency',
	currency: 'USD',
});

export function TabPagos({ company }: { company: AdminCompanyDetail }) {
	if (company.payments.length === 0) {
		return (
			<div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-[12px] text-gray-500 dark:border-gray-700 dark:text-gray-400">
				Esta empresa aún no tiene pagos registrados.
			</div>
		);
	}

	return (
		<div className="space-y-2">
			{company.payments.map((p) => (
				<div
					key={p.id}
					className="rounded-lg border border-gray-200 p-3 dark:border-gray-800"
				>
					<div className="flex items-start justify-between gap-2">
						<div className="min-w-0">
							<p className="truncate text-[12.5px] font-medium text-gray-900 dark:text-gray-100">
								{p.service}
							</p>
							<p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
								{p.chargedAt
									? format(new Date(p.chargedAt), 'dd MMM yyyy', { locale: es })
									: 'Sin fecha'}
							</p>
						</div>
						<span className="font-mono text-[13px] font-semibold tabular-nums text-gray-900 dark:text-gray-100">
							{fmtUSD.format(p.amount)}
						</span>
					</div>
					<div className="mt-2">
						<PaymentBadge status={p.status} />
					</div>
				</div>
			))}
		</div>
	);
}
