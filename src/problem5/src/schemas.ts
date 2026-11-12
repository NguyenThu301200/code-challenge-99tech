import { z } from 'zod';

export const createResourceSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).default(''),
  category: z.string().trim().min(1).max(60),
  status: z.enum(['active', 'archived']).default('active'),
});

export const updateResourceSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000),
    category: z.string().trim().min(1).max(60),
    status: z.enum(['active', 'archived']),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });

export const listQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  status: z.enum(['active', 'archived']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  sort: z.enum(['created_at', 'updated_at', 'name']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
