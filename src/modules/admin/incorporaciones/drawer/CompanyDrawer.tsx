import { Icon } from '@iconify/react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { Button } from '@components/ui/Button';
import { Sheet, SheetContent } from '@components/ui/Sheet';
import { Skeleton } from '@components/ui/Skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/Tabs';
import { cn } from '@components/utils';

import type { AdminCompanyDetail } from '@modules/admin/lib/incorporation-types';
import { CompanyDrawerHeader } from './CompanyDrawerHeader';
import { CompanyDrawerSummary } from './CompanyDrawerSummary';
import { TabDocumentos } from './tabs/TabDocumentos';
import { TabPagos } from './tabs/TabPagos';
import { TabTareas } from './tabs/TabTareas';

interface Props {
	companyId: string | null;
	onClose: () => void;
}

async function fetchCompany(id: string): Promise<AdminCompanyDetail> {
	const res = await fetch(`/api/admin/incorporaciones/${id}`);
	if (!res.ok) throw new Error('No se pudo cargar la empresa');
	return res.json() as Promise<AdminCompanyDetail>;
}

const TAB_TRIGGER_CLASS =
	'!justify-start !rounded-none !bg-transparent !shadow-none border-b-2 border-transparent !px-3 !py-2 data-active:border-gray-900 data-active:!bg-transparent data-active:!text-gray-900 dark:data-active:border-white dark:data-active:!text-white';

export function CompanyDrawer({ companyId, onClose }: Props) {
	const open = companyId !== null;
	const [tab, setTab] = useState<string>('tareas');

	useEffect(() => {
		setTab('documentos');
	}, [companyId]);

	const { data, isLoading, isError } = useQuery({
		queryKey: ['admin', 'incorporacion', companyId],
		queryFn: () => fetchCompany(companyId!),
		enabled: open,
	});

	return (
		<Sheet
			open={open}
			modal={false}
			onOpenChange={(o) => {
				if (!o) onClose();
			}}
		>
			<SheetContent
				side="right"
				className="!w-full overflow-y-auto !p-0 sm:!max-w-[420px]"
				showCloseButton={true}
			>
				{isLoading && (
					<div className="space-y-4 p-5">
						<Skeleton className="h-5 w-24" />
						<Skeleton className="h-12 w-full" />
						<Skeleton className="h-20 w-full" />
						<Skeleton className="h-32 w-full" />
					</div>
				)}

				{isError && (
					<div className="p-5 text-sm text-red-600">
						No se pudo cargar la empresa.
					</div>
				)}

				{data && (
					<>
						<CompanyDrawerHeader company={data} />
						<CompanyDrawerSummary company={data} />

						<div className="px-5 pb-5">
							<Tabs value={tab} onValueChange={setTab} className="w-full">
								<TabsList className="!h-auto !w-full !justify-start !gap-1 !rounded-none !border-0 !border-b !border-gray-200 !bg-transparent !p-0 !shadow-none dark:!border-gray-800">
									<TabsTrigger value="tareas" className={cn(TAB_TRIGGER_CLASS)}>
										Tareas
										{data.openTasksCount > 0 && (
											<span className="ml-1.5 rounded-full bg-indigo-100 px-1.5 text-[10px] font-medium text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">
												{data.openTasksCount}
											</span>
										)}
									</TabsTrigger>
									<TabsTrigger
										value="documentos"
										className={cn(TAB_TRIGGER_CLASS)}
									>
										Documentos
										{data.pendingDocs > 0 && (
											<span className="ml-1.5 rounded-full bg-amber-100 px-1.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
												{data.pendingDocs}
											</span>
										)}
									</TabsTrigger>
									<TabsTrigger value="pagos" className={cn(TAB_TRIGGER_CLASS)}>
										Pagos
									</TabsTrigger>
								</TabsList>
								<TabsContent value="tareas" className="pt-4">
									<TabTareas company={data} />
								</TabsContent>
								<TabsContent value="documentos" className="pt-4">
									<TabDocumentos company={data} />
								</TabsContent>
								<TabsContent value="pagos" className="pt-4">
									<TabPagos company={data} />
								</TabsContent>
							</Tabs>
						</div>

						{/* Footer sticky */}
						<div className="sticky bottom-0 mt-auto flex items-center gap-2 border-t border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-neutral-950">
							<Button variant="outline" size="sm" className="gap-1.5" disabled>
								<Icon icon="ri:user-line" className="h-4 w-4" />
								Reasignar
							</Button>
							<Button
								size="sm"
								className="ml-auto gap-1.5"
								nativeButton={false}
								render={
									<a href={`/admin/incorporations/${data.id}`}>
										Ir al proceso
										<Icon icon="ri:arrow-right-line" className="h-4 w-4" />
									</a>
								}
							/>
						</div>
					</>
				)}
			</SheetContent>
		</Sheet>
	);
}
