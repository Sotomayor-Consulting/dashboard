type StripeConstructor = (key: string) => StripeInstance;

interface StripeWindow extends Window {
	Stripe?: StripeConstructor;
}

interface StripeInstance {
	elements(): StripeElements;
	confirmCardPayment(
		clientSecret: string,
		data: {
			payment_method: {
				card: StripeCardElement;
				billing_details?: { name?: string };
			};
		},
	): Promise<{
		error?: { message?: string };
		paymentIntent?: { id: string; status: string };
	}>;
}

interface StripeElements {
	create(
		type: 'card',
		options: {
			hidePostalCode: boolean;
			style: {
				base: {
					color: string;
					fontFamily: string;
					fontSize: string;
					'::placeholder': { color: string };
					iconColor: string;
				};
				invalid: { color: string; iconColor: string };
			};
		},
	): StripeCardElement;
}

interface StripeCardElement {
	mount(element: HTMLElement): void;
	on(
		eventName: 'change',
		handler: (event: { error?: { message?: string } }) => void,
	): void;
}

interface UpgradePaymentState {
	clientSecret: string;
	selectedCompanyId: string;
	selectedCompanyLabel: string;
	isPreparingIntent: boolean;
	isSubmitting: boolean;
}

interface UpgradeServicePayload {
	id: string;
	price: number;
}

const STRIPE_SCRIPT_ID = 'stripe-js';
const ROOT_ID = 'content';

function getElement<T extends HTMLElement>(
	id: string,
	ctor: { new (): T },
): T | null {
	const element = document.getElementById(id);
	return element instanceof ctor ? element : null;
}

function formatUSD(amount: number): string {
	if (!Number.isFinite(amount)) return '$0.00';

	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(amount);
}

async function loadStripe(): Promise<StripeConstructor> {
	const stripeWindow = window as StripeWindow;
	if (typeof stripeWindow.Stripe === 'function') return stripeWindow.Stripe;

	const stripeScript = getElement(STRIPE_SCRIPT_ID, HTMLScriptElement);
	if (!stripeScript) {
		throw new Error('Stripe.js no esta disponible.');
	}

	await new Promise<void>((resolve, reject) => {
		const onLoad = () => resolve();
		const onError = () => reject(new Error('No se pudo cargar Stripe.js.'));

		stripeScript.addEventListener('load', onLoad, { once: true });
		stripeScript.addEventListener('error', onError, { once: true });
	});

	if (typeof stripeWindow.Stripe !== 'function') {
		throw new Error('Stripe no se inicializo correctamente.');
	}

	return stripeWindow.Stripe;
}

