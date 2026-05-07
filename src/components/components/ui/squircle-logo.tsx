import * as React from 'react';

import { cn } from '@components/lib/utils';

interface SquircleLogoProps extends React.HTMLAttributes<HTMLDivElement> {
	/** Background color of the squircle (any CSS color). Glow is derived from this. */
	color: string;
	/** Size of the squircle in pixels. */
	size?: number;
	/** Logo content: an <img>, <svg>, or text. */
	children: React.ReactNode;
	/** Glow intensity multiplier (default 1). */
	glow?: number;
	/** Inner content area as a fraction of `size` (default 0.62). Increase for tighter padding around the logo. */
	contentScale?: number;
}

/**
 * Squircle logo container with an ambient glow that adapts to the brand color.
 * Inspired by the iOS-style app icon presentation.
 */
export function SquircleLogo({
	color,
	size = 160,
	glow = 1,
	contentScale = 0.62,
	children,
	className,
	style,
	...rest
}: SquircleLogoProps) {
	// Cuando hay glow, el contenedor exterior debe ser más grande para no
	// recortar el blur. Sin glow, ajustamos al squircle para que múltiples
	// instancias puedan colocarse juntas sin separación fantasma.
	const wrapperSize = glow > 0 ? size * 2.2 : size;

	return (
		<div
			className={cn(
				'relative inline-flex items-center justify-center',
				className,
			)}
			style={{ width: wrapperSize, height: wrapperSize, ...style }}
			{...rest}
		>
			{glow > 0 && (
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 rounded-full"
					style={{
						background: `radial-gradient(circle at center, ${color} 0%, transparent 60%)`,
						opacity: 0.55 * glow,
						filter: 'blur(30px)',
					}}
				/>
			)}
			<div
				className="relative flex items-center justify-center overflow-hidden"
				style={{
					width: size,
					height: size,
					backgroundColor: color,
					borderRadius: size * 0.2237,
					boxShadow: glow > 0 ? `0 10px 40px -10px ${color}` : 'none',
				}}
			>
				<div
					className="flex items-center justify-center"
					style={{ width: size * contentScale, height: size * contentScale }}
				>
					{children}
				</div>
			</div>
		</div>
	);
}
