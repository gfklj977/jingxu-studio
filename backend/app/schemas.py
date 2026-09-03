from datetime import datetime
from enum import Enum
from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, Field, SecretStr, field_validator


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


class ProviderStatus(BaseModel):
    id: str
    name: str
    capability: str
    status: str


class ProviderCatalog(BaseModel):
    data: List[ProviderStatus]


class ProviderSecret(BaseModel):
    apiKey: SecretStr = Field(min_length=8, max_length=500)


class ProviderTestResult(BaseModel):
    status: str
    latencyMs: int


class ResearchRequest(BaseModel):
    query: str = Field(min_length=2, max_length=300)


class ResearchItem(BaseModel):
    title: str = Field(max_length=500)
    url: str = Field(max_length=2000)
    content: str = Field(max_length=4000)


class ResearchResult(BaseModel):
    data: List[ResearchItem]


class GenerateScriptRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=200)
    brief: str = Field(default="", max_length=4000)
    researchNotes: str = Field(default="", max_length=20000)


class GeneratedScript(BaseModel):
    content: str = Field(max_length=50000)


class ProductionStage(str, Enum):
    AUDIO = "AUDIO"
    SUBTITLES = "SUBTITLES"
    STORYBOARD = "STORYBOARD"
    COVER = "COVER"
    VIDEO = "VIDEO"


class ProductionSettings(BaseModel):
    stages: List[ProductionStage] = [ProductionStage.AUDIO, ProductionStage.SUBTITLES, ProductionStage.STORYBOARD, ProductionStage.COVER, ProductionStage.VIDEO]
    resolution: str = Field(default="1920x1080", pattern="^(1920x1080)$")
    fps: int = Field(default=30, ge=24, le=60)
    videoCodec: str = Field(default="H264", pattern="^H264$")
    audioCodec: str = Field(default="AAC", pattern="^AAC$")
    voiceVolume: float = Field(default=1.3, ge=0, le=2)
    bgmVolume: float = Field(default=0.09, ge=0, le=1)
    ttsAppId: str = ""
    ttsVoiceType: str = "zh_male_M392_conversation_wvae_bigtts"
    asrAppId: str = ""


class ProductionJobStage(BaseModel):
    name: ProductionStage
    status: str = "PENDING"
    progress: int = 0


class ProductionJob(BaseModel):
    id: int
    projectId: int
    status: str
    stages: List[ProductionJobStage]
    logs: List[str] = []
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
