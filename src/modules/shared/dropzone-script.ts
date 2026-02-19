// src/scripts/dropzone-contract.ts
import Dropzone from 'dropzone';

Dropzone.autoDiscover = false;

document.addEventListener('DOMContentLoaded', () => {
	const form = document.querySelector<HTMLFormElement>('#my-dropzone');
	if (!form) return;

	const dz = new Dropzone(form, {
		url: form.getAttribute('action') || '/api/update/contrato-partner-upload',
		method: 'post',

		// Debe coincidir con formData.get("contract_file") en tu endpoint:
		paramName: 'contract_file',

		maxFiles: 1,
		uploadMultiple: false,
		acceptedFiles: 'application/pdf',
		maxFilesize: 5, // MB

		addRemoveLinks: true,
		dictDefaultMessage:
			'Arrastra aquí tu contrato firmado o haz clic para subir.',
		dictRemoveFile: 'Eliminar archivo',
	});

	dz.on('success', (file: any) => {
		const xhr = file?.xhr;
		if (xhr && xhr.responseURL) {
			// Sigues la redirección que manda tu endpoint
			window.location.href = xhr.responseURL;
		} else {
			console.log('Contrato subido correctamente');
		}
	});

	dz.on('error', (file: any, errorMessage: any) => {
		console.error('Error al subir el contrato:', errorMessage);
		alert('Hubo un error al subir el contrato. Intenta de nuevo.');
	});
});
