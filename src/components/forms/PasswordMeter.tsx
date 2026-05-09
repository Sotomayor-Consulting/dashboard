import { useEffect, useMemo, useRef, useState } from 'react';
import type { ZXCVBNResult, ZXCVBNScore } from 'zxcvbn';
import { CheckIcon } from 'lucide-react';
import { Input } from '@components/ui/input';
import { cn } from '@components/utils';
import { FieldError } from '@components/ui/field';

type ZxcvbnFn = (password: string) => ZXCVBNResult;

interface PasswordMeterProps {
	id?: string;
	name?: string;
	placeholder?: string;
	required?: boolean;
	minLength?: number;
	confirmInputId?: string;
	disabled?: boolean;
}

interface StrengthConfig {
	label: string;
	color: string;
	textClass: string;
	progress: number;
}

const STRENGTH_MAP: Record<ZXCVBNScore, StrengthConfig> = {
	0: {
		label: 'Muy debil',
		color: '#ef4444',
		textClass: 'text-red-400',
		progress: 18,
	},
	1: {
		label: 'Debil',
		color: '#f59e0b',
		textClass: 'text-amber-400',
		progress: 35,
	},
	2: {
		label: 'Aceptable',
		color: '#eab308',
		textClass: 'text-yellow-400',
		progress: 55,
	},
	3: {
		label: 'Buena',
		color: '#22c55e',
		textClass: 'text-green-400',
		progress: 76,
	},
	4: {
		label: 'Excelente',
		color: '#16a34a',
		textClass: 'text-green-500',
		progress: 100,
	},
};

const WARNING_MAP: Readonly<Record<string, string>> = {
	'Straight rows of keys are easy to guess':
		'Filas de teclas consecutivas son faciles de adivinar',
	'Short keyboard patterns are easy to guess':
		'Patrones cortos de teclado son faciles de adivinar',
	'Repeats like "aaa" are easy to guess':
		'Repeticiones como "aaa" son faciles de adivinar',
	'Repeats like "abcabcabc" are only slightly harder to guess than "abc"':
		'Repeticiones como "abcabc" son casi tan faciles como "abc"',
	'Sequences like abc or 6543 are easy to guess':
		'Secuencias como abc o 6543 son faciles de adivinar',
	'Recent years are easy to guess': 'Anos recientes son faciles de adivinar',
	'Dates are often easy to guess': 'Las fechas son faciles de adivinar',
	'This is a top-10 common password':
		'Esta es una de las 10 contrasenas mas comunes',
	'This is a top-100 common password':
		'Esta es una de las 100 contrasenas mas comunes',
	'This is a very common password': 'Esta es una contrasena muy comun',
	'This is similar to a commonly used password':
		'Es similar a una contrasena comun',
	'A word by itself is easy to guess': 'Una palabra sola es facil de adivinar',
	'Names and surnames by themselves are easy to guess':
		'Nombres y apellidos solos son faciles de adivinar',
	'Common names and surnames are easy to guess':
		'Nombres y apellidos comunes son faciles de adivinar',
};

const SUGGESTION_MAP: Readonly<Record<string, string>> = {
	'Use a few words, avoid common phrases':
		'Usa varias palabras, evita frases comunes',
	'No need for symbols, digits, or uppercase letters':
		'No necesitas simbolos, digitos o mayusculas obligatoriamente',
	'Add another word or two. Uncommon words are better.':
		'Anade otra palabra o dos. Palabras poco comunes son mejores.',
	"Capitalization doesn't help very much":
		'Las mayusculas no ayudan mucho por si solas',
	'All-uppercase is almost as easy to guess as all-lowercase':
		'Todo en mayusculas es casi tan facil como todo en minusculas',
	"Reversed words aren't much harder to guess":
		'Palabras al reves no son mucho mas dificiles',
	"Predictable substitutions like '@' instead of 'a' don't help very much":
		'Sustituciones predecibles como @ por a no ayudan mucho',
};
const cleanInputClass =
	'h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-[#8c681d] focus-visible:ring-2 focus-visible:ring-[#8c681d]/30 dark:border-slate-600 dark:bg-[#0b1220] dark:text-slate-100 dark:placeholder:text-slate-500';

function normalizeSuggestion(result: ZXCVBNResult): string {
	if (result.feedback.warning) {
		return WARNING_MAP[result.feedback.warning] ?? result.feedback.warning;
	}

	if (result.feedback.suggestions.length > 0) {
		const first = result.feedback.suggestions[0] ?? '';
		if (!first) return '';
		return SUGGESTION_MAP[first] ?? first;
	}

	return '';
}

