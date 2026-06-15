import { createContext, useContext, type ReactNode } from 'react';

/**
 * Provee el `incorporationId` (empresa_incorporacion_id) a los componentes
 * profundos del wizard sin prop-drilling — lo necesitan los campos de archivo
 * para subir al endpoint de staging.
 */
const IncorporationContext = createContext<string | null>(null);

export function IncorporationProvider({
	incorporationId,
	children,
}: {
	incorporationId: string;
	children: ReactNode;
}) {
	return (
		<IncorporationContext.Provider value={incorporationId}>
			{children}
		</IncorporationContext.Provider>
	);
}

export function useIncorporationId(): string {
	const id = useContext(IncorporationContext);
	if (!id) {
		throw new Error(
			'useIncorporationId debe usarse dentro de <IncorporationProvider>',
		);
	}
	return id;
}
