import { Icon } from '@iconify/react';
import { useState } from 'react';
import {
	Controller,
	useFieldArray,
	useFormContext,
	useWatch,
} from 'react-hook-form';

import { cn } from '@components/utils';
import { RadioGroup, RadioGroupItem } from '@components/ui/RadioGroup';

import { createEmptyMember } from '../../../data/defaults';
import type { ClientFormData } from '../../../types';
import { MemberForm } from './MemberForm';
import { MembersSummary } from './MembersSummary';
import { PercentageAlert } from './PercentageAlert';

export function StepMembers() {
	const { control } = useFormContext<ClientFormData>();
	const { fields, append, remove } = useFieldArray({
		control,
		name: 'miembros',
		keyName: '_key',
	});

	const [activeTab, setActiveTab] = useState(0);

	const watched = useWatch<ClientFormData>({ control, name: 'miembros' }) as
		| ClientFormData['miembros']
		| undefined;
	const members = watched ?? [];
	const totalPercentage = members.reduce(
		(sum, m) => sum + (m?.porcentaje || 0),
		0,
	);

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-foreground text-2xl font-semibold">
					Información de miembros
				</h2>
				<p className="text-muted-foreground mt-1">
					Datos de los socios de la LLC.
				</p>
			</div>

			<PercentageAlert total={totalPercentage} />

			<div className="border-border overflow-hidden rounded-xl border">
				<div className="bg-muted/30 border-border flex overflow-x-auto border-b">
					{fields.map((field, index) => {
						const member = members[index];
						const firstName = member?.nombreCompleto?.split(' ')[0];
						return (
							<button
								key={field._key}
								type="button"
								onClick={() => setActiveTab(index)}
								className={cn(
									'border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors',
									activeTab === index
										? 'border-accent text-accent bg-card'
										: 'border-transparent text-muted-foreground hover:text-foreground',
								)}
							>
								Socio {index + 1}
								{firstName && (
									<span className="text-muted-foreground ml-1.5 text-xs">
										({firstName})
									</span>
								)}
							</button>
						);
					})}
					<button
						type="button"
						onClick={() => {
							append(createEmptyMember());
							setActiveTab(fields.length);
						}}
						className="text-muted-foreground hover:text-accent flex items-center gap-1 px-4 py-3 text-sm font-medium"
					>
						<Icon icon="ri:add-line" className="h-4 w-4" />
						Agregar
					</button>
				</div>

				<div className="p-4 md:p-6">
					{fields.map((field, index) => (
						<div
							key={field._key}
							className={cn(activeTab !== index && 'hidden')}
						>
							<MemberForm
								index={index}
								memberId={field.id}
								canRemove={fields.length > 1}
								onRemove={() => {
									remove(index);
									setActiveTab(Math.max(0, activeTab - 1));
								}}
							/>
						</div>
					))}
				</div>
			</div>

			<MembersSummary members={members} total={totalPercentage} />

			{/* Privacidad */}
			<fieldset className="space-y-3">
				<legend className="text-foreground text-sm font-medium">
					¿Desea que la información de los miembros sea pública o privada?
				</legend>
				<Controller
					control={control}
					name="informacionMiembrosPublica"
					render={({ field }) => (
						<RadioGroup
							value={field.value ? 'publica' : 'privada'}
							onValueChange={(v) => field.onChange(v === 'publica')}
							className="flex gap-4"
						>
							{[
								{ v: 'publica', label: 'Pública', active: field.value },
								{ v: 'privada', label: 'Privada', active: !field.value },
							].map((opt) => (
								<label
									key={opt.v}
									className={cn(
										'flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 transition-all',
										opt.active
											? 'border-accent bg-accent/5'
											: 'border-border hover:border-accent/50',
									)}
								>
									<RadioGroupItem value={opt.v} />
									<span className="text-sm">{opt.label}</span>
								</label>
							))}
						</RadioGroup>
					)}
				/>
			</fieldset>
		</div>
	);
}
