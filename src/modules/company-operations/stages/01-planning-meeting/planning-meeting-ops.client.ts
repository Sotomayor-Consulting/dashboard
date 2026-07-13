document.addEventListener('submit', async (e) => {
	const form = e.target as HTMLFormElement | null;
	if (!form?.classList.contains('planning-upload-form')) return;

	e.preventDefault();

	const empresaId = form.dataset.empresaId;
	const fileInput = form.querySelector(
		'input[name="file"]',
	) as HTMLInputElement | null;
	const notesInput = form.querySelector(
		'textarea[name="notes"]',
	) as HTMLTextAreaElement | null;
	const submitBtn = form.querySelector(
		'.planning-upload-submit',
	) as HTMLButtonElement | null;
	const statusEl = form.querySelector(
		'.planning-upload-status',
	) as HTMLElement | null;

	const file = fileInput?.files?.[0];
	if (!empresaId || !file) {
		alert('Selecciona un archivo PDF antes de enviar.');
		return;
	}

	if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
		alert('Solo se aceptan archivos PDF.');
		return;
	}

	const MAX_BYTES = 15 * 1024 * 1024;
	if (file.size > MAX_BYTES) {
		alert('El archivo supera el límite de 15 MB.');
		return;
	}

	if (submitBtn) submitBtn.disabled = true;
	if (statusEl) statusEl.textContent = 'Subiendo documento...';

	try {
		const body = new FormData();
		body.append('caseId', empresaId);
		body.append('file', file);
		const notes = notesInput?.value.trim();
		if (notes) body.append('notes', notes);

		const res = await fetch('/api/workflow/planning/upload-doc', {
			method: 'POST',
			body,
		});
		const data = await res.json().catch(() => null);

		if (!res.ok || !data?.ok) {
			throw new Error(data?.error || 'Error al subir el documento');
		}

		if (statusEl) {
			statusEl.textContent = `Documento v${data.version} enviado al cliente`;
		}
		window.location.reload();
	} catch (error) {
		console.error('Error uploading planning document:', error);
		alert(
			error instanceof Error
				? error.message
				: 'Error al subir el documento de planificación',
		);
		if (submitBtn) submitBtn.disabled = false;
		if (statusEl) statusEl.textContent = 'Tamaño máximo: 15 MB · solo PDF';
	}
});
