import { LRUCache } from 'lru-cache';
import type { EmpresaSwitcherItem } from '@domains/companies/companies';

interface NotificationRow {
	id?: string;
	message?: string;
	created_at?: string;
	link?: string | null;
	is_read?: boolean;
}

export interface LayoutCacheEntry {
	usuario: unknown;
	notificationsData: { notifications: NotificationRow[]; totalUnread: number };
	incorporaciones: unknown[];
	bannerIncorpData: { shouldShow: boolean; empresaId: string | null };
	empresasSwitcher: EmpresaSwitcherItem[];
}

// max: 500 entradas (un usuario activo ≈ 1 entrada)
// ttl:  20 s — suficiente para cubrir navegación rápida sin sentir datos stale
const cache = new LRUCache<string, LayoutCacheEntry>({ max: 500, ttl: 20_000 });

export const getLayoutCache = (userId: string) => cache.get(userId);

export const setLayoutCache = (userId: string, data: LayoutCacheEntry) =>
	cache.set(userId, data);

export const invalidateLayoutCache = (userId: string) => cache.delete(userId);
