export interface StateInfo {
	name: string;
	abbreviation: string;
	capital: string;
	color: string;
	website: string;
	timezone: string;
	incorporationFee: string;
	annualReportFee: string;
	filingTime: string;
	benefits: string[];
	taxInfo: {
		corporateIncomeTax: string;
		personalIncomeTax: string;
		salesTax: string;
		franchiseTax: string;
	};
	legalDetails: {
		privacyLevel: string;
		assetProtection: string;
		seriesLLC: boolean;
	};
}

export const STATES_DATA: Record<string, StateInfo> = {
	Florida: {
		name: 'Florida',
		abbreviation: 'FL',
		capital: 'Tallahassee',
		color: '#0ea5e9',
		website: 'dos.fl.gov',
		timezone: 'EST (UTC-5)',
		incorporationFee: '$125',
		annualReportFee: '$138.75',
		filingTime: '5–10 días',
		benefits: [
			'Sin impuesto estatal a la renta personal',
			'Acceso a mercado turístico y latinoamericano',
			'Costos operativos competitivos',
			'Trámites 100% online',
		],
		taxInfo: {
			corporateIncomeTax: '5.5%',
			personalIncomeTax: '0%',
			salesTax: '6%',
			franchiseTax: 'No aplica',
		},
		legalDetails: {
			privacyLevel: 'Media',
			assetProtection: 'Alta',
			seriesLLC: false,
		},
	},
	Delaware: {
		name: 'Delaware',
		abbreviation: 'DE',
		capital: 'Dover',
		color: '#6366f1',
		website: 'corp.delaware.gov',
		timezone: 'EST (UTC-5)',
		incorporationFee: '$110',
		annualReportFee: '$300',
		filingTime: '1–3 días',
		benefits: [
			'Court of Chancery especializado en derecho corporativo',
			'Privacidad de socios y directores',
			'Estándar para inversores y VC',
			'Sin impuesto a ingresos generados fuera del estado',
		],
		taxInfo: {
			corporateIncomeTax: '8.7%',
			personalIncomeTax: '2.2% – 6.6%',
			salesTax: '0%',
			franchiseTax: 'Desde $300',
		},
		legalDetails: {
			privacyLevel: 'Alta',
			assetProtection: 'Muy alta',
			seriesLLC: true,
		},
	},
	Wyoming: {
		name: 'Wyoming',
		abbreviation: 'WY',
		capital: 'Cheyenne',
		color: '#10b981',
		website: 'sos.wyo.gov',
		timezone: 'MST (UTC-7)',
		incorporationFee: '$100',
		annualReportFee: '$60',
		filingTime: '1–2 días',
		benefits: [
			'Sin impuesto corporativo ni a la renta personal',
			'Máxima privacidad de propietarios',
			'Bajas tarifas anuales',
			'Protección de activos líder en USA',
		],
		taxInfo: {
			corporateIncomeTax: '0%',
			personalIncomeTax: '0%',
			salesTax: '4%',
			franchiseTax: 'No aplica',
		},
		legalDetails: {
			privacyLevel: 'Muy alta',
			assetProtection: 'Muy alta',
			seriesLLC: true,
		},
	},
};

export function getStateInfo(stateName: string | null | undefined): StateInfo | null {
	if (!stateName) return null;
	return STATES_DATA[stateName] ?? null;
}
