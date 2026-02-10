import { supabase } from '@lib/supabase';

export function onRequest(context: any, next: any) {
	const { cookies, redirect, url } = context;
	const pathname = url.pathname;

	// Rutas individuales públicas
	const publicRoutes = ['/sign-in', '/sign-up'];

	// Carpetas que serán públicas
	const publicFolders = ['/api/'];

	// Carpetas que requieren rol específico
	const adminFolders = ['/crud/', '/admin/']; // admin
	const partnerFolders = ['/partners/', '/afiliados/']; //partner
	const clientFolders = ['/cliente/']; //cliente

	// Carpetas compartidas (múltiples roles permitidos)
	const sharedFolders = [
		{ path: '/pages/', roles: ['partner', 'client'] },
		{ path: '/profile/', roles: ['admin', 'partner', 'client'] },
	];

	// Verificar si es ruta pública individual
	if (publicRoutes.some((route) => pathname === route)) {
		return next();
	}

	// Verificar si está en carpeta pública
	if (publicFolders.some((folder) => pathname.startsWith(folder))) {
		return next();
	}

	// Si es la raíz, permitir
	if (pathname === '/') {
		return next();
	}

	// Función asíncrona para verificar autenticación
	return (async () => {
		// 1) Verificar tokens
		const accessToken = cookies.get('sb-access-token');
		const refreshToken = cookies.get('sb-refresh-token');

		if (!accessToken || !refreshToken) {
			return redirect('/sign-in');
		}

		// 2) Restaurar sesión y obtener usuario
		await supabase.auth.setSession({
			access_token: accessToken.value,
			refresh_token: refreshToken.value,
		});

		const {
			data: { user },
			error,
		} = await supabase.auth.getUser();

		if (error || !user) {
			return redirect('/sign-in');
		}

		// 3) Función para verificar roles de usuario
		const checkUserRole = async (user: any, requiredRoles: string[]) => {
			const [adminResult, roleResult] = await Promise.all([
				supabase.rpc('is_admin', { uid: user.id }),
				supabase
					.from('usuarios')
					.select('rol_id')
					.eq('user_id', user.id)
					.single(),
			]);

			const isAdmin = adminResult.data;
			const roleId = roleResult.data?.rol_id;

			return requiredRoles.some((role) => {
				if (role === 'admin') return isAdmin;
				if (role === 'partner') return Number(roleId) === 2;
				if (role === 'client') return Number(roleId) === 3;
				return false;
			});
		};

		// 4) Verificar carpetas de rol específico
		if (adminFolders.some((folder) => pathname.startsWith(folder))) {
			const hasAccess = await checkUserRole(user, ['admin']);
			if (!hasAccess) {
				return redirect(
					`/?status=error&msg=${encodeURIComponent('Acceso solo para admins')}`,
				);
			}
		}

		if (partnerFolders.some((folder) => pathname.startsWith(folder))) {
			const hasAccess = await checkUserRole(user, ['partner']);
			if (!hasAccess) {
				return redirect(
					`/?status=error&msg=${encodeURIComponent('Acceso solo para partners')}`,
				);
			}
		}

		if (clientFolders.some((folder) => pathname.startsWith(folder))) {
			const hasAccess = await checkUserRole(user, ['client']);
			if (!hasAccess) {
				return redirect(
					`/?status=error&msg=${encodeURIComponent('Acceso solo para clientes')}`,
				);
			}
		}

		// 5) Verificar carpetas compartidas
		for (const shared of sharedFolders) {
			if (pathname.startsWith(shared.path)) {
				const hasAccess = await checkUserRole(user, shared.roles);
				if (!hasAccess) {
					return redirect(
						`/?status=error&msg=${encodeURIComponent('Acceso no autorizado por tu rol')}`,
					);
				}
				break;
			}
		}

		// Inyectar usuario en locals
		context.locals.user = user;

		return next();
	})();
}
