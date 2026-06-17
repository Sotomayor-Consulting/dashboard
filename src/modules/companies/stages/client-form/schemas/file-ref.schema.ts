import { z } from 'zod';

export const fileRefSchema = z
	.object({
		path: z.string(),
		name: z.string(),
		mime: z.string(),
		size: z.number(),
	})
	.nullable();
