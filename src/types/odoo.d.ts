export interface OdooPartner {
	id: number;
	name: string;
	email: string | boolean;
	phone: string | boolean;
	city?: string | boolean;
	sale_order_ids?: array | boolean;
	// Agrega aquí otros campos que necesites
}

export interface ServiceResponse<T> {
	success: boolean;
	data: T;
	error?: string;
}
