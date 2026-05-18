document.addEventListener('click', async (e) => {
	const target = e.target as HTMLElement;

	const copyBtn = target.closest(
		'.btn-copy-passcode',
	) as HTMLButtonElement | null;
	if (copyBtn) {
		e.preventDefault();
		const passcode = copyBtn.dataset.passcode;
		if (!passcode) return;

		try {
			await navigator.clipboard.writeText(passcode);
		} catch (err) {
			console.error('Error copying passcode:', err);
		}

		const defaultIcon = copyBtn.querySelector(
			'.icon-default',
		) as HTMLElement | null;
		const copiedIcon = copyBtn.querySelector(
			'.icon-copied',
		) as HTMLElement | null;
		if (defaultIcon && copiedIcon) {
			defaultIcon.classList.add('hidden');
			copiedIcon.classList.remove('hidden');
			window.setTimeout(() => {
				defaultIcon.classList.remove('hidden');
				copiedIcon.classList.add('hidden');
			}, 1800);
		}
		return;
	}

	const approveBtn = target.closest(
		'.btn-planning-approve',
	) as HTMLButtonElement | null;
	if (approveBtn) {
		e.preventDefault();
		const stageId = approveBtn.dataset.stageId;
		if (!stageId) return;

		const confirmed = window.confirm(
			'¿Aprobar la planificación y diseño? Esto avanzará tu incorporación al siguiente paso.',
		);
		if (!confirmed) return;

		approveBtn.disabled = true;
		const originalText = approveBtn.textContent;
		approveBtn.textContent = ' Aprobando...';

		try {
			const res = await fetch('/api/workflow/planning/decision', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ stageId, decision: 'approved' }),
			});
			const data = await res.json();
			if (!res.ok || !data.ok) {
				throw new Error(data.error || 'Error al aprobar la planificación');
			}
			window.location.reload();
		} catch (error) {
			console.error('Error approving planning:', error);
			alert(
				error instanceof Error
					? error.message
					: 'Error al aprobar la planificación',
			);
			approveBtn.disabled = false;
			if (originalText) approveBtn.textContent = originalText;
		}
		return;
	}

	const btn = target.closest('.btn-booking-intent') as HTMLButtonElement | null;
	if (!btn) return;

	e.preventDefault();

	const href = btn.dataset.href;
	const empresaId = btn.dataset.empresaId;
	if (!href || !empresaId) return;

	btn.disabled = true;
	const originalText = btn.textContent;
	btn.textContent = ' Preparando...';

	try {
		const res = await fetch('/api/meetings/create-booking-intent', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ empresa_id: empresaId }),
		});
		const data = await res.json();

		if (!res.ok || !data.success) {
			throw new Error(data.error || 'Error al preparar la reunión');
		}

		window.open(href, '_blank');
	} catch (error) {
		console.error('Error creating booking intent:', error);
		alert('Error al preparar el agendamiento. Intenta de nuevo.');
	} finally {
		btn.disabled = false;
		if (originalText) btn.textContent = originalText;
	}
});

document.addEventListener('submit', async (e) => {
	const form = e.target as HTMLFormElement | null;
	if (!form?.classList.contains('planning-reject-form')) return;

	e.preventDefault();
	const stageId = form.dataset.stageId;
	const textarea = form.querySelector(
		'textarea[name="comments"]',
	) as HTMLTextAreaElement | null;
	const comments = textarea?.value.trim();

	if (!stageId || !comments || comments.length < 5) {
		alert('Por favor describe qué necesitas corregir (mínimo 5 caracteres).');
		return;
	}

	const submitBtn = form.querySelector(
		'button[type="submit"]',
	) as HTMLButtonElement | null;
	if (submitBtn) submitBtn.disabled = true;

	try {
		const res = await fetch('/api/workflow/planning/decision', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ stageId, decision: 'rejected', comments }),
		});
		const data = await res.json();
		if (!res.ok || !data.ok) {
			throw new Error(data.error || 'Error al rechazar la planificación');
		}
		window.location.reload();
	} catch (error) {
		console.error('Error rejecting planning:', error);
		alert(
			error instanceof Error
				? error.message
				: 'Error al rechazar la planificación',
		);
		if (submitBtn) submitBtn.disabled = false;
	}
});
