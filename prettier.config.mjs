/** @type {import("prettier").Options} */
export default {
	printWidth: 80,
	semi: true,
	singleQuote: true,
	tabWidth: 2,
	trailingComma: 'all',
	useTabs: true,

	// IMPORTANTE: prettier-plugin-tailwindcss debe ir al final
	plugins: ['prettier-plugin-astro', 'prettier-plugin-tailwindcss'],

	overrides: [
		{
			files: '*.astro',
			options: {
				parser: 'astro',
			},
		},
	],
};
