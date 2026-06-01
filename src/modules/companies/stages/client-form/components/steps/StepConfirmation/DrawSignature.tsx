import { useCallback, useEffect, useRef, useState } from 'react';
import SignaturePad from 'react-signature-pad-wrapper';

import { Button } from '@components/ui/Button';

const CANVAS_HEIGHT = 160;
const PEN_COLOR_LIGHT = '#0a0a0a';
const PEN_COLOR_DARK = '#fafafa';

interface Props {
	initialDataUrl: string | null;
	onChange: (dataUrl: string | null) => void;
}

export function DrawSignature({ initialDataUrl, onChange }: Props) {
	const padRef = useRef<SignaturePad>(null);
	const [penColor, setPenColor] = useState(PEN_COLOR_LIGHT);

	// Sigue el tema del documento (claro/oscuro).
	useEffect(() => {
		const update = () => {
			const isDark = document.documentElement.classList.contains('dark');
			setPenColor(isDark ? PEN_COLOR_DARK : PEN_COLOR_LIGHT);
		};
		update();
		const obs = new MutationObserver(update);
		obs.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class'],
		});
		return () => obs.disconnect();
	}, []);

	useEffect(() => {
		const pad = padRef.current;
		const instance = pad?.instance;
		if (!pad || !instance) return;
		instance.penColor = penColor;
		// Si ya hay trazos dibujados, los redibujamos con el nuevo color
		// (al cambiar tema claro ↔ oscuro la firma anterior debe seguir
		// siendo legible sobre el nuevo fondo).
		if (!pad.isEmpty()) {
			try {
				const data = pad.toData();
				const updated = data.map((group: { penColor?: string }) => ({
					...group,
					penColor,
				}));
				pad.fromData(updated as Parameters<typeof pad.fromData>[0]);
			} catch {
				/* noop */
			}
		}
	}, [penColor]);

	const persist = useCallback(() => {
		const pad = padRef.current;
		if (!pad) return;
		onChange(pad.isEmpty() ? null : pad.toDataURL('image/png'));
	}, [onChange]);

	useEffect(() => {
		const instance = padRef.current?.instance;
		if (!instance) return;
		instance.addEventListener('endStroke', persist);
		return () => instance.removeEventListener('endStroke', persist);
	}, [persist]);

	useEffect(() => {
		const pad = padRef.current;
		if (!pad || !initialDataUrl) return;
		if (pad.isEmpty()) {
			try {
				pad.fromDataURL(initialDataUrl);
			} catch {
				/* noop */
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleClear = useCallback(() => {
		padRef.current?.clear();
		onChange(null);
	}, [onChange]);

	return (
		<div>
			<div
				className="border-border bg-card overflow-hidden rounded-lg border-2 border-dashed"
				style={{ height: CANVAS_HEIGHT }}
			>
				<SignaturePad
					ref={padRef}
					redrawOnResize
					options={{
						penColor,
						minWidth: 1,
						maxWidth: 2.5,
						velocityFilterWeight: 0.7,
					}}
					canvasProps={{
						className: 'block cursor-crosshair touch-none w-full h-full',
					}}
				/>
			</div>
			<div className="mt-2 flex items-center justify-between">
				<p className="text-muted-foreground text-xs">
					Firme con el mouse, trackpad o el dedo (en táctil).
				</p>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={handleClear}
				>
					Limpiar firma
				</Button>
			</div>
		</div>
	);
}
