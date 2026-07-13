import { useEffect, useState } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import 'sonner/dist/styles.css';

type ThemeMode = NonNullable<ToasterProps['theme']>;

function getTheme(): ThemeMode {
	if (typeof document === 'undefined') return 'light';
	return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export default function Toaster(props: ToasterProps) {
	const [theme, setTheme] = useState<ThemeMode>('light');

	useEffect(() => {
		setTheme(getTheme());

		const observer = new MutationObserver(() => {
			setTheme(getTheme());
		});

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class'],
		});

		return () => observer.disconnect();
	}, []);

	return (
		<Sonner
			theme={theme}
			position="top-center"
			closeButton
			richColors
			visibleToasts={3}
			toastOptions={{
				classNames: {
					toast:
						'border border-gray-200 rounded-xl bg-white text-black shadow-lg dark:border-[#2d3654] dark:bg-black dark:text-white',
					description: 'text-gray-600 dark:text-gray-300',
					actionButton:
						'bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200',
					cancelButton:
						'border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 dark:border-[#38415f] dark:bg-transparent dark:text-gray-200 dark:hover:bg-neutral-950',
				},
			}}
			{...props}
		/>
	);
}
