import { useEffect, useState } from 'react';
import LogoDark from '../../../../../icons/logo-sotomayor-consulting-black.svg';
import LogoLight from '../../../../../icons/logo-sotomayor-consulting.svg';

export function WizardHeader() {
	const [isDark, setIsDark] = useState(false);

	useEffect(() => {
		setIsDark(document.documentElement.classList.contains('dark'));
	}, []);

	const toggleTheme = () => {
		const goingDark = !document.documentElement.classList.contains('dark');
		if (goingDark) {
			document.documentElement.classList.add('dark');
			localStorage.setItem('color-theme', 'dark');
		} else {
			document.documentElement.classList.remove('dark');
			localStorage.setItem('color-theme', 'light');
		}
		setIsDark(goingDark);
		document.dispatchEvent(new Event('dark-mode'));
	};

	return (
		<header className="bg-card/95 supports-[backdrop-filter]:bg-card/80 border-border sticky top-0 z-50 border-b backdrop-blur">
			<div className="flex items-center justify-between px-4 py-4">
				<div className="flex items-center gap-4">
					<img
						src={isDark ? LogoDark.src : LogoLight.src}
						alt="Logo"
						className="h-12 w-auto object-contain"
					/>
					<span className="text-muted-foreground text-lg">—</span>
					<div>
						<span className="text-foreground block text-base leading-tight font-semibold">
							Formulario de incorporación
						</span>
						<span className="text-muted-foreground text-xs">
							Completa la información de tu empresa para comenzar
						</span>
					</div>
				</div>
				<button
					onClick={toggleTheme}
					type="button"
					className="text-muted-foreground hover:bg-accent inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
					aria-label="Toggle dark mode"
				>
					{isDark ? (
						<svg
							className="h-5 w-5"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.8"
							strokeLinecap="round"
							strokeLinejoin="round"
							viewBox="0 0 24 24"
						>
							<circle cx="12" cy="12" r="4" />
							<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
						</svg>
					) : (
						<svg
							className="h-5 w-5"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.8"
							strokeLinecap="round"
							strokeLinejoin="round"
							viewBox="0 0 24 24"
						>
							<path d="M12 3a6 6 0 1 0 9 9 9 9 0 1 1-9-9z" />
						</svg>
					)}
				</button>
			</div>
		</header>
	);
}
