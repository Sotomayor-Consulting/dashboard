import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@components/components/ui/breadcrumb';
import React from 'react';

export interface BreadcrumbPath {
	label: string;
	href?: string;
}

export function SharedBreadcrumb({ paths }: { paths: BreadcrumbPath[] }) {
	return (
		<div className="dark:bg-black-900 block items-center justify-between border-gray-200 bg-white px-4 py-6 sm:flex lg:mt-1.5 dark:border-gray-700">
			<div className="mb-1 w-full">
				<Breadcrumb>
					<BreadcrumbList>
						{paths.map((path, index) => {
							const isLast = index === paths.length - 1;
							return (
								<React.Fragment key={path.label}>
									<BreadcrumbItem>
										{isLast || !path.href ? (
											<BreadcrumbPage>{path.label}</BreadcrumbPage>
										) : (
											<BreadcrumbLink href={path.href}>
												{path.label}
											</BreadcrumbLink>
										)}
									</BreadcrumbItem>
									{!isLast && <BreadcrumbSeparator />}
								</React.Fragment>
							);
						})}
					</BreadcrumbList>
				</Breadcrumb>
			</div>
		</div>
	);
}
