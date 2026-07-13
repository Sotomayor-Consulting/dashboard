import { useState } from 'react';

interface CompanyOption {
	id: string;
	principal_name: string;
	entity_type?: string | null;
	state?: string | null;
}

interface CompanySelectProps {
	companies: CompanyOption[];
	inputId?: string;
	inputName?: string;
	defaultValue?: string;
}

export default function CompanySelect({
	companies,
	inputId = 'empresa-select',
	inputName = 'empresa',
	defaultValue,
}: CompanySelectProps) {
	const initialValue =
		(defaultValue && companies.find((c) => c.id === defaultValue)?.id) ||
		companies[0]?.id ||
		'';
	const [value, setValue] = useState(initialValue);

	return (
		<div
			role="radiogroup"
			aria-label="Empresa a incorporar"
			className="max-h-72 space-y-2.5 overflow-y-auto pr-0.5"
		>
			<input type="hidden" id={inputId} name={inputName} value={value} />
			{companies.map((company) => {
				const selected = company.id === value;
				return (
					<button
						key={company.id}
						type="button"
						role="radio"
						aria-checked={selected}
						onClick={() => setValue(company.id)}
						className={`group flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#8c681d]/50 focus-visible:outline-none ${
							selected
								? 'border-[#8c681d] bg-amber-50/60 ring-2 ring-[#8c681d]/20 dark:bg-[#8c681d]/[0.08]'
								: 'border-slate-200 bg-white hover:border-slate-300 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700'
						}`}
					>
						<span
							className={`flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
								selected
									? 'bg-primary-gold/15 text-primary-gold'
									: 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500'
							}`}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="currentColor"
								className="size-5"
								aria-hidden="true"
							>
								<path d="M21 19h2v2H1v-2h2V4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v15h2ZM7 11v2h4v-2H7Zm0-4v2h4V7H7Zm0 8v2h4v-2H7Zm6 0v2h4v-2h-4Zm0-4v2h4v-2h-4Zm0-4v2h4V7h-4Z" />
							</svg>
						</span>
						<span className="min-w-0 flex-1">
							<span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
								{company.principal_name}
							</span>
							{company.entity_type && (
								<span className="block truncate text-xs text-slate-500 dark:text-slate-400">
									{company.entity_type}
								</span>
							)}
						</span>
						{company.state && (
							<span
								className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium tracking-wide uppercase ${
									selected
										? 'bg-primary-gold/15 text-primary-gold'
										: 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400'
								}`}
							>
								{company.state}
							</span>
						)}
						<span
							className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition-all ${
								selected
									? 'border-[#8c681d] bg-primary-gold text-white'
									: 'border-slate-300 bg-transparent text-transparent dark:border-neutral-700'
							}`}
							aria-hidden="true"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="currentColor"
								className="size-3"
							>
								<path d="M10 15.172 19.192 5.979l1.415 1.414L10 18 3.636 11.636l1.414-1.414L10 15.172Z" />
							</svg>
						</span>
					</button>
				);
			})}
		</div>
	);
}
