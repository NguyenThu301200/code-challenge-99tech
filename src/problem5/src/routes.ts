import { Router, type Request, type Response, type NextFunction } from 'express';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import {
  createResourceSchema,
  idParamSchema,
  listQuerySchema,
  updateResourceSchema,
} from './schemas.js';
import {
  createResource,
  deleteResource,
  findResource,
  listResources,
  updateResource,
} from './repository.js';
import { HttpError, notFound } from './errors.js';

export const router = Router();

function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  try {
    return schema.parse(data);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new HttpError(400, 'validation_error', err.issues[0]?.message ?? 'Invalid input');
    }
    throw err;
  }
}

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => unknown) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Create
router.post(
  '/resources',
  asyncHandler((req, res) => {
    const input = parse(createResourceSchema, req.body);
    const resource = createResource(input);
    res.status(201).json(resource);
  }),
);

// List with filters
router.get(
  '/resources',
  asyncHandler((req, res) => {
    const query = parse(listQuerySchema, req.query);
    const { items, total } = listResources(query);
    res.json({
      items,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        has_more: query.offset + items.length < total,
      },
    });
  }),
);

// Get one
router.get(
  '/resources/:id',
  asyncHandler((req, res) => {
    const { id } = parse(idParamSchema, req.params);
    const resource = findResource(id);
    if (!resource) throw notFound();
    res.json(resource);
  }),
);

// Update (partial)
router.patch(
  '/resources/:id',
  asyncHandler((req, res) => {
    const { id } = parse(idParamSchema, req.params);
    const patch = parse(updateResourceSchema, req.body);
    const updated = updateResource(id, patch);
    if (!updated) throw notFound();
    res.json(updated);
  }),
);

// Delete
router.delete(
  '/resources/:id',
  asyncHandler((req, res) => {
    const { id } = parse(idParamSchema, req.params);
    const ok = deleteResource(id);
    if (!ok) throw notFound();
    res.status(204).end();
  }),
);
