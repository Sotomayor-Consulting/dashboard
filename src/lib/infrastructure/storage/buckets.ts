const documentsBucketFromProcess =
	typeof process !== 'undefined'
		? process.env.SUPABASE_DOCUMENTS_BUCKET
		: undefined;

const documentsBucket =
	documentsBucketFromProcess ??
	import.meta.env.SUPABASE_DOCUMENTS_BUCKET ??
	'documents';

export const BUCKETS = {
	documents: documentsBucket,
	incorporationDocuments: 'incorporation_documents',
	publicAssets: 'public-assets',
	templates: 'templates',
} as const;

export type KnownBucket = (typeof BUCKETS)[keyof typeof BUCKETS];

export const DEFAULT_SIGNED_URL_TTL_SECONDS = 3600;