export function initUpgradePaymentFlow(): void {
	const root = document.getElementById(ROOT_ID);
	if (!root || root.dataset.upgradePaymentInitialized === 'true') return;
	root.dataset.upgradePaymentInitialized = 'true';

	const stripeConfig = getElement('stripe-config', HTMLDivElement);
	const companySelect = getElement('empresa-select', HTMLSelectElement);
	const paymentForm = getElement('payment-form', HTMLFormElement);
	const payButton = getElement('pay-button', HTMLButtonElement);
	const cardContainer = getElement('card-element', HTMLDivElement);

	if (
		!stripeConfig ||
		!companySelect ||
		!paymentForm ||
		!payButton ||
		!cardContainer
	) {
		return;
	}

	const companyStep = document.getElementById('panel1');
	const paymentStep = document.getElementById('panel2');
	const continueButton = getElement('btn-paso1', HTMLButtonElement);
	const backButton = getElement('btn-back', HTMLButtonElement);
	const cardErrors = getElement('card-errors', HTMLParagraphElement);
	const statusMessage = getElement('status-message', HTMLParagraphElement);
	const planSummary = getElement('selected-plan-summary', HTMLParagraphElement);
	const baseSummary = document.getElementById('summary-base');
	const feeSummary = document.getElementById('summary-fee');
	const totalSummary = document.getElementById('summary-total');

	const publishableKey = stripeConfig.dataset.pk || '';
	const userId = stripeConfig.dataset.userId || '';
	const enabled = stripeConfig.dataset.enabled === 'true';
	const serviceId = stripeConfig.dataset.servicioId || '';
	const basePrice = Number(stripeConfig.dataset.basePrice || '600');
	const feePercent = Number(stripeConfig.dataset.feePercent || '0.045');
	const servicio: UpgradeServicePayload = {
		id: serviceId,
		price: basePrice,
	};

	const state: UpgradePaymentState = {
		clientSecret: '',
		selectedCompanyId: companySelect.value || '',
		selectedCompanyLabel:
			companySelect.options[companySelect.selectedIndex]?.textContent?.trim() ||
			'',
		isPreparingIntent: false,
		isSubmitting: false,
	};

	const syncSelectedCompany = () => {
		state.selectedCompanyId = companySelect.value || '';
		state.selectedCompanyLabel =
			companySelect.options[companySelect.selectedIndex]?.textContent?.trim() ||
			'';
	};

	const setStatus = (message = '') => {
		if (statusMessage) statusMessage.textContent = message;
	};

	const setError = (message = '') => {
		if (cardErrors) cardErrors.textContent = message;
	};

	const setPayButtonState = (disabled: boolean) => {
		payButton.disabled = disabled || !enabled;
	};

	const getFeeAmount = () => basePrice * feePercent;
	const getTotalAmount = () => basePrice + getFeeAmount();

	const updateSummary = () => {
		syncSelectedCompany();

		if (baseSummary) baseSummary.textContent = formatUSD(basePrice);
		if (feeSummary) feeSummary.textContent = formatUSD(getFeeAmount());
		if (totalSummary) totalSummary.textContent = formatUSD(getTotalAmount());

		const companyPart = state.selectedCompanyLabel
			? ` para ${state.selectedCompanyLabel}`
			: '';

		if (planSummary) {
			planSummary.textContent = `Estas pagando el upgrade de tu LLC${companyPart}.`;
		}
	};

	const showPaymentStep = () => {
		companyStep?.classList.add('hidden');
		paymentStep?.classList.remove('hidden');
	};

	const showCompanyStep = () => {
		paymentStep?.classList.add('hidden');
		companyStep?.classList.remove('hidden');
		setStatus('');
		setError('');
	};

	const createPaymentIntent = async (): Promise<boolean> => {
		if (!enabled) {
			setStatus('No pudimos habilitar el pago en este momento.');
			return false;
		}

		if (!servicio.id || !Number.isFinite(servicio.price) || servicio.price <= 0) {
			setStatus('No pudimos validar el servicio de upgrade.');
			return false;
		}

		syncSelectedCompany();
		if (!state.selectedCompanyId) {
			setStatus('Selecciona una empresa antes de continuar.');
			return false;
		}

		state.clientSecret = '';
		state.isPreparingIntent = true;
		setPayButtonState(true);
		setError('');
		setStatus('Preparando el pago...');

		try {
			const response = await fetch('/api/payment/payment-intent-upgrade', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userId,
					empresaId: state.selectedCompanyId,
					servicio,
				}),
			});

			const data = await response.json();
			if (!response.ok || !data.clientSecret) {
				throw new Error(data.error || 'No se pudo preparar el pago.');
			}

			state.clientSecret = data.clientSecret;
			setStatus('Ingresa los datos de tu tarjeta para completar el pago.');
			return true;
		} catch (error) {
			console.error('[Upgrade payment] payment intent error:', error);
			setStatus('No se pudo preparar el pago. Intenta nuevamente.');
			return false;
		} finally {
			state.isPreparingIntent = false;
			setPayButtonState(state.isSubmitting);
		}
	};

	const bootstrap = async () => {
		updateSummary();

		if (!enabled) {
			setPayButtonState(true);
			return;
		}

		if (!publishableKey || !userId || !servicio.id) {
			setStatus('Falta configuracion para iniciar Stripe.');
			setPayButtonState(true);
			return;
		}

		try {
			const Stripe = await loadStripe();
			const stripe = Stripe(publishableKey);
			const elements = stripe.elements();
			const cardElement = elements.create('card', {
				hidePostalCode: true,
				style: {
					base: {
						color: '#88898a',
						fontFamily:
							'"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
						fontSize: '14px',
						'::placeholder': { color: '#9ca3af' },
						iconColor: '#facc15',
					},
					invalid: { color: '#f97373', iconColor: '#f97373' },
				},
			});

			cardElement.mount(cardContainer);
			cardElement.on('change', (event) => {
				setError(event.error?.message || '');
			});

			continueButton?.addEventListener('click', async () => {
				syncSelectedCompany();
				if (!state.selectedCompanyId) {
					alert('Por favor selecciona la empresa para la que vas a pagar.');
					return;
				}

				updateSummary();
				showPaymentStep();
				await createPaymentIntent();
			});

			backButton?.addEventListener('click', () => {
				showCompanyStep();
			});

			companySelect.addEventListener('change', updateSummary);

			paymentForm.addEventListener('submit', async (event: SubmitEvent) => {
				event.preventDefault();

				if (state.isSubmitting || state.isPreparingIntent) return;

				if (!state.clientSecret) {
					const isReady = await createPaymentIntent();
					if (!isReady) return;
				}

				state.isSubmitting = true;
				setPayButtonState(true);
				setError('');
				setStatus('Procesando pago...');

				try {
					const { error, paymentIntent } = await stripe.confirmCardPayment(
						state.clientSecret,
						{
							payment_method: {
								card: cardElement,
								billing_details: {
									name: state.selectedCompanyLabel || 'Upgrade LLC',
								},
							},
						},
					);

					if (error) {
						setError(error.message || 'No se pudo procesar el pago.');
						setStatus('No se pudo completar el pago. Intenta nuevamente.');
						return;
					}

					if (!paymentIntent || paymentIntent.status !== 'succeeded') {
						setStatus('No se pudo completar el pago. Intenta nuevamente.');
						return;
					}

					setStatus('Pago realizado con exito. Registrando la informacion...');

					const registerResponse = await fetch('/api/payment/register', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
					});
					const registerData = await registerResponse.json();

					if (!registerResponse.ok) {
						console.error('[Upgrade payment] register error:', registerData);
						setStatus(
							'El pago se realizo, pero hubo un problema registrandolo internamente. Nuestro equipo lo revisara.',
						);
						return;
					}

					setStatus(
						'Pago realizado con exito. Estamos iniciando el proceso de upgrade de tu LLC.',
					);
					window.location.href = '/';
				} catch (error) {
					console.error('[Upgrade payment] submit error:', error);
					setStatus('Ocurrio un error al procesar el pago.');
				} finally {
					state.isSubmitting = false;
					setPayButtonState(false);
				}
			});
		} catch (error) {
			console.error('[Upgrade payment] bootstrap error:', error);
			setStatus('No se pudo inicializar Stripe correctamente.');
			setPayButtonState(true);
		}
	};

	void bootstrap();
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initUpgradePaymentFlow, {
		once: true,
	});
} else {
	initUpgradePaymentFlow();
}

document.addEventListener('astro:page-load', initUpgradePaymentFlow);
