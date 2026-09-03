import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Tuple

from .schemas import CreateProject, ProductionSettings, Project, ProjectScript, ProjectStatus, SaveScript, ScriptVersion, UpdateProject


class ProjectNotFound(Exception):
    pass


class InvalidProjectOrder(Exception):
    pass


class ProjectRepository:
    def __init__(self, database_path: Path):
        self.database_path = database_path

    def initialize(self) -> None:
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS projects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    channel TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            connection.execute("CREATE TABLE IF NOT EXISTS production_settings (project_id INTEGER PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY(project_id) REFERENCES projects(id))")
            columns = {row[1] for row in connection.execute("PRAGMA table_info(projects)")}
            migrations = {
                "is_pinned": "ALTER TABLE projects ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0",
                "position": "ALTER TABLE projects ADD COLUMN position INTEGER NOT NULL DEFAULT 0",
                "deleted_at": "ALTER TABLE projects ADD COLUMN deleted_at TEXT",
            }
            for column, statement in migrations.items():
                if column not in columns:
                    connection.execute(statement)
            connection.execute("UPDATE projects SET position = id WHERE position = 0")
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS project_scripts (
                    project_id INTEGER PRIMARY KEY,
                    topic TEXT NOT NULL DEFAULT '',
                    brief TEXT NOT NULL DEFAULT '',
                    research_notes TEXT NOT NULL DEFAULT '',
                    content TEXT NOT NULL DEFAULT '',
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY(project_id) REFERENCES projects(id)
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS script_versions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id INTEGER NOT NULL,
                    content TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(project_id) REFERENCES projects(id)
                )
                """
            )

    def create(self, payload: CreateProject) -> Project:
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as connection:
            cursor = connection.execute(
                """
                INSERT INTO projects (title, channel, status, is_pinned, position, created_at, updated_at)
                VALUES (?, ?, ?, 0, COALESCE((SELECT MIN(position) - 1 FROM projects), 0), ?, ?)
                """,
                (payload.title, payload.channel, ProjectStatus.DRAFT.value, now, now),
            )
            row = connection.execute(
                "SELECT * FROM projects WHERE id = ?", (cursor.lastrowid,)
            ).fetchone()
        return self._to_project(row)

    def list(self, query: str, page: int, page_size: int) -> Tuple[List[Project], int]:
        normalized = query.strip()
        search = "AND (title LIKE ? OR channel LIKE ?)" if normalized else ""
        params = (f"%{normalized}%", f"%{normalized}%") if normalized else ()
        offset = (page - 1) * page_size
        with self._connect() as connection:
            total = connection.execute(
                f"SELECT COUNT(*) FROM projects WHERE deleted_at IS NULL {search}", params
            ).fetchone()[0]
            rows = connection.execute(
                f"SELECT * FROM projects WHERE deleted_at IS NULL {search} ORDER BY is_pinned DESC, position ASC, id DESC LIMIT ? OFFSET ?",
                (*params, page_size, offset),
            ).fetchall()
        return [self._to_project(row) for row in rows], total

    def update(self, project_id: int, payload: UpdateProject) -> Project:
        changes = payload.model_dump(exclude_none=True)
        field_names = {"title": "title", "channel": "channel", "isPinned": "is_pinned"}
        assignments = [f"{field_names[field]} = ?" for field in changes]
        values = [int(value) if field == "isPinned" else value for field, value in changes.items()]
        if assignments:
            assignments.append("updated_at = ?")
            values.append(datetime.now(timezone.utc).isoformat())
            with self._connect() as connection:
                cursor = connection.execute(
                    f"UPDATE projects SET {', '.join(assignments)} WHERE id = ? AND deleted_at IS NULL",
                    (*values, project_id),
                )
                if cursor.rowcount == 0:
                    raise ProjectNotFound()
        return self.get(project_id)

    def trash(self, project_id: int) -> None:
        with self._connect() as connection:
            cursor = connection.execute(
                "UPDATE projects SET deleted_at = ?, is_pinned = 0 WHERE id = ? AND deleted_at IS NULL",
                (datetime.now(timezone.utc).isoformat(), project_id),
            )
            if cursor.rowcount == 0:
                raise ProjectNotFound()

    def list_trash(self, page: int, page_size: int) -> Tuple[List[Project], int]:
        offset = (page - 1) * page_size
        with self._connect() as connection:
            total = connection.execute(
                "SELECT COUNT(*) FROM projects WHERE deleted_at IS NOT NULL"
            ).fetchone()[0]
            rows = connection.execute(
                "SELECT * FROM projects WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT ? OFFSET ?",
                (page_size, offset),
            ).fetchall()
        return [self._to_project(row) for row in rows], total

    def restore(self, project_id: int) -> Project:
        with self._connect() as connection:
            cursor = connection.execute(
                "UPDATE projects SET deleted_at = NULL, updated_at = ? WHERE id = ? AND deleted_at IS NOT NULL",
                (datetime.now(timezone.utc).isoformat(), project_id),
            )
            if cursor.rowcount == 0:
                raise ProjectNotFound()
        return self.get(project_id)

    def reorder(self, project_ids: List[int]) -> None:
        if len(project_ids) != len(set(project_ids)):
            raise InvalidProjectOrder()
        with self._connect() as connection:
            active_ids = {
                row[0]
                for row in connection.execute(
                    "SELECT id FROM projects WHERE deleted_at IS NULL"
                ).fetchall()
            }
            if set(project_ids) != active_ids:
                raise InvalidProjectOrder()
            for position, project_id in enumerate(project_ids):
                connection.execute(
                    "UPDATE projects SET position = ? WHERE id = ?", (position, project_id)
                )

    def get(self, project_id: int) -> Project:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT * FROM projects WHERE id = ?", (project_id,)
            ).fetchone()
        if row is None:
            raise ProjectNotFound()
        return self._to_project(row)

    def get_script(self, project_id: int) -> ProjectScript:
        with self._connect() as connection:
            project = connection.execute(
                "SELECT id FROM projects WHERE id = ? AND deleted_at IS NULL", (project_id,)
            ).fetchone()
            if project is None:
                raise ProjectNotFound()
            row = connection.execute(
                "SELECT * FROM project_scripts WHERE project_id = ?", (project_id,)
            ).fetchone()
            versions = connection.execute(
                "SELECT * FROM script_versions WHERE project_id = ? ORDER BY id DESC LIMIT 50",
                (project_id,),
            ).fetchall()
        now = datetime.now(timezone.utc)
        return ProjectScript(
            projectId=project_id,
            topic=row["topic"] if row else "",
            brief=row["brief"] if row else "",
            researchNotes=row["research_notes"] if row else "",
            content=row["content"] if row else "",
            updatedAt=datetime.fromisoformat(row["updated_at"]) if row else now,
            versions=[
                ScriptVersion(id=item["id"], content=item["content"], createdAt=datetime.fromisoformat(item["created_at"]))
                for item in versions
            ],
        )

    def save_script(self, project_id: int, payload: SaveScript) -> ProjectScript:
        self.get_script(project_id)
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as connection:
            previous = connection.execute(
                "SELECT content FROM project_scripts WHERE project_id = ?", (project_id,)
            ).fetchone()
            connection.execute(
                """
                INSERT INTO project_scripts (project_id, topic, brief, research_notes, content, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(project_id) DO UPDATE SET
                    topic = excluded.topic,
                    brief = excluded.brief,
                    research_notes = excluded.research_notes,
                    content = excluded.content,
                    updated_at = excluded.updated_at
                """,
                (project_id, payload.topic, payload.brief, payload.researchNotes, payload.content, now),
            )
            if payload.content and (previous is None or previous["content"] != payload.content):
                connection.execute(
                    "INSERT INTO script_versions (project_id, content, created_at) VALUES (?, ?, ?)",
                    (project_id, payload.content, now),
                )
        return self.get_script(project_id)

    def get_production_settings(self, project_id: int) -> ProductionSettings:
        self.get(project_id)
        with self._connect() as connection:
            row = connection.execute("SELECT payload FROM production_settings WHERE project_id = ?", (project_id,)).fetchone()
        return ProductionSettings.model_validate_json(row["payload"]) if row else ProductionSettings()

    def save_production_settings(self, project_id: int, payload: ProductionSettings) -> ProductionSettings:
        self.get(project_id)
        with self._connect() as connection:
            connection.execute("INSERT INTO production_settings (project_id, payload, updated_at) VALUES (?, ?, ?) ON CONFLICT(project_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at", (project_id, payload.model_dump_json(), datetime.now(timezone.utc).isoformat()))
        return payload

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        return connection

    @staticmethod
    def _to_project(row: sqlite3.Row) -> Project:
        return Project(
            id=row["id"],
            title=row["title"],
            channel=row["channel"],
            status=row["status"],
            isPinned=bool(row["is_pinned"]),
            deletedAt=datetime.fromisoformat(row["deleted_at"]) if row["deleted_at"] else None,
            createdAt=datetime.fromisoformat(row["created_at"]),
            updatedAt=datetime.fromisoformat(row["updated_at"]),
        )
