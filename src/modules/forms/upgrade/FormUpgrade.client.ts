// ─── Upgrade payment flow (Stripe Checkout hosted) ──────
// Tras seleccionar la empresa, llamamos a /api/payment/checkout-session-upgrade
// y redirigimos al Checkout hosted de Stripe.

const ROOT_ID = 'content';

function $<T extends HTMLElement>(
	id: string,
	ctor: { new (): T },
): T | null {
	const el = document.getElementById(id);
	return el instanceof ctor ? el : null;
}

function formatUSD(n: number): string {
	if (!Number.isFinite(n)) return '$0.00';
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(n);
}

export function initUpgradePaymentFlow(): void {
	const root = document.getElementById(ROOT_ID);
	if (!root || root.dataset.upgradePaymentInitialized === 'true') return;
	root.dataset.upgradePaymentInitialized = 'true';

	const cfg = $('stripe-config', HTMLDivElement);
	const empresaInput = $('empresa-id', HTMLInputElement);
	const form = $('payment-form', HTMLFormElement);
	const button = $('pay-button', HTMLButtonElement);
	if (!cfg || !form || !button) return;

	const status = $('status-message', HTMLParagraphElement);
	const baseEl = document.getElementById('summary-base');
	const feeEl = document.getElementById('summary-fee');
	const totalEl = document.getElementById('summary-total');
	const heroTotal = document.getElementById('hero-total');
	const heroCompany = document.getElementById('hero-company');
	const cardCompany = document.getElementById('card-company');
	const buttonLabel = document.getElementById('pay-button-label');

	const userId = cfg.dataset.userId || '';
	const enabled = cfg.dataset.enabled === 'true';
	const serviceId = cfg.dataset.servicioId || '';
	const basePrice = Number(cfg.dataset.basePrice || '600');
	const feePercent = Number(cfg.dataset.feePercent || '0.045');

	const setStatus = (m = '') => {
		if (status) status.textContent = m;
	};

	const updateSummary = () => {
		const fee = basePrice * feePercent;
		const total = basePrice + fee;
		if (baseEl) baseEl.textContent = formatUSD(basePrice);
		if (feeEl) feeEl.textContent = formatUSD(fee);
		if (totalEl) totalEl.textContent = formatUSD(total);
		if (heroTotal) heroTotal.textContent = formatUSD(total);
	};

	if (!enabled) {
		button.disabled = true;
		setStatus('No pudimos habilitar el pago en este momento.');
	}

	let isSubmitting = false;
	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		if (isSubmitting || !enabled) return;

		const empresaId = empresaInput?.value || '';
		if (!empresaId) {
			setStatus('No hay una empresa elegible para el upgrade.');
			return;
		}
		if (!serviceId) {
			setStatus('No pudimos validar el servicio de upgrade.');
			return;
		}

		isSubmitting = true;
		button.disabled = true;
		const originalContent = button.innerHTML;
		button.innerHTML = `
			<svg class="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
			</svg>
			<span class="sr-only">Redirigiendo a Stripe…</span>
		`;
		setStatus('');

		try {
			const response = await fetch('/api/payment/checkout-session-upgrade', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userId,
					empresaId,
					servicio: { id: serviceId },
				}),
			});
			const text = await response.text();
			let data: any = null;
			try {
				data = text ? JSON.parse(text) : null;
			} catch {
				/* not json */
			}
			if (!response.ok || !data?.url) {
				console.error('[Upgrade payment] response', {
					status: response.status,
					body: data ?? text,
				});
				throw new Error(
					(data && data.error) ||
						`HTTP ${response.status}: ${text.slice(0, 200)}`,
				);
			}
			window.location.href = data.url;
		} catch (err) {
			console.error('[Upgrade payment] checkout error:', err);
			setStatus(
				`No se pudo iniciar el pago: ${
					err instanceof Error ? err.message : 'error desconocido'
				}`,
			);
			isSubmitting = false;
			button.disabled = false;
			button.innerHTML = originalContent;
		}
	});

	updateSummary();
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initUpgradePaymentFlow, {
		once: true,
	});
} else {
	initUpgradePaymentFlow();
}

document.addEventListener('astro:page-load', initUpgradePaymentFlow);
