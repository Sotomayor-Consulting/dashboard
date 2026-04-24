import { Badge } from '@components/components/ui/badge';
import { Button, buttonVariants } from '@components/components/ui/button';
import { cn } from '@components/lib/utils';
import { useState } from 'react';
import {
	Building2,
	Calendar,
	CheckCircle2,
	Circle,
	Clock,
	ChevronDown,
	ExternalLink,
	FileText,
	MessageSquare,
	Phone,
} from 'lucide-react';
import type { ClientWorkflowProgressData } from '../services/getClientWorkflowProgress';

interface Props {
	data: ClientWorkflowProgressData;
}

const formatDate = (iso: string | null) => {
	if (!iso) return 'Sin fecha estimada';
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return 'Sin fecha estimada';
	return new Intl.DateTimeFormat('es-EC', {
		day: '2-digit',
		month: 'long',
		year: 'numeric',
	}).format(date);
};

const stageLabel: Record<string, string> = {
	completed: 'Completada',
	in_progress: 'En curso',
	pending: 'Pendiente',
};

const taskBadge: Record<string, { label: string; className: string }> = {
	pending: {
		label: 'Pendiente',
		className:
			'bg-gray-100 text-gray-600 dark:bg-gray-900/40 dark:text-gray-300',
	},
	in_progress: {
		label: 'En curso',
		className:
			'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
	},
	blocked: {
		label: 'Bloqueada',
		className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
	},
};

const defaultTaskBadge = {
	label: 'Pendiente',
	className: 'bg-gray-100 text-gray-600 dark:bg-gray-900/40 dark:text-gray-300',
};

const getStageIcon = (status: string) => {
	if (status === 'completed') {
		return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
	}
	if (status === 'in_progress') {
		return <Clock className="h-5 w-5 text-amber-500" />;
	}
	return <Circle className="h-5 w-5 text-gray-400" />;
};

