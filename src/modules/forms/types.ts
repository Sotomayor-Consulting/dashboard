export interface States {
	id: number | null;
	name: string;
	code: string
}

export interface StepsWizardProps {
	estados: States[];
}

export interface IncorpData {
	tipo_de_empresa: string;
	estado_de_empresa: string;
	nombre_1: string;
	nombre_2: string;
	nombre_3: string;
	estado_de: string;
}
