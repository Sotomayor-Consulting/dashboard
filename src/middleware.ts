import { supabase } from '@lib/supabase';

export function onRequest(context: any, next: any) {
	const { cookies, redirect, url } = context;
	const pathname = url.pathname;

	const publicRoutes = [
		'/sign-in',
		'/sign-up',
		'/forgot-password',
		'/reset-password',
	];
	const publicFolders = ['/api/'];

	const isPublicRoute = publicRoutes.some((route) => pathname === route);
	const isPublicFolder = publicFolders.some((folder) =>
		pathname.startsWith(folder),
	);

	return (async () => {
		const accessToken = cookies.get('sb-access-token');
		const refreshToken = cookies.get('sb-refresh-token');

		let user = null;

		if (accessToken && refreshToken) {
			const { data: sessionData, error: sessionError } =
				await supabase.auth.setSession({
					access_token: accessToken.value,
					refresh_token: refreshToken.value,
				});

			if (sessionError || !sessionData?.session) {
				cookies.delete('sb-access-token', { path: '/' });
				cookies.delete('sb-refresh-token', { path: '/' });
				return redirect('/sign-in');
			}

			const {
				data: { user: authUser },
				error,
			} = await supabase.auth.getUser(accessToken.value);

			if (!error && authUser) {
				user = authUser;

				const { data: usuarioData } = await supabase
					.from('user_roles')
					.select('*, roles (name)')
					.eq('user_id', user.id);

				const userRoles: string[] =
					(usuarioData as any[])
						?.map((ur: any) => ur.roles?.name)
						.filter(Boolean) || [];

				context.locals.user = user;
				context.locals.userRoles = userRoles;
			} else {
				cookies.delete('sb-access-token', { path: '/' });
				cookies.delete('sb-refresh-token', { path: '/' });
			}
		}

		if (isPublicRoute || isPublicFolder) {
			return next();
		}

		if (!user) {
			return redirect('/sign-in');
		}

		const userRoles = context.locals.userRoles || [];

		const adminFolders = ['/crud/', '/admin/'];
		const partnerFolders = ['/partners/', '/afiliados/'];
		const clientFolders = ['/pages/'];

		const sharedFolders = [
			{ path: '/pages/', roles: ['partner', 'client'] },
			{ path: '/profile/', roles: ['admin', 'partner', 'client'] },
		];

		const checkRole = (requiredRoles: string[]) => {
			return requiredRoles.some((role) => {
				if (role === 'admin') return userRoles.includes('admin');
				if (role === 'partner') return userRoles.includes('partner');
				if (role === 'client') return userRoles.includes('cliente');
				return false;
			});
		};

		if (adminFolders.some((folder) => pathname.startsWith(folder))) {
			if (!checkRole(['admin'])) {
				return redirect(
					`/?status=error&msg=${encodeURIComponent('Acceso solo para admins')}`,
				);
			}
		}

		if (partnerFolders.some((folder) => pathname.startsWith(folder))) {
			if (!checkRole(['partner'])) {
				return redirect(
					`/?status=error&msg=${encodeURIComponent('Acceso solo para partners')}`,
				);
			}
		}

		if (clientFolders.some((folder) => pathname.startsWith(folder))) {
			if (!checkRole(['client'])) {
				return redirect(
					`/?status=error&msg=${encodeURIComponent('Acceso solo para clientes')}`,
				);
			}
		}

		for (const shared of sharedFolders) {
			if (pathname.startsWith(shared.path)) {
				if (!checkRole(shared.roles)) {
					return redirect(
						`/?status=error&msg=${encodeURIComponent('Acceso no autorizado')}`,
					);
				}
				break;
			}
		}

		return next();
	})();
}