export default function ClientWorkflowProgressIsland({ data }: Props) {
	const [showMeetingIframe, setShowMeetingIframe] = useState(false);

	const showPlanningMeetingEmbed = data.stages.some(
		(stage) => stage.slug === 'planning_meeting' && stage.status === 'in_progress',
	);

	return (
		<section className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
			{showPlanningMeetingEmbed && (
				<div className="from-amber-50/60 to-white-50 dark:from-black-900 dark:to-black-800 rounded-lg border border-amber-200/70 bg-linear-to-br p-4 shadow-sm sm:p-6 xl:col-span-3 dark:border-gray-700">
					<div className="mb-4 inline-flex rounded-md border border-amber-200 bg-white p-1 text-xs dark:border-gray-700 dark:bg-black-900/40">
						<span className="rounded px-2 py-1 font-medium text-gray-500 dark:text-gray-300">
							Etapa activa
						</span>
						<span className="rounded bg-amber-100 px-2 py-1 font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
							Planning Meeting
						</span>
					</div>

					<div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
						<div className="max-w-2xl">
							<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
								Agenda tu reunion de planificacion
							</h3>
							<p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
								Cuando estes listo, presiona el boton y te mostramos el calendario.
							</p>
							<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
								Duracion estimada: 45-60 min. Recibiras confirmacion por correo.
							</p>
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setShowMeetingIframe((prev) => !prev)}
								aria-expanded={showMeetingIframe}
								aria-controls="zcal-meeting-panel"
							>
								{showMeetingIframe ? 'Ocultar agenda' : 'Agendar reunion'}
								<ChevronDown
									className={cn(
										'ml-2 h-4 w-4 transition-transform',
										showMeetingIframe && 'rotate-180',
									)}
								/>
							</Button>
							<a
								href="https://zcal.co/i/_nojN-RO"
								target="_blank"
								rel="noreferrer noopener"
								className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
							>
								Abrir nueva pestaña
								<ExternalLink className="ml-2 h-4 w-4" />
							</a>
						</div>
					</div>

					{showMeetingIframe && (
						<div
							id="zcal-meeting-panel"
							className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-inner dark:border-gray-700 dark:bg-black"
						>
							<iframe
								src="https://zcal.co/i/_nojN-RO?embed=1&embedType=iframe"
								loading="lazy"
								className="w-full"
								style={{
									border: 'none',
									minWidth: '320px',
									minHeight: '544px',
									height: '840px',
								}}
								id="zcal-invite"
								scrolling="no"
								title="Agenda tu reunion"
							/>
						</div>
					)}
				</div>
			)}

			<div className="dark:bg-black-800 bg-white-50 rounded-lg border border-gray-200 p-4 shadow-sm sm:p-6 xl:col-span-2 dark:border-gray-700">
				<div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
					<div>
						<p className="text-sm text-gray-500 dark:text-gray-400">Mi incorporación</p>
						<h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
							{data.companyName}
						</h2>
						<div className="mt-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
							<Building2 className="h-4 w-4" />
							<span>{data.businessType ?? 'Sin tipo de negocio'}</span>
						</div>
					</div>
					<div className="flex gap-2">
						<Button variant="outline" size="sm">
							<Phone className="mr-2 h-4 w-4" />
							Contactar asesor
						</Button>
						<Button variant="outline" size="sm">
							<MessageSquare className="mr-2 h-4 w-4" />
							Enviar mensaje
						</Button>
					</div>
				</div>

				<div className="mb-3 flex items-center justify-between text-sm">
					<span className="text-gray-500 dark:text-gray-400">Progreso general</span>
					<span className="font-semibold text-gray-900 dark:text-white">
						{data.progressPercent}%
					</span>
				</div>
				<div className="mb-3 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
					<div
						className="h-2 rounded-full bg-[#8c681d] dark:bg-[#134aed]"
						style={{ width: `${data.progressPercent}%` }}
					/>
				</div>
				<div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
					<span>
						{data.completedStages} de {data.totalStages} etapas completadas
					</span>
					<span>-</span>
					<span>Estado: {data.workflowStatus}</span>
				</div>
				<div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
					<Calendar className="h-4 w-4" />
					<span>Fecha estimada: {formatDate(data.estimatedCompletion)}</span>
				</div>
			</div>

			<div className="dark:bg-black-800 bg-white-50 rounded-lg border border-gray-200 p-4 shadow-sm sm:p-6 dark:border-gray-700">
				<h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">
					Novedades recientes
				</h3>
				{data.notifications.length === 0 ? (
					<p className="text-sm text-gray-500 dark:text-gray-400">
						Aun no hay notificaciones para mostrar.
					</p>
				) : (
					<div className="space-y-3">
						{data.notifications.map((note) => (
							<div key={note.id} className="rounded-md bg-gray-50 p-3 dark:bg-gray-900/40">
								<p className="text-sm text-gray-800 dark:text-gray-200">{note.message}</p>
								<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{note.time}</p>
							</div>
						))}
					</div>
				)}
			</div>

			<div className="dark:bg-black-800 bg-white-50 rounded-lg border border-gray-200 p-4 shadow-sm sm:p-6 xl:col-span-2 dark:border-gray-700">
				<h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
					Etapas del proceso
				</h3>
				{data.stages.length === 0 ? (
					<p className="text-sm text-gray-500 dark:text-gray-400">
						Tu workflow aun no se ha inicializado.
					</p>
				) : (
					<div className="space-y-2">
						{data.stages.map((stage) => (
							<div
								key={stage.id}
								className="flex items-center gap-3 rounded-md border border-gray-100 p-3 dark:border-gray-700"
							>
								{getStageIcon(stage.status)}
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-medium text-gray-900 dark:text-white">
										{stage.name}
									</p>
									{stage.dueAt && (
										<p className="text-xs text-gray-500 dark:text-gray-400">
											Fecha objetivo: {formatDate(stage.dueAt)}
										</p>
									)}
								</div>
								<Badge variant="secondary">{stageLabel[stage.status]}</Badge>
							</div>
						))}
					</div>
				)}
			</div>

			<div className="space-y-4">
				<div className="dark:bg-black-800 bg-white-50 rounded-lg border border-gray-200 p-4 shadow-sm sm:p-6 dark:border-gray-700">
					<h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">
						Mis tareas pendientes
					</h3>
					{data.pendingClientTasks.length === 0 ? (
						<p className="text-sm text-gray-500 dark:text-gray-400">
							No tienes tareas pendientes por ahora.
						</p>
					) : (
						<div className="space-y-3">
							{data.pendingClientTasks.map((task) => {
								const badge = taskBadge[task.status] ?? defaultTaskBadge;

								return (
									<div key={task.id} className="rounded-md bg-gray-50 p-3 dark:bg-gray-900/40">
										<div className="mb-2 flex items-center justify-between gap-2">
											<p className="text-sm font-medium text-gray-900 dark:text-white">
												{task.title}
											</p>
											<Badge variant="secondary" className={badge.className}>
												{badge.label}
											</Badge>
										</div>
										<div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
											{task.stageName && <p>Etapa: {task.stageName}</p>}
											<p>Fecha objetivo: {formatDate(task.dueAt)}</p>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>

				<div className="dark:bg-black-800 bg-white-50 rounded-lg border border-gray-200 p-4 shadow-sm sm:p-6 dark:border-gray-700">
					<h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">
						Proximos eventos
					</h3>
					{data.upcomingEvents.length === 0 ? (
						<p className="text-sm text-gray-500 dark:text-gray-400">
							No hay eventos proximos.
						</p>
					) : (
						<div className="space-y-3">
							{data.upcomingEvents.map((event) => (
								<div key={event.id} className="flex items-start gap-3 rounded-md bg-gray-50 p-3 dark:bg-gray-900/40">
									<FileText className="mt-0.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
									<div>
										<p className="text-sm font-medium text-gray-900 dark:text-white">{event.title}</p>
										<p className="text-xs text-gray-500 dark:text-gray-400">
											{formatDate(event.date)}
										</p>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</section>
	);
}
