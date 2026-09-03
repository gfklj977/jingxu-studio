from datetime import datetime
from enum import Enum
from typing import Generic, List, TypeVar

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


class Project(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    channel: str
    status: ProjectStatus
    createdAt: datetime
    updatedAt: datetime


class Pagination(BaseModel):
    page: int
    pageSize: int
    totalItems: int
    totalPages: int


T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    data: List[T]
    pagination: Pagination

