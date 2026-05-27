import { sql } from "@/lib/db/client";
import { mapProjectRow } from "@/lib/db/mappers";
import { Project, type Project as ProjectType } from "@/lib/schemas/project";

export async function listProjects(): Promise<ProjectType[]> {
  const rows = await sql`
    SELECT
      p.id,
      p.name,
      p.created_at,
      COUNT(t.id) FILTER (
        WHERE t.status NOT IN ('Done', 'Dropped')
      )::int AS active_task_count
    FROM projects p
    LEFT JOIN tasks t ON t.project_id = p.id
    GROUP BY p.id, p.name, p.created_at
    ORDER BY p.name ASC
  `;

  return rows.map((row) => {
    const record = row as Record<string, unknown>;
    return Project.parse(
      mapProjectRow(record, Number(record.active_task_count)),
    );
  });
}

export async function findProjectByName(
  name: string,
): Promise<ProjectType | null> {
  const rows = await sql`
    SELECT * FROM projects WHERE lower(name) = lower(${name}) LIMIT 1
  `;
  if (rows.length === 0) return null;
  return Project.parse(mapProjectRow(rows[0] as Record<string, unknown>));
}

export async function getProjectById(id: string): Promise<ProjectType | null> {
  const rows = await sql`SELECT * FROM projects WHERE id = ${id}::uuid`;
  if (rows.length === 0) return null;
  return Project.parse(mapProjectRow(rows[0] as Record<string, unknown>));
}

export async function createProject(name: string): Promise<ProjectType> {
  const rows = await sql`
    INSERT INTO projects (name) VALUES (${name}) RETURNING *
  `;
  return Project.parse(mapProjectRow(rows[0] as Record<string, unknown>));
}

export async function updateProject(
  id: string,
  name: string,
): Promise<ProjectType | null> {
  const rows = await sql`
    UPDATE projects SET name = ${name} WHERE id = ${id}::uuid RETURNING *
  `;
  if (rows.length === 0) return null;
  return Project.parse(mapProjectRow(rows[0] as Record<string, unknown>));
}

export async function deleteProject(id: string): Promise<boolean> {
  const rows = await sql`
    DELETE FROM projects WHERE id = ${id}::uuid RETURNING id
  `;
  return rows.length > 0;
}
