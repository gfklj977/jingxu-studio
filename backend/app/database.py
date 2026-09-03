import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Tuple

from .schemas import CreateProject, Project, ProjectStatus


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

    def create(self, payload: CreateProject) -> Project:
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as connection:
            cursor = connection.execute(
                """
                INSERT INTO projects (title, channel, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (payload.title, payload.channel, ProjectStatus.DRAFT.value, now, now),
            )
            row = connection.execute(
                "SELECT * FROM projects WHERE id = ?", (cursor.lastrowid,)
            ).fetchone()
        return self._to_project(row)

    def list(self, query: str, page: int, page_size: int) -> Tuple[List[Project], int]:
        normalized = query.strip()
        condition = "WHERE title LIKE ? OR channel LIKE ?" if normalized else ""
        params = (f"%{normalized}%", f"%{normalized}%") if normalized else ()
        offset = (page - 1) * page_size
        with self._connect() as connection:
            total = connection.execute(
                f"SELECT COUNT(*) FROM projects {condition}", params
            ).fetchone()[0]
            rows = connection.execute(
                f"SELECT * FROM projects {condition} ORDER BY id DESC LIMIT ? OFFSET ?",
                (*params, page_size, offset),
            ).fetchall()
        return [self._to_project(row) for row in rows], total

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
            createdAt=datetime.fromisoformat(row["created_at"]),
            updatedAt=datetime.fromisoformat(row["updated_at"]),
        )

