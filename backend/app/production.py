from typing import Protocol

from .database import ProjectRepository
from .secrets import SecretStore


class ProductionExecutor(Protocol):
    def execute(self, repository: ProjectRepository, job_id: int, secrets: SecretStore) -> None: ...


class NoopProductionExecutor:
    def execute(self, repository: ProjectRepository, job_id: int, secrets: SecretStore) -> None:
        return


class PreflightProductionExecutor:
    REQUIRED_PROVIDERS = {"AUDIO": "doubao_tts", "SUBTITLES": "doubao_asr", "STORYBOARD": "seedream", "COVER": "seedream"}

    def execute(self, repository: ProjectRepository, job_id: int, secrets: SecretStore) -> None:
        job = repository.update_production_job(job_id, status="RUNNING", log="开始生产前检查")
        script = repository.get_script(job.projectId)
        if not script.content.strip():
            stage = job.stages[0].name.value if job.stages else None
            repository.update_production_job(job_id, status="FAILED", failed_stage=stage, log="前置检查失败：请先完成并保存脚本")
            return
        for stage in job.stages:
            provider = self.REQUIRED_PROVIDERS.get(stage.name.value)
            if provider and not secrets.get(provider):
                repository.update_production_job(job_id, status="FAILED", failed_stage=stage.name.value, log=f"前置检查失败：{stage.name.value} 缺少服务密钥 {provider}")
                return
        repository.update_production_job(job_id, status="QUEUED", log="前置检查通过，等待媒体执行器")
