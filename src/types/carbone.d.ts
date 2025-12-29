declare module 'carbone' {
	export function render(
		templatePath: string,
		data: any,
		options: any,
		callback: (err: any, result: Buffer) => void,
	): void;
}
