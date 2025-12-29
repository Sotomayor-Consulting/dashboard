import type { endpointsToOperations } from '../pages/api/[...entity].js';
import type { playgroundActions } from '../pages/playground/_actions.js';

export type EndpointsToOperations = typeof endpointsToOperations;
export type Endpoint = keyof EndpointsToOperations;

export type Products = Product[];
export interface Product {
	name: string;
	category: string;
	technology: string;
	id: number;
	description: string;
	price: string;
	discount: string;
}

export type Users = User[];
export interface User {
	id: number;
	name: string;
	avatar: string;
	email: string;
	biography: string;
	position: string;
	country: string;
	status: string;
}

export type PlaygroundAction = (typeof playgroundActions)[number];

// src/types/carbone.d.ts
declare module 'carbone' {
	// Definimos una estructura básica para evitar errores de linting
	export function render(
		templatePath: string,
		data: any,
		options: any,
		callback: (err: Error | null, result: string | Buffer) => void,
	): void;

	export function set(options: any): void;
	// Puedes agregar más métodos si los necesitas
}
