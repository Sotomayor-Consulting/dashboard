import { Icon } from '@iconify/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Input } from '@components/ui/Input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@components/ui/Select';

import type { EstadoOption } from '../../services/get-client-form-data';

const NAME_MAX = 100;

interface Props {
	empresaId: string;
	/** 3 opciones de nombre en orden de preferencia. */
	initialNames: [string, string, string];
	/** Estado de incorporación actual (texto). */
	estado: string | null;
	/** Lista de estados disponibles. */
	estados: EstadoOption[];
	/** Notifica al wizard cuando cambia el estado (para re-evaluar reglas). */
	onEstadoChange: (estado: string) => void;
}

type EditKey = 0 | 1 | 2 | 'estado';

/**
 * Identity Card — pantalla 1 (Bienvenida).
 *
 * Tarjeta editable con los datos pre-cargados de la solicitud: 3 opciones de
 * nombre (en orden de preferencia) + estado de incorporación. Edición inline
 * por campo (lápiz) o global ("Editar todo"). Persiste en
 * `empresas_incorporaciones` vía `/api/incorporations/update-identity`.
 *
 * No hay verificación automática de disponibilidad: se muestran etiquetas
 * estáticas (1ª preferencia / Alternativa). La validación de disponibilidad
 * la realiza el equipo de Sotomayor.
 */
