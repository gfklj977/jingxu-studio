import math
import httpx
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import BackgroundTasks, FastAPI, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .database import ActiveProductionJob, InvalidProjectOrder, ProjectNotFound, ProjectRepository
from .providers import HttpProviderTester, ProviderTester
from .production import PreflightProductionExecutor, ProductionExecutor
from .schemas import CreateProject, GeneratedScript, GenerateScriptRequest, PaginatedResponse, Pagination, ProductionJob, ProductionSettings, Project, ProjectOrder, ProjectScript, ProviderCatalog, ProviderSecret, ProviderStatus, ProviderTestResult, ResearchItem, ResearchRequest, ResearchResult, SaveScript, UpdateProject
from .secrets import KeyringSecretStore, SecretStore


DEFAULT_DATA_PATH = Path.home() / "Library" / "Application Support" / "JingxuStudio" / "data" / "app.db"


PROVIDERS = [
    ("deepseek", "DeepSeek", "文本生成"),
    ("doubao_search", "豆包搜索", "联网搜索"),
    ("tavily", "Tavily", "联网搜索"),
    ("seedream", "火山方舟 Seedream", "图像生成"),
    ("apiyi", "API易 GPT-Image-2", "图像生成"),
    ("shengsuanyun", "胜算云 GPT-Image-2", "图像生成"),
    ("doubao_tts", "豆包 TTS", "语音合成"),
    ("doubao_asr", "豆包 ASR", "语音识别"),
]
PROVIDER_IDS = {item[0] for item in PROVIDERS}


