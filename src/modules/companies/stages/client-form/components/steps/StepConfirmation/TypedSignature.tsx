import { useEffect, useMemo, useRef, useState } from 'react';

// Side-effect imports: cargan las fuentes cursivas sólo cuando se monta el Step 5.
import '@fontsource-variable/dancing-script';
import '@fontsource-variable/caveat';
import '@fontsource/great-vibes';

import { cn } from '@components/utils';
import { Input } from '@components/ui/Input';
import { Label } from '@components/ui/Label';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 200;
const FONT_SIZE = 96;

const PEN_COLOR_LIGHT = '#0a0a0a';
const PEN_COLOR_DARK = '#fafafa';

interface FontOption {
	id: string;
	label: string;
	family: string;
}

const FONT_OPTIONS: readonly FontOption[] = [
	{
		id: 'dancing',
		label: 'Dancing Script',
		family: '"Dancing Script Variable", cursive',
	},
	{
		id: 'caveat',
		label: 'Caveat',
		family: '"Caveat Variable", cursive',
	},
	{
		id: 'great-vibes',
		label: 'Great Vibes',
		family: '"Great Vibes", cursive',
	},
] as const;

interface Props {
	initialName?: string;
	onChange: (dataUrl: string | null) => void;
}

export function TypedSignature({ initialName = '', onChange }: Props) {
	const [name, setName] = useState(initialName);
	useEffect(() => { setName(initialName); }, [initialName]);
	const [fontId, setFontId] = useState<string>(FONT_OPTIONS[0]!.id);
	const [penColor, setPenColor] = useState(PEN_COLOR_LIGHT);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	const font = useMemo(
		() => FONT_OPTIONS.find((f) => f.id === fontId) ?? FONT_OPTIONS[0]!,
		[fontId],
	);

	// Sigue el tema del documento.
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
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const render = async () => {
			try {
				await document.fonts.load(`${FONT_SIZE}px ${font.family}`, name || ' ');
			} catch {
				/* noop */
			}

			ctx.clearRect(0, 0, canvas.width, canvas.height);

			if (!name.trim()) {
				onChange(null);
				return;
			}

			const maxWidth = CANVAS_WIDTH - 60;
			let size = FONT_SIZE;
			ctx.textBaseline = 'middle';
			ctx.fillStyle = penColor;
			ctx.font = `${size}px ${font.family}`;
			while (ctx.measureText(name).width > maxWidth && size > 24) {
				size -= 2;
				ctx.font = `${size}px ${font.family}`;
			}

			ctx.fillText(name, 30, CANVAS_HEIGHT / 2);
			onChange(canvas.toDataURL('image/png'));
		};

		void render();
	}, [name, font, penColor, onChange]);

	return (
		<div>
			<div className="grid gap-3 sm:grid-cols-[1fr_180px]">
				<div>
					<Label htmlFor="typed-name" className="text-xs">
						Tu nombre completo
					</Label>
					<Input
						id="typed-name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Juan Carlos Pérez"
						className="mt-1"
						maxLength={48}
					/>
				</div>
				<div>
					<Label className="text-xs">Estilo</Label>
					<div className="mt-1 flex gap-1">
						{FONT_OPTIONS.map((f) => (
							<button
								key={f.id}
								type="button"
								onClick={() => setFontId(f.id)}
								className={cn(
									'h-9 flex-1 rounded-md border px-2 text-xs transition-colors',
									f.id === fontId
										? 'border-accent bg-accent/10 text-foreground'
										: 'border-border text-muted-foreground hover:bg-muted',
								)}
								style={{ fontFamily: f.family, fontSize: 14 }}
							>
								Aa
							</button>
						))}
					</div>
				</div>
			</div>

			<div
				className="border-border bg-card mt-3 flex items-center justify-center overflow-hidden rounded-lg border-2 border-dashed"
				style={{ height: 160 }}
			>
				{name.trim() ? (
					<canvas
						ref={canvasRef}
						width={CANVAS_WIDTH}
						height={CANVAS_HEIGHT}
						className="h-full max-h-full max-w-full"
					/>
				) : (
					<>
						<canvas
							ref={canvasRef}
							width={CANVAS_WIDTH}
							height={CANVAS_HEIGHT}
							className="hidden"
						/>
						<p className="text-muted-foreground text-sm">
							Escribe tu nombre para previsualizar la firma.
						</p>
					</>
				)}
			</div>
		</div>
	);
}