export function IdentityCard({
	empresaId,
	initialNames,
	estado,
	estados,
	onEstadoChange,
}: Props) {
	const [names, setNames] = useState<[string, string, string]>(initialNames);
	const [selectedIdx, setSelectedIdx] = useState<0 | 1 | 2>(0);
	const [currentEstado, setCurrentEstado] = useState<string>(estado ?? '');
	const [editing, setEditing] = useState<Set<EditKey>>(new Set());
	const [dirty, setDirty] = useState(false);
	const [saving, setSaving] = useState(false);

	/**
	 * Construye el payload canónico de nombres: el seleccionado se persiste
	 * como `nombre_1` (preferencia), el resto en su orden de display. Así la
	 * lista visual no se reordena pero la preferencia queda registrada.
	 */
	const buildNamesPayload = (arr: [string, string, string], sel: 0 | 1 | 2) => {
		const rest = arr.filter((_, i) => i !== sel);
		return {
			nombre_1: arr[sel],
			nombre_2: rest[0] ?? '',
			nombre_3: rest[1] ?? '',
		};
	};

	const allEditing = editing.size === 4;

	const setEdit = (key: EditKey, on: boolean) =>
		setEditing((prev) => {
			const next = new Set(prev);
			if (on) next.add(key);
			else next.delete(key);
			return next;
		});

	const persist = useCallback(
		async (payload: Record<string, string>) => {
			setSaving(true);
			try {
				const res = await fetch('/api/incorporations/update-identity', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						empresa_incorporacion_id: empresaId,
						...payload,
					}),
				});
				if (res.ok) setDirty(false);
			} catch (e) {
				console.error('Error guardando identidad', e);
			} finally {
				setSaving(false);
			}
		},
		[empresaId],
	);

	const codeFor = (nombre: string): string => {
		const match = estados.find((e) => e.nombre === nombre);
		if (match?.codigo) return match.codigo.toUpperCase();
		return nombre.slice(0, 2).toUpperCase() || '—';
	};

	// ── Editar todo / Guardar todo ──────────────────────────────
	const toggleEditAll = () => {
		if (allEditing) {
			// Guardar todos
			void persist({
				...buildNamesPayload(names, selectedIdx),
				estado_de_incorporacion: currentEstado,
			});
			setEditing(new Set());
		} else {
			setEditing(new Set<EditKey>([0, 1, 2, 'estado']));
		}
	};

	const commitName = (idx: 0 | 1 | 2) => {
		setEdit(idx, false);
		// Persistimos el triple canónico (preferida = nombre_1) sin reordenar
		// la lista visual.
		void persist(buildNamesPayload(names, selectedIdx));
	};

	// Selecciona una opción como preferida: el nombre queda en su posición
	// visual; solo se mueve el check. La preferencia se persiste como nombre_1.
	const selectName = (idx: 0 | 1 | 2) => {
		setSelectedIdx(idx);
		setDirty(false);
		void persist(buildNamesPayload(names, idx));
	};

	const commitEstado = (value: string) => {
		setCurrentEstado(value);
		setDirty(false);
		onEstadoChange(value);
		setEdit('estado', false);
		void persist({ estado_de_incorporacion: value });
	};

	return (
		<div
			className="mb-8 rounded-[14px] border p-[22px]"
			style={{
				borderColor: 'var(--cf-line)',
				background: 'var(--cf-bg-card)',
			}}
		>
			{/* Header */}
			<div className="mb-5 flex items-start justify-between gap-4">
				<div className="min-w-0">
					<div
						className="text-[11.5px] font-medium tracking-[0.06em] uppercase"
						style={{ color: 'var(--cf-ink-soft)' }}
					>
						Datos pre-cargados de tu solicitud
					</div>
					<div className="mt-0.5 flex items-center gap-2.5">
						<h2
							className="text-[16px] font-semibold tracking-[-0.01em]"
							style={{ color: 'var(--cf-ink)' }}
						>
							Confirma la identidad de tu empresa
						</h2>
						{dirty && (
							<span
								className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
								style={{
									background: 'var(--cf-warn-soft)',
									color: 'var(--cf-warn)',
								}}
							>
								Cambios sin guardar
							</span>
						)}
					</div>
				</div>
				<button
					type="button"
					onClick={toggleEditAll}
					aria-expanded={allEditing}
					disabled={saving}
					className="inline-flex shrink-0 items-center gap-1.5 rounded-[7px] border px-3 py-[7px] text-[12.5px] font-medium transition-all hover:opacity-90"
					style={{
						borderColor: allEditing ? 'var(--cf-ink)' : 'var(--cf-line)',
						background: allEditing ? 'var(--cf-ink)' : 'var(--cf-bg-card)',
						color: allEditing ? 'var(--cf-bg-card)' : 'var(--cf-ink)',
					}}
				>
					<Icon
						icon={allEditing ? 'ri:check-line' : 'ri:pencil-line'}
						className="h-3 w-3"
					/>
					{allEditing ? 'Guardar cambios' : 'Editar todo'}
				</button>
			</div>

			{/* Layout vertical: nombres en fila, estado debajo */}
			<div className="flex flex-col gap-[22px]">
				{/* ── Opciones de nombre (en línea) ── */}
				<div>
					<div
						className="mb-2.5 text-[11px] font-medium tracking-[0.04em] uppercase"
						style={{ color: 'var(--cf-ink-soft)' }}
					>
						Opciones de nombre · marca tu preferida
					</div>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
						{names.map((name, idx) => (
							<NameRow
								key={idx}
								index={idx as 0 | 1 | 2}
								name={name}
								selected={idx === selectedIdx}
								onSelect={() => selectName(idx as 0 | 1 | 2)}
								editing={editing.has(idx as EditKey)}
								onEdit={() => setEdit(idx as EditKey, true)}
								onChange={(v) => {
									setNames((prev) => {
										const next = [...prev] as [string, string, string];
										next[idx] = v;
										return next;
									});
									setDirty(true);
								}}
								onCommit={() => commitName(idx as 0 | 1 | 2)}
								onCancel={() => {
									setNames((prev) => {
										const next = [...prev] as [string, string, string];
										next[idx] = initialNames[idx];
										return next;
									});
									setEdit(idx as EditKey, false);
								}}
							/>
						))}
					</div>
				</div>

				{/* ── Estado de incorporación (debajo) ── */}
				<div>
					<div
						className="mb-2.5 text-[11px] font-medium tracking-[0.04em] uppercase"
						style={{ color: 'var(--cf-ink-soft)' }}
					>
						Estado de incorporación
					</div>

					<div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
						{/* Card / select del estado */}
						<div className="w-full sm:w-[280px] sm:shrink-0">
							{editing.has('estado') ? (
								<Select value={currentEstado} onValueChange={commitEstado}>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Selecciona un estado" />
									</SelectTrigger>
									<SelectContent>
										{estados.map((e) => (
											<SelectItem key={e.nombre} value={e.nombre}>
												{e.codigo ? `${e.codigo} · ${e.nombre}` : e.nombre}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							) : (
								<div
									className="flex h-full items-center gap-3 rounded-[10px] border p-[14px]"
									style={{
										borderColor: 'var(--cf-line)',
										background: 'var(--cf-bg-rail)',
										minHeight: 86,
									}}
								>
									<div
										className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] border text-[14px] font-semibold tracking-[0.04em]"
										style={{
											background: 'var(--cf-bg-card)',
											borderColor: 'var(--cf-line)',
											color: 'var(--cf-ink)',
										}}
									>
										{currentEstado ? codeFor(currentEstado) : '—'}
									</div>
									<div className="min-w-0 flex-1">
										<div
											className="truncate text-[14px] font-semibold tracking-[-0.005em]"
											style={{ color: 'var(--cf-ink)' }}
										>
											{currentEstado || 'Sin estado'}
										</div>
										<div
											className="mt-0.5 text-[11.5px]"
											style={{ color: 'var(--cf-ink-soft)' }}
										>
											Estado seleccionado
										</div>
									</div>
									<button
										type="button"
										onClick={() => setEdit('estado', true)}
										aria-label="Editar estado de incorporación"
										className="inline-flex shrink-0 p-1.5"
										style={{ color: 'var(--cf-ink-mute)' }}
									>
										<Icon icon="ri:pencil-line" className="h-3.5 w-3.5" />
									</button>
								</div>
							)}
						</div>

						{/* Divider vertical */}
						<div
							className="hidden w-px shrink-0 sm:block"
							style={{ background: 'var(--cf-line)' }}
							aria-hidden="true"
						/>

						{/* Microcopy a la derecha */}
						<div
							className="flex flex-1 items-start gap-1.5 text-[12px] leading-[1.55] sm:items-center"
							style={{ color: 'var(--cf-ink-mute)' }}
						>
							<Icon
								icon="ri:information-line"
								className="mt-0.5 h-3.5 w-3.5 shrink-0 sm:mt-0"
								style={{ color: 'var(--cf-ink-soft)' }}
							/>
							El estado determina las regulaciones, los impuestos estatales y el
							agente registrado de tu empresa.
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

// ── Row de nombre ─────────────────────────────────────────────
interface NameRowProps {
	index: 0 | 1 | 2;
	name: string;
	selected: boolean;
	onSelect: () => void;
	editing: boolean;
	onEdit: () => void;
	onChange: (v: string) => void;
	onCommit: () => void;
	onCancel: () => void;
}

function NameRow({
	index,
	name,
	selected,
	onSelect,
	editing,
	onEdit,
	onChange,
	onCommit,
	onCancel,
}: NameRowProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const badge = String(index + 1).padStart(2, '0');

	useEffect(() => {
		if (editing) inputRef.current?.focus();
	}, [editing]);

	if (editing) {
		return (
			<div
				className="flex flex-col gap-2 rounded-[10px] border-[1.5px] p-[10px_12px]"
				style={{
					borderColor: 'var(--cf-ink)',
					background: 'var(--cf-bg-card)',
				}}
			>
				<div
					className="flex items-center justify-between text-[10.5px] tabular-nums"
					style={{ color: 'var(--cf-ink-soft)' }}
				>
					<span>Editando opción {badge}</span>
					<span>
						{name.length} / {NAME_MAX}
					</span>
				</div>
				<div className="flex items-center gap-1.5">
					<Input
						ref={inputRef}
						value={name}
						maxLength={NAME_MAX}
						onChange={(e) => onChange(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								e.preventDefault();
								onCommit();
							}
							if (e.key === 'Escape') {
								e.preventDefault();
								onCancel();
							}
						}}
						onBlur={onCommit}
						className="h-9 min-w-0 flex-1"
						placeholder={`Opción ${badge}`}
					/>
					<button
						type="button"
						onMouseDown={(e) => {
							e.preventDefault();
							onCommit();
						}}
						aria-label="Confirmar nombre"
						className="inline-flex shrink-0 p-1"
						style={{ color: 'var(--cf-accent-ink)' }}
					>
						<Icon icon="ri:check-line" className="h-4 w-4" />
					</button>
				</div>
			</div>
		);
	}

	return (
		<div
			className="flex items-center gap-2.5 transition-colors"
			style={{
				padding: '12px 14px',
				border: selected
					? '1.5px solid var(--cf-ink)'
					: '1px solid var(--cf-line)',
				borderRadius: 10,
				background: selected ? 'var(--cf-bg-card)' : 'var(--cf-bg-rail)',
			}}
		>
			{/* Radio de selección */}
			<button
				type="button"
				onClick={onSelect}
				role="radio"
				aria-checked={selected}
				aria-label={`Marcar la opción ${badge} como preferida`}
				className="grid h-[20px] w-[20px] shrink-0 cursor-pointer place-items-center rounded-full border-[1.5px] transition-colors"
				style={{
					borderColor: selected ? 'var(--cf-accent)' : 'var(--cf-line-strong)',
					background: selected ? 'var(--cf-accent)' : 'var(--cf-bg-card)',
				}}
			>
				{selected && (
					<Icon icon="ri:check-line" className="h-3 w-3 text-white" />
				)}
			</button>

			<div className="min-w-0 flex-1">
				<div
					className="truncate font-semibold tracking-[-0.005em]"
					style={{
						fontSize: selected ? 14.5 : 13.5,
						fontWeight: selected ? 600 : 500,
						color: 'var(--cf-ink)',
					}}
				>
					{name || (
						<span style={{ color: 'var(--cf-ink-faint)' }}>Sin nombre</span>
					)}
				</div>
				<div
					className="mt-0.5 text-[11.5px]"
					style={{
						color: selected ? 'var(--cf-accent-ink)' : 'var(--cf-ink-soft)',
					}}
				>
					{selected ? 'Preferencia principal' : 'Alternativa'}
				</div>
			</div>

			<button
				type="button"
				onClick={onEdit}
				aria-label={`Editar nombre ${badge}`}
				className="inline-flex shrink-0 p-1.5 transition-colors hover:opacity-70"
				style={{ color: 'var(--cf-ink-mute)' }}
			>
				<Icon icon="ri:pencil-line" className="h-3.5 w-3.5" />
			</button>
		</div>
	);
}
