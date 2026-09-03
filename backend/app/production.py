import base64
import json
import re
import uuid
from html import escape
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


class AsrRecognizer(Protocol):
    def recognize(self, *, app_id: str, access_token: str, audio: bytes) -> list[dict]: ...


class HttpDoubaoAsrRecognizer:
    def recognize(self, *, app_id: str, access_token: str, audio: bytes) -> list[dict]:
        response = httpx.post(
            "https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash",
            headers={"X-Api-App-Key": app_id, "X-Api-Access-Key": access_token, "X-Api-Resource-Id": "volc.bigasr.auc_turbo", "X-Api-Request-Id": str(uuid.uuid4()), "X-Api-Sequence": "-1"},
            json={"user": {"uid": app_id}, "audio": {"data": base64.b64encode(audio).decode("ascii")}, "request": {"model_name": "bigmodel"}},
            timeout=120,
        )
        response.raise_for_status()
        if response.headers.get("X-Api-Status-Code") != "20000000":
            raise RuntimeError(response.headers.get("X-Api-Message") or "豆包 ASR 返回异常")
        return response.json().get("result", {}).get("utterances", [])


def _srt_timestamp(milliseconds: int) -> str:
    hours, remainder = divmod(milliseconds, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    seconds, millis = divmod(remainder, 1_000)
    return f"{hours:02}:{minutes:02}:{seconds:02},{millis:03}"


def render_srt(utterances: list[dict]) -> str:
    blocks = [f"{index}\n{_srt_timestamp(item['start_time'])} --> {_srt_timestamp(item['end_time'])}\n{item['text']}" for index, item in enumerate(utterances, 1)]
    return "\n\n".join(blocks) + "\n"


class ImageGenerator(Protocol):
    def generate(self, *, api_key: str, model: str, prompt: str, size: str) -> bytes: ...


class HttpSeedreamImageGenerator:
    def generate(self, *, api_key: str, model: str, prompt: str, size: str) -> bytes:
        response = httpx.post(
            "https://ark.cn-beijing.volces.com/api/v3/images/generations",
            headers={"Authorization": f"Bearer {api_key}"},
            json={"model": model, "prompt": prompt, "size": size, "sequential_image_generation": "disabled", "stream": False, "response_format": "url", "watermark": False},
            timeout=180,
        )
        response.raise_for_status()
        data = response.json().get("data", [])
        if not data or not data[0].get("url"):
            raise RuntimeError("Seedream 未返回图片")
        image_response = httpx.get(data[0]["url"], timeout=120)
        image_response.raise_for_status()
        return image_response.content


def build_storyboard(script: str, count: int) -> list[dict]:
    sentences = [part.strip() for part in re.findall(r"[^。！？!?\n]+[。！？!?]?", script) if part.strip()]
    scenes = sentences[:count]
    if not scenes:
        return []
    return [{"index": index, "sourceText": text, "prompt": f"电影感纪实摄影，16:9横构图，自然光，人物一致，真实细节，无文字无水印。画面内容：{text}"} for index, text in enumerate(scenes, 1)]


def build_cover_svg(title: str, background: bytes) -> str:
    safe_title = escape(title)
    encoded = base64.b64encode(background).decode("ascii")
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <image href="data:image/png;base64,{encoded}" width="1920" height="1080" preserveAspectRatio="xMidYMid slice"/>
  <rect width="1920" height="1080" fill="url(#shade)"/>
  <defs><linearGradient id="shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#07111F" stop-opacity=".9"/><stop offset=".72" stop-color="#07111F" stop-opacity=".12"/></linearGradient></defs>
  <rect x="120" y="186" width="10" height="120" rx="5" fill="#F3B640"/>
  <text x="168" y="280" fill="#FFFFFF" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="96" font-weight="700">{safe_title}</text>
  <text x="168" y="870" fill="#F3B640" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="34" font-weight="600" letter-spacing="8">镜序工坊</text>
  <text x="168" y="925" fill="#FFFFFF" opacity=".78" font-family="sans-serif" font-size="25" letter-spacing="3">JINGXU STUDIO</text>
</svg>'''


class PreflightProductionExecutor:
    REQUIRED_PROVIDERS = {"AUDIO": "doubao_tts", "SUBTITLES": "doubao_asr", "STORYBOARD": "seedream", "COVER": "seedream"}

    def __init__(self, tts_synthesizer: Optional[TtsSynthesizer] = None, asr_recognizer: Optional[AsrRecognizer] = None, image_generator: Optional[ImageGenerator] = None):
        self.tts_synthesizer = tts_synthesizer or HttpDoubaoTtsSynthesizer()
        self.asr_recognizer = asr_recognizer or HttpDoubaoAsrRecognizer()
        self.image_generator = image_generator or HttpSeedreamImageGenerator()

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
            elif stage.name.value == "SUBTITLES":
                audio_path = repository.database_path.parent / "projects" / str(job.projectId) / "audio" / "voice.mp3"
                if not settings.asrAppId.strip():
                    repository.update_production_job(job_id, status="FAILED", failed_stage="SUBTITLES", log="前置检查失败：请填写豆包 ASR AppID")
                    return
                if not audio_path.exists():
                    repository.update_production_job(job_id, status="FAILED", failed_stage="SUBTITLES", log="字幕生成失败：缺少配音文件 voice.mp3")
                    return
                repository.update_production_job(job_id, status="RUNNING", stage_name="SUBTITLES", stage_status="RUNNING", progress=10, log="正在识别配音并生成字幕")
                try:
                    utterances = self.asr_recognizer.recognize(app_id=settings.asrAppId, access_token=secrets.get("doubao_asr") or "", audio=audio_path.read_bytes())
                    if not utterances:
                        raise RuntimeError("未识别到有效语音")
                    output = repository.database_path.parent / "projects" / str(job.projectId) / "subtitles" / "captions.srt"
                    output.parent.mkdir(parents=True, exist_ok=True)
                    output.write_text(render_srt(utterances), encoding="utf-8")
                    repository.update_production_job(job_id, status="RUNNING", stage_name="SUBTITLES", stage_status="COMPLETED", progress=100, log=f"字幕已保存：{output}")
                except Exception as error:
                    repository.update_production_job(job_id, status="FAILED", failed_stage="SUBTITLES", log=f"字幕生成失败：{error}")
                    return
            elif stage.name.value == "STORYBOARD":
                scenes = build_storyboard(script.content, settings.storyboardCount)
                repository.update_production_job(job_id, status="RUNNING", stage_name="STORYBOARD", stage_status="RUNNING", progress=5, log=f"已拆分 {len(scenes)} 个分镜，开始生成图片")
                output = repository.database_path.parent / "projects" / str(job.projectId) / "storyboard"
                output.mkdir(parents=True, exist_ok=True)
                try:
                    for index, scene in enumerate(scenes, 1):
                        image = self.image_generator.generate(api_key=secrets.get("seedream") or "", model=settings.seedreamModel, prompt=scene["prompt"], size="2K")
                        (output / f"scene-{index:03}.png").write_bytes(image)
                        progress = round(index / len(scenes) * 100)
                        repository.update_production_job(job_id, status="RUNNING", stage_name="STORYBOARD", stage_status="RUNNING" if index < len(scenes) else "COMPLETED", progress=progress, log=f"分镜 {index}/{len(scenes)} 已生成")
                    (output / "manifest.json").write_text(json.dumps({"model": settings.seedreamModel, "scenes": scenes}, ensure_ascii=False, indent=2), encoding="utf-8")
                except Exception as error:
                    repository.update_production_job(job_id, status="FAILED", failed_stage="STORYBOARD", log=f"分镜生成失败：{error}")
                    return
            elif stage.name.value == "COVER":
                project = repository.get(job.projectId)
                prompt = f"电影感纪实摄影封面背景，16:9横构图，主体位于画面右侧，左侧留出干净深色标题空间，无文字无标志。主题：{project.title}。内容参考：{script.content[:160]}"
                repository.update_production_job(job_id, status="RUNNING", stage_name="COVER", stage_status="RUNNING", progress=10, log="正在生成封面背景")
                output = repository.database_path.parent / "projects" / str(job.projectId) / "cover"
                output.mkdir(parents=True, exist_ok=True)
                try:
                    background = self.image_generator.generate(api_key=secrets.get("seedream") or "", model=settings.seedreamModel, prompt=prompt, size="2K")
                    (output / "background.png").write_bytes(background)
                    (output / "cover.svg").write_text(build_cover_svg(project.title, background), encoding="utf-8")
                    (output / "manifest.json").write_text(json.dumps({"title": project.title, "brand": "镜序工坊", "model": settings.seedreamModel, "prompt": prompt}, ensure_ascii=False, indent=2), encoding="utf-8")
                    repository.update_production_job(job_id, status="RUNNING", stage_name="COVER", stage_status="COMPLETED", progress=100, log=f"品牌封面已保存：{output / 'cover.svg'}")
                except Exception as error:
                    repository.update_production_job(job_id, status="FAILED", failed_stage="COVER", log=f"封面生成失败：{error}")
                    return
            elif stage.name.value != "VIDEO":
                repository.update_production_job(job_id, status="QUEUED", log=f"{stage.name.value} 等待媒体执行器")
                return
        repository.update_production_job(job_id, status="COMPLETED", log="生产任务已完成")
