import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
} from '@components/ui/DropdownMenu';

/**
 * Selector de rango del card de transacciones (reemplazo del
 * data-dropdown-toggle de Flowbite en AnnualMaintenance).
 */
const RANGES = [
	'Yesterday',
	'Today',
	'Last 7 days',
	'Last 30 days',
	'Last 90 days',
];

export default function TransactionsRangeDropdown() {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger className="inline-flex items-center rounded-lg p-2 text-center text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
				Last 7 days
				<svg
					className="ml-2 h-4 w-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth="2"
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start">
				<DropdownMenuGroup>
					<DropdownMenuLabel>Sep 16, 2021 - Sep 22, 2021</DropdownMenuLabel>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				{RANGES.map((range) => (
					<DropdownMenuItem key={range}>{range}</DropdownMenuItem>
				))}
				<DropdownMenuSeparator />
				<DropdownMenuItem>Custom...</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
