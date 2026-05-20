import { Field, FieldGroup, FieldLabel } from '@components/ui/Field';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@components/ui/Select';
import type { EmpresaDetail } from '../../../types';
import {
	FILING_DISCLOSURE_OPTIONS,
	MANAGEMENT_OPTIONS,
	MEMBERS_INFO_OPTIONS,
} from '../constants';

interface Props {
	empresa: EmpresaDetail;
	canEditDetails: boolean;
	isManagerManaged: boolean;
}

export default function CompanyStructureSection({
	empresa,
	canEditDetails,
	isManagerManaged,
}: Props) {
	return (
		<section className="flex flex-col gap-4 border-gray-200 pt-5 dark:border-gray-700">
			<h3 className="text-sm font-semibold">Estructura</h3>
			<FieldGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				<Field data-disabled={!canEditDetails}>
					<FieldLabel htmlFor="forma_administracion">
						Forma de administrar
					</FieldLabel>
					<Select
						name="forma_administracion"
						defaultValue={empresa.forma_administracion ?? ''}
						disabled={!canEditDetails}
					>
						<SelectTrigger id="forma_administracion" className="w-full">
							<SelectValue placeholder="Seleccione" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								{MANAGEMENT_OPTIONS.map((item) => (
									<SelectItem key={item.value} value={item.value}>
										{item.label}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</Field>

				<Field data-disabled={!canEditDetails}>
					<FieldLabel htmlFor="informacion_miembros">
						Informacion de miembros
					</FieldLabel>
					<Select
						name="informacion_miembros"
						defaultValue={empresa.informacion_miembros ?? ''}
						disabled={!canEditDetails}
					>
						<SelectTrigger id="informacion_miembros" className="w-full">
							<SelectValue placeholder="Seleccione" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								{MEMBERS_INFO_OPTIONS.map((item) => (
									<SelectItem key={item.value} value={item.value}>
										{item.label}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</Field>

				<Field data-disabled={!canEditDetails}>
					<FieldLabel htmlFor="member_filing_disclosure">
						Divulgacion registral de miembros
					</FieldLabel>
					<Select
						name="member_filing_disclosure"
						defaultValue={
							(empresa as { member_filing_disclosure?: string | null })
								.member_filing_disclosure ?? ''
						}
						disabled={!canEditDetails}
					>
						<SelectTrigger id="member_filing_disclosure" className="w-full">
							<SelectValue placeholder="Seleccione" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								{FILING_DISCLOSURE_OPTIONS.map((item) => (
									<SelectItem key={item.value} value={item.value}>
										{item.label}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</Field>

				{isManagerManaged && (
					<Field data-disabled={!canEditDetails}>
						<FieldLabel htmlFor="manager_filing_disclosure">
							Divulgacion registral de managers
						</FieldLabel>
						<Select
							name="manager_filing_disclosure"
							defaultValue={
								(empresa as { manager_filing_disclosure?: string | null })
									.manager_filing_disclosure ?? ''
							}
							disabled={!canEditDetails}
						>
							<SelectTrigger id="manager_filing_disclosure" className="w-full">
								<SelectValue placeholder="Seleccione" />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									{FILING_DISCLOSURE_OPTIONS.map((item) => (
										<SelectItem key={item.value} value={item.value}>
											{item.label}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</Field>
				)}
			</FieldGroup>
		</section>
	);
}
