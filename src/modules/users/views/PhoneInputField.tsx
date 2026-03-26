import * as React from 'react';
import intlTelInput from 'intl-tel-input/intlTelInputWithUtils';
import es from 'intl-tel-input/i18n/es';
import 'intl-tel-input/styles';

interface PhoneInputFieldProps {
	id: string;
	name: string;
	defaultValue?: string;
	initialCountry?: string;
}

export default function PhoneInputField({
	id,
	name,
	defaultValue = '',
	initialCountry = 'us',
}: PhoneInputFieldProps) {
	const inputRef = React.useRef<HTMLInputElement | null>(null);
	const [submitValue, setSubmitValue] = React.useState(defaultValue);

	React.useEffect(() => {
		const input = inputRef.current;
		if (!input) return;

		const iti = intlTelInput(input, {
			i18n: es,
			initialCountry: initialCountry as any,
			nationalMode: true,
			formatAsYouType: true,
			separateDialCode: true,
			countrySearch: true,
			strictMode: true,
		});

		if (defaultValue) {
			try {
				iti.setNumber(defaultValue);
			} catch {
				input.value = defaultValue;
			}
		}

		const syncValue = () => {
			const raw = input.value.trim();
			if (!raw) {
				setSubmitValue('');
				return;
			}

			const full = iti.getNumber();
			setSubmitValue(full || raw);
		};

		syncValue();
		input.addEventListener('input', syncValue);
		input.addEventListener('blur', syncValue);
		input.addEventListener('countrychange', syncValue as EventListener);

		return () => {
			input.removeEventListener('input', syncValue);
			input.removeEventListener('blur', syncValue);
			input.removeEventListener('countrychange', syncValue as EventListener);
			iti.destroy();
		};
	}, [defaultValue, initialCountry]);

	return (
		<>
			<input
				ref={inputRef}
				type="tel"
				id={id}
				defaultValue={defaultValue}
				autoComplete="off"
				className="iti-input h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
			/>
			<input type="hidden" name={name} value={submitValue} />
		</>
	);
}
