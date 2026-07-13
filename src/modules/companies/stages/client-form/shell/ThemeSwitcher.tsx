import { useEffect, useState } from 'react';

/**
 * Switcher de modo claro/oscuro para el header del formulario.
 * Replica la lógica global (`.dark` en <html> + localStorage `color-theme`
 * + evento custom `dark-mode`) usada en el resto del dashboard.
 */
export function ThemeSwitcher() {
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
		<button
			type="button"
			onClick={toggleTheme}
			aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
			className="inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors"
			style={{
				background: 'var(--cf-bg-card)',
				borderColor: 'var(--cf-line)',
				color: 'var(--cf-ink-mute)',
			}}
		>
			{isDark ? (
				<svg
					className="h-[18px] w-[18px]"
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
					className="h-[18px] w-[18px]"
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
	);
}
