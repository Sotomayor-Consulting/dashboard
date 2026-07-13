import { useEffect } from 'react';
import { toast } from 'sonner';

const TOAST_ID = 'incorporation-banner-toast';

interface BannerToastProps {
	title: string;
	ctaLabel: string;
	url: string;
}

export default function BannerToast({
	title,
	ctaLabel,
	url,
}: BannerToastProps) {
	useEffect(() => {
		toast.custom(
			(id) => (
				<div className="flex w-full max-w-md items-start justify-between gap-4 rounded-2xl bg-white p-4 shadow-lg dark:border-[#2d3654] dark:bg-neutral-900">
					<div className="min-w-0 flex-1">
						<p className="text-center text-sm font-medium text-black dark:text-white">
							{title}
						</p>
						<div className="mt-3 flex items-center justify-start gap-2">
							<a
								href={url}
								className="inline-flex h-9 items-center rounded-lg bg-black px-4 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
							>
								{ctaLabel}
							</a>
							<button
								type="button"
								onClick={() => toast.dismiss(id)}
								className="inline-flex h-9 items-center rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:border-[#38415f] dark:text-gray-300 dark:hover:bg-[#1a2235] dark:hover:text-white"
							>
								Cerrar
							</button>
						</div>
					</div>
				</div>
			),
			{
				id: TOAST_ID,
				duration: Infinity,
			},
		);

		return () => {
			toast.dismiss(TOAST_ID);
		};
	}, [ctaLabel, title, url]);

	return null;
}
