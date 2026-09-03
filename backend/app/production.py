import base64
import uuid
from typing import Optional, Protocol

import httpx

from .database import ProjectRepository
from .secrets import SecretStore


class ProductionExecutor(Protocol):
    def execute(self, repository: ProjectRepository, job_id: int, secrets: SecretStore) -> None: ...


class NoopProductionExecutor:
    def execute(self, repository: ProjectRepository, job_id: int, secrets: SecretStore) -> None:
        return


class TtsSynthesizer(Protocol):
    def synthesize(self, *, app_id: str, access_token: str, voice_type: str, text: str) -> bytes: ...


class HttpDoubaoTtsSynthesizer:
    def synthesize(self, *, app_id: str, access_token: str, voice_type: str, text: str) -> bytes:
        response = httpx.post(
            "https://openspeech.bytedance.com/api/v1/tts",
            headers={"Authorization": f"Bearer; {access_token}"},
            json={"app": {"appid": app_id, "token": access_token, "cluster": "volcano_tts"}, "user": {"uid": "jingxu-studio"}, "audio": {"voice_type": voice_type, "encoding": "mp3", "speed_ratio": 1.0}, "request": {"reqid": str(uuid.uuid4()), "text": text, "operation": "query"}},
            timeout=120,
        )
        response.raise_for_status()
        payload = response.json()
        if payload.get("code") != 3000 or not payload.get("data"):
            raise RuntimeError(payload.get("message") or "豆包 TTS 返回异常")
        return base64.b64decode(payload["data"])


class PreflightProductionExecutor:
    REQUIRED_PROVIDERS = {"AUDIO": "doubao_tts", "SUBTITLES": "doubao_asr", "STORYBOARD": "seedream", "COVER": "seedream"}

    def __init__(self, tts_synthesizer: Optional[TtsSynthesizer] = None):
        self.tts_synthesizer = tts_synthesizer or HttpDoubaoTtsSynthesizer()

    def execute(self, repository: ProjectRepository, job_id: int, secrets: SecretStore) -> None:
        job = repository.update_production_job(job_id, status="RUNNING", log="开始生产前检查")
        script = repository.get_script(job.projectId)
        if not script.content.strip():
            stage = job.stages[0].name.value if job.stages else None
            repository.update_production_job(job_id, status="FAILED", failed_stage=stage, log="前置检查失败：请先完成并保存脚本")
            return
        settings = repository.get_production_settings(job.projectId)
        for stage in job.stages:
            provider = self.REQUIRED_PROVIDERS.get(stage.name.value)
            if provider and not secrets.get(provider):
                repository.update_production_job(job_id, status="FAILED", failed_stage=stage.name.value, log=f"前置检查失败：{stage.name.value} 缺少服务密钥 {provider}")
                return
            if stage.name.value == "AUDIO":
                if not settings.ttsAppId.strip() or not settings.ttsVoiceType.strip():
                    repository.update_production_job(job_id, status="FAILED", failed_stage="AUDIO", log="前置检查失败：请填写豆包 AppID 和音色 ID")
                    return
                repository.update_production_job(job_id, status="RUNNING", stage_name="AUDIO", stage_status="RUNNING", progress=10, log="正在生成配音")
                try:
                    audio = self.tts_synthesizer.synthesize(app_id=settings.ttsAppId, access_token=secrets.get("doubao_tts") or "", voice_type=settings.ttsVoiceType, text=script.content)
                    output = repository.database_path.parent / "projects" / str(job.projectId) / "audio" / "voice.mp3"
                    output.parent.mkdir(parents=True, exist_ok=True)
                    output.write_bytes(audio)
                    repository.update_production_job(job_id, status="RUNNING", stage_name="AUDIO", stage_status="COMPLETED", progress=100, log=f"配音已保存：{output}")
                except Exception as error:
                    repository.update_production_job(job_id, status="FAILED", failed_stage="AUDIO", log=f"配音生成失败：{error}")
                    return
            elif stage.name.value != "VIDEO":
                repository.update_production_job(job_id, status="QUEUED", log=f"{stage.name.value} 等待媒体执行器")
                return
        repository.update_production_job(job_id, status="COMPLETED", log="生产任务已完成")
