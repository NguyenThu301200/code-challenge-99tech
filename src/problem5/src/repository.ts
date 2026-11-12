import { db, type Resource } from './db.js';
import type { CreateResourceInput, ListQuery, UpdateResourceInput } from './schemas.js';

const insertStmt = db.prepare(`
  INSERT INTO resources (name, description, category, status)
  VALUES (@name, @description, @category, @status)
  RETURNING *
`);

const findByIdStmt = db.prepare<{ id: number }, Resource>(
  `SELECT * FROM resources WHERE id = @id`,
);

const deleteStmt = db.prepare<{ id: number }>(`DELETE FROM resources WHERE id = @id`);

export function createResource(input: CreateResourceInput): Resource {
  return insertStmt.get(input) as Resource;
}

export function findResource(id: number): Resource | undefined {
  return findByIdStmt.get({ id });
}

export function deleteResource(id: number): boolean {
  return deleteStmt.run({ id }).changes > 0;
}

export function updateResource(
  id: number,
  patch: UpdateResourceInput,
): Resource | undefined {
  const fields = Object.keys(patch) as Array<keyof UpdateResourceInput>;
  if (fields.length === 0) return findResource(id);

  const setClause = fields.map((f) => `${f} = @${f}`).join(', ');
  const stmt = db.prepare(`
    UPDATE resources
       SET ${setClause}, updated_at = datetime('now')
     WHERE id = @id
    RETURNING *
  `);
  return stmt.get({ ...patch, id }) as Resource | undefined;
}

export function listResources(query: ListQuery): {
  items: Resource[];
  total: number;
} {
  const where: string[] = [];
  const params: Record<string, unknown> = {};

  if (query.q) {
    where.push(`(name LIKE @q OR description LIKE @q)`);
    params.q = `%${query.q}%`;
  }
  if (query.category) {
    where.push(`category = @category`);
    params.category = query.category;
  }
  if (query.status) {
    where.push(`status = @status`);
    params.status = query.status;
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const orderSql = `ORDER BY ${query.sort} ${query.order.toUpperCase()}`;

  const total = (
    db
      .prepare(`SELECT COUNT(*) AS c FROM resources ${whereSql}`)
      .get(params) as { c: number }
  ).c;

  const items = db
    .prepare(
      `SELECT * FROM resources ${whereSql} ${orderSql} LIMIT @limit OFFSET @offset`,
    )
    .all({ ...params, limit: query.limit, offset: query.offset }) as Resource[];

  return { items, total };
}
