from datetime import datetime
from enum import Enum
from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ProjectStatus(str, Enum):
    DRAFT = "DRAFT"
    PRODUCING = "PRODUCING"
    COMPLETED = "COMPLETED"


class CreateProject(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    channel: str = Field(min_length=1, max_length=60)

    @field_validator("title", "channel")
    @classmethod
    def trim_and_require_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("must contain visible text")
        return cleaned


class UpdateProject(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=120)
    channel: Optional[str] = Field(default=None, min_length=1, max_length=60)
    isPinned: Optional[bool] = None

    @field_validator("title", "channel")
    @classmethod
    def trim_optional_text(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("must contain visible text")
        return cleaned


class ProjectOrder(BaseModel):
    projectIds: List[int] = Field(min_length=1, max_length=5000)


class Project(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    channel: str
    status: ProjectStatus
    isPinned: bool
    deletedAt: Optional[datetime]
    createdAt: datetime
    updatedAt: datetime


class ScriptVersion(BaseModel):
    id: int
    content: str
    createdAt: datetime


class SaveScript(BaseModel):
    topic: str = Field(default="", max_length=200)
    brief: str = Field(default="", max_length=4000)
    researchNotes: str = Field(default="", max_length=20000)
    content: str = Field(default="", max_length=50000)

    @field_validator("topic", "brief", "researchNotes", "content")
    @classmethod
    def trim_script_text(cls, value: str) -> str:
        return value.strip()


class ProjectScript(SaveScript):
    projectId: int
    updatedAt: datetime
    versions: List[ScriptVersion]


class Pagination(BaseModel):
    page: int
    pageSize: int
    totalItems: int
    totalPages: int


T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    data: List[T]
    pagination: Pagination
