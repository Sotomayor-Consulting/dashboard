/** @type {import("prettier").Options} */
module.exports = {
	printWidth: 80,
	semi: true,
	singleQuote: true,
	tabWidth: 2,
	trailingComma: 'all',
	useTabs: true,
  
	// CAMBIA ESTA LÍNEA - usa solo el nombre del plugin
	plugins: ['prettier-plugin-astro'],
	
	overrides: [
	  {
		files: '*.astro',
		options: {
		  parser: 'astro',
		},
	  },
	],
  };