export default function PasswordMeter({
	id = 'password',
	name = 'password',
	placeholder = '********',
	required = false,
	minLength = 8,
	confirmInputId,
	disabled = false,
}: PasswordMeterProps) {
	const wrapperRef = useRef<HTMLDivElement>(null);
	const zxcvbnRef = useRef<ZxcvbnFn | null>(null);

	const [password, setPassword] = useState<string>('');
	const [isVisible, setIsVisible] = useState<boolean>(false);
	const [score, setScore] = useState<ZXCVBNScore>(0);
	const [suggestion, setSuggestion] = useState<string>('');
	const [matchesConfirm, setMatchesConfirm] = useState<boolean | null>(null);

	const criteria = useMemo(
		() => ({
			length: password.length >= minLength,
			letter: /[A-Za-z]/.test(password),
			number: /\d/.test(password),
		}),
		[minLength, password],
	);

	const strength = STRENGTH_MAP[score];
	const hasPassword = password.length > 0;

	useEffect(() => {
		let isActive = true;

		const evaluate = async () => {
			if (!password) {
				setScore(0);
				setSuggestion('');
				if (wrapperRef.current) {
					wrapperRef.current.dispatchEvent(
						new CustomEvent<{
							score: ZXCVBNScore;
							password: string;
							matches: boolean;
						}>('password-strength', {
							detail: {
								score: 0,
								password: '',
								matches: matchesConfirm ?? true,
							},
							bubbles: true,
						}),
					);
				}
				return;
			}

			const zxcvbn =
				zxcvbnRef.current ??
				((await import('zxcvbn')) as unknown as { default?: ZxcvbnFn });
			const resolvedZxcvbn =
				typeof zxcvbn === 'function' ? zxcvbn : zxcvbn.default;
			if (!resolvedZxcvbn) return;
			zxcvbnRef.current = resolvedZxcvbn;

			const result = resolvedZxcvbn(password);

			if (!isActive) return;

			setScore(result.score);
			setSuggestion(normalizeSuggestion(result));

			if (wrapperRef.current) {
				wrapperRef.current.dispatchEvent(
					new CustomEvent<{
						score: ZXCVBNScore;
						password: string;
						matches: boolean;
					}>('password-strength', {
						detail: {
							score: result.score,
							password,
							matches: matchesConfirm ?? true,
						},
						bubbles: true,
					}),
				);
			}
		};

		void evaluate();

		return () => {
			isActive = false;
		};
	}, [matchesConfirm, password]);

	useEffect(() => {
		if (!confirmInputId) {
			setMatchesConfirm(null);
			return;
		}

		const confirmInput = document.getElementById(
			confirmInputId,
		) as HTMLInputElement | null;

		if (!confirmInput) {
			setMatchesConfirm(null);
			return;
		}

		const syncMatch = () => {
			if (!confirmInput.value) {
				confirmInput.setCustomValidity('');
				setMatchesConfirm(null);
				return;
			}

			const isMatch = confirmInput.value === password;
			confirmInput.setCustomValidity(
				isMatch ? '' : 'Las contrasenas no coinciden',
			);
			setMatchesConfirm(isMatch);
		};

		syncMatch();
		confirmInput.addEventListener('input', syncMatch);

		return () => {
			confirmInput.removeEventListener('input', syncMatch);
		};
	}, [confirmInputId, password]);

	const itemClass = (passed: boolean) =>
		passed ? 'text-green-400' : 'text-neutral-500 dark:text-neutral-500';

	const checkClass = (passed: boolean) =>
		passed ? 'text-green-400 opacity-100' : 'text-neutral-500 opacity-50';

	return (
		<div ref={wrapperRef} className="password-meter-wrapper">
			<div className="relative">
				<Input
					id={id}
					name={name}
					type={isVisible ? 'text' : 'password'}
					placeholder={placeholder}
					required={required}
					minLength={minLength}
					autoComplete="new-password"
					aria-describedby={`${id}-strength-feedback`}
					className={cn(cleanInputClass, 'pr-16')}
					value={password}
					onChange={(event) => setPassword(event.target.value)}
					disabled={disabled}
				/>
				<button
					type="button"
					onClick={() => setIsVisible((prev) => !prev)}
					className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
					aria-label="Mostrar u ocultar contrasena"
					disabled={disabled}
				>
					{isVisible ? 'Ocultar' : 'Mostrar'}
				</button>
			</div>

			<div
				className="mt-3"
				id={`${id}-strength-feedback`}
				role="status"
				aria-live="polite"
			>
				<div className="mb-2 flex items-center gap-3">
					<div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-700/70">
						<div
							className="h-full rounded-full transition-all duration-300"
							style={{
								backgroundColor: hasPassword ? strength.color : '#334155',
								width: `${hasPassword ? strength.progress : 0}%`,
							}}
						/>
					</div>
					<span
						className={`w-20 text-right text-sm font-semibold ${hasPassword ? strength.textClass : 'text-neutral-500'}`}
					>
						{hasPassword ? strength.label : ''}
					</span>
				</div>

				<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
					<div
						className={cn(
							'inline-flex items-center gap-1.5',
							itemClass(criteria.length),
						)}
					>
						<CheckIcon
							className={cn('size-3.5', checkClass(criteria.length))}
						/>
						<span>{minLength}+ caracteres</span>
					</div>
					<div
						className={cn(
							'inline-flex items-center gap-1.5',
							itemClass(criteria.letter),
						)}
					>
						<CheckIcon
							className={cn('size-3.5', checkClass(criteria.letter))}
						/>
						<span>Letra</span>
					</div>
					<div
						className={cn(
							'inline-flex items-center gap-1.5',
							itemClass(criteria.number),
						)}
					>
						<CheckIcon
							className={cn('size-3.5', checkClass(criteria.number))}
						/>
						<span>Numero</span>
					</div>
				</div>

				{suggestion && (
					<p className="mt-1 text-xs text-amber-500" aria-live="polite">
						{suggestion}
					</p>
				)}

				{matchesConfirm === false && (
					<FieldError
						className="border-destructive/30 bg-destructive/10 mt-2 rounded-md border px-2.5 py-1.5 text-xs font-normal"
						aria-live="polite"
					>
						Las contrasenas no coinciden
					</FieldError>
				)}
			</div>
		</div>
	);
}