def create_app(database_path: Path = DEFAULT_DATA_PATH, secret_store: Optional[SecretStore] = None, provider_tester: Optional[ProviderTester] = None, production_executor: Optional[ProductionExecutor] = None) -> FastAPI:
    repository = ProjectRepository(Path(database_path))
    secrets = secret_store or KeyringSecretStore()
    tester = provider_tester or HttpProviderTester()
    executor = production_executor or PreflightProductionExecutor()

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        repository.initialize()
        yield

    app = FastAPI(title="镜序工坊本地 API", version="0.1.0", lifespan=lifespan)
    app.state.projects = repository

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        return response

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exception: RequestValidationError):
        safe_details = [
            {"field": ".".join(map(str, error["loc"])), "message": error["msg"]}
            for error in exception.errors()
        ]
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "请求数据不符合要求",
                    "details": safe_details,
                }
            },
        )

    @app.exception_handler(ProjectNotFound)
    async def project_not_found(_: Request, __: ProjectNotFound):
        return JSONResponse(
            status_code=404,
            content={"error": {"code": "PROJECT_NOT_FOUND", "message": "项目不存在"}},
        )

    @app.exception_handler(InvalidProjectOrder)
    async def invalid_project_order(_: Request, __: InvalidProjectOrder):
        return JSONResponse(
            status_code=409,
            content={"error": {"code": "INVALID_PROJECT_ORDER", "message": "项目顺序与当前列表不一致"}},
        )

    @app.exception_handler(ActiveProductionJob)
    async def active_production_job(_: Request, __: ActiveProductionJob):
        return JSONResponse(status_code=409, content={"error": {"code": "ACTIVE_PRODUCTION_JOB", "message": "该项目已有运行中的任务"}})

    @app.get("/api/health")
    def health():
        return {"status": "ready", "service": "jingxu-api"}

    @app.get("/api/projects", response_model=PaginatedResponse[Project])
    def list_projects(
        query: str = Query(default="", max_length=120),
        page: int = Query(default=1, ge=1),
        page_size: int = Query(default=20, alias="pageSize", ge=1, le=100),
    ):
        projects, total = repository.list(query, page, page_size)
        return PaginatedResponse(
            data=projects,
            pagination=Pagination(
                page=page,
                pageSize=page_size,
                totalItems=total,
                totalPages=math.ceil(total / page_size),
            ),
        )

    @app.post("/api/projects", response_model=Project, status_code=201)
    def create_project(payload: CreateProject):
        return repository.create(payload)

    @app.put("/api/projects/order", status_code=204)
    def reorder_projects(payload: ProjectOrder):
        repository.reorder(payload.projectIds)

    @app.patch("/api/projects/{project_id}", response_model=Project)
    def update_project(project_id: int, payload: UpdateProject):
        return repository.update(project_id, payload)

    @app.delete("/api/projects/{project_id}", status_code=204)
    def trash_project(project_id: int):
        repository.trash(project_id)

    @app.get("/api/trash/projects", response_model=PaginatedResponse[Project])
    def list_trashed_projects(
        page: int = Query(default=1, ge=1),
        page_size: int = Query(default=20, alias="pageSize", ge=1, le=100),
    ):
        projects, total = repository.list_trash(page, page_size)
        return PaginatedResponse(
            data=projects,
            pagination=Pagination(
                page=page,
                pageSize=page_size,
                totalItems=total,
                totalPages=math.ceil(total / page_size),
            ),
        )

    @app.post("/api/trash/projects/{project_id}/restore", response_model=Project)
    def restore_project(project_id: int):
        return repository.restore(project_id)

    @app.get("/api/projects/{project_id}/script", response_model=ProjectScript)
    def get_project_script(project_id: int):
        return repository.get_script(project_id)

    @app.put("/api/projects/{project_id}/script", response_model=ProjectScript)
    def save_project_script(project_id: int, payload: SaveScript):
        return repository.save_script(project_id, payload)

    @app.get("/api/settings/providers", response_model=ProviderCatalog)
    def list_providers():
        return ProviderCatalog(data=[ProviderStatus(id=id_, name=name, capability=capability, status="READY" if secrets.get(id_) else "MISSING") for id_, name, capability in PROVIDERS])

    @app.put("/api/settings/providers/{provider_id}/secret", status_code=204)
    def save_provider_secret(provider_id: str, payload: ProviderSecret):
        if provider_id not in PROVIDER_IDS:
            raise HTTPException(status_code=404, detail="服务不存在")
        secrets.set(provider_id, payload.apiKey.get_secret_value())

    @app.delete("/api/settings/providers/{provider_id}/secret", status_code=204)
    def delete_provider_secret(provider_id: str):
        if provider_id not in PROVIDER_IDS:
            raise HTTPException(status_code=404, detail="服务不存在")
        secrets.delete(provider_id)

    @app.post("/api/settings/providers/{provider_id}/test", response_model=ProviderTestResult)
    def test_provider(provider_id: str):
        if provider_id not in {"deepseek", "tavily"}:
            raise HTTPException(status_code=501, detail="该服务的连接检测尚未实现")
        api_key = secrets.get(provider_id)
        if not api_key:
            return JSONResponse(status_code=409, content={"error": {"code": "PROVIDER_NOT_CONFIGURED", "message": "请先配置服务密钥"}})
        try:
            latency = tester.test(provider_id, api_key)
        except (httpx.HTTPError, ValueError):
            return JSONResponse(status_code=502, content={"error": {"code": "PROVIDER_TEST_FAILED", "message": "连接失败，请检查密钥和网络"}})
        return ProviderTestResult(status="VALID", latencyMs=latency)

    @app.post("/api/projects/{project_id}/research", response_model=ResearchResult)
    def research_project(project_id: int, payload: ResearchRequest):
        repository.get(project_id)
        api_key = secrets.get("tavily")
        if not api_key:
            return JSONResponse(status_code=409, content={"error": {"code": "PROVIDER_NOT_CONFIGURED", "message": "请先配置 Tavily"}})
        try:
            results = tester.search(api_key, payload.query)
            return ResearchResult(data=[ResearchItem(**item) for item in results])
        except (httpx.HTTPError, ValueError):
            return JSONResponse(status_code=502, content={"error": {"code": "SEARCH_FAILED", "message": "联网搜索失败"}})

    @app.post("/api/projects/{project_id}/script/generate", response_model=GeneratedScript)
    def generate_project_script(project_id: int, payload: GenerateScriptRequest):
        repository.get(project_id)
        api_key = secrets.get("deepseek")
        if not api_key:
            return JSONResponse(status_code=409, content={"error": {"code": "PROVIDER_NOT_CONFIGURED", "message": "请先配置 DeepSeek"}})
        try:
            return GeneratedScript(content=tester.generate(api_key, payload.topic, payload.brief, payload.researchNotes))
        except (httpx.HTTPError, ValueError):
            return JSONResponse(status_code=502, content={"error": {"code": "GENERATION_FAILED", "message": "脚本生成失败"}})

    @app.get("/api/projects/{project_id}/production-settings", response_model=ProductionSettings)
    def get_production_settings(project_id: int):
        return repository.get_production_settings(project_id)

    @app.put("/api/projects/{project_id}/production-settings", response_model=ProductionSettings)
    def save_production_settings(project_id: int, payload: ProductionSettings):
        return repository.save_production_settings(project_id, payload)

    @app.post("/api/projects/{project_id}/production-jobs", response_model=ProductionJob, status_code=201)
    def create_production_job(project_id: int, background_tasks: BackgroundTasks):
        job = repository.create_production_job(project_id)
        background_tasks.add_task(executor.execute, repository, job.id, secrets)
        return job

    @app.get("/api/projects/{project_id}/production-jobs/latest", response_model=ProductionJob)
    def latest_production_job(project_id: int):
        return repository.latest_production_job(project_id)

    @app.post("/api/production-jobs/{job_id}/cancel", response_model=ProductionJob)
    def cancel_production_job(job_id: int):
        return repository.cancel_production_job(job_id)

    return app


app = create_app()
