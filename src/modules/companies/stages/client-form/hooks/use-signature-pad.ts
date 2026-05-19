import { useCallback, useRef, useState } from 'react';

export interface UseSignaturePadApi {
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
	isEmpty: boolean;
	startDrawing: (
		e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
	) => void;
	draw: (
		e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
	) => void;
	stopDrawing: () => void;
	clear: () => void;
	/** Devuelve el dataURL de la firma actual (o null si está vacía). */
	getDataUrl: () => string | null;
}

const getEventPosition = (
	canvas: HTMLCanvasElement,
	e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
): { x: number; y: number } => {
	const rect = canvas.getBoundingClientRect();
	if ('touches' in e) {
		const touch = e.touches[0];
		return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
	}
	return { x: e.clientX - rect.left, y: e.clientY - rect.top };
};

export interface UseSignaturePadOptions {
	strokeColor?: string;
	lineWidth?: number;
	onChange?: (dataUrl: string | null) => void;
}

export function useSignaturePad({
	strokeColor = '#1a1a2e',
	lineWidth = 2,
	onChange,
}: UseSignaturePadOptions = {}): UseSignaturePadApi {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const isDrawingRef = useRef(false);
	const [isEmpty, setIsEmpty] = useState(true);

	const startDrawing = useCallback(
		(
			e:
				| React.MouseEvent<HTMLCanvasElement>
				| React.TouchEvent<HTMLCanvasElement>,
		) => {
			const canvas = canvasRef.current;
			if (!canvas) return;
			const ctx = canvas.getContext('2d');
			if (!ctx) return;
			isDrawingRef.current = true;
			const { x, y } = getEventPosition(canvas, e);
			ctx.beginPath();
			ctx.moveTo(x, y);
		},
		[],
	);

	const draw = useCallback(
		(
			e:
				| React.MouseEvent<HTMLCanvasElement>
				| React.TouchEvent<HTMLCanvasElement>,
		) => {
			if (!isDrawingRef.current) return;
			const canvas = canvasRef.current;
			if (!canvas) return;
			const ctx = canvas.getContext('2d');
			if (!ctx) return;
			const { x, y } = getEventPosition(canvas, e);
			ctx.lineTo(x, y);
			ctx.strokeStyle = strokeColor;
			ctx.lineWidth = lineWidth;
			ctx.lineCap = 'round';
			ctx.stroke();
		},
		[strokeColor, lineWidth],
	);

	const stopDrawing = useCallback(() => {
		if (!isDrawingRef.current) return;
		isDrawingRef.current = false;
		const canvas = canvasRef.current;
		if (!canvas) return;
		const dataUrl = canvas.toDataURL();
		setIsEmpty(false);
		onChange?.(dataUrl);
	}, [onChange]);

	const clear = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		setIsEmpty(true);
		onChange?.(null);
	}, [onChange]);

	const getDataUrl = useCallback(() => {
		if (isEmpty) return null;
		return canvasRef.current?.toDataURL() ?? null;
	}, [isEmpty]);

	return {
		canvasRef,
		isEmpty,
		startDrawing,
		draw,
		stopDrawing,
		clear,
		getDataUrl,
	};
}
