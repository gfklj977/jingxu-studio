import json

from fastapi.testclient import TestClient

from app.main import create_app
from app.production import NoopProductionExecutor, PreflightProductionExecutor


class FakeTtsSynthesizer:
    def synthesize(self, *, app_id, access_token, voice_type, text):
        assert app_id == "test-app"
        assert access_token == "test-token"
        assert voice_type == "test-voice"
        assert text == "这是一段测试脚本"
        return b"fake mp3"


class FakeAsrRecognizer:
    def recognize(self, *, app_id, access_token, audio):
        assert app_id == "asr-app"
        assert access_token == "asr-token"
        assert audio == b"existing mp3"
        return [
            {"start_time": 450, "end_time": 1530, "text": "第一句字幕。"},
            {"start_time": 1700, "end_time": 3205, "text": "第二句字幕。"},
        ]


class FakeImageGenerator:
    def generate(self, *, api_key, model, prompt, size):
        return f"image:{prompt}".encode()


class FakeVideoComposer:
    def compose(self, *, images, audio_path, subtitles_path, output_path, voice_volume, bgm_volume):
        assert len(images) == 2
        assert audio_path.name == "voice.mp3"
        assert subtitles_path.name == "captions.srt"
        assert voice_volume == 1.3
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(b"fake mp4")


class FakeSecretStore:
    def __init__(self):
        self.values = {}

    def get(self, provider_id):
        return self.values.get(provider_id)

    def set(self, provider_id, value):
        self.values[provider_id] = value

    def delete(self, provider_id):
        self.values.pop(provider_id, None)


class FakeProviderTester:
    def __init__(self):
        self.calls = []

    def test(self, provider_id, api_key):
        self.calls.append((provider_id, api_key))
        return 42

    def search(self, api_key, query):
        return [{"title": "官方资料", "url": "https://example.com/source", "content": f"{query}的资料摘要"}]

    def generate(self, api_key, topic, brief, research_notes):
        return f"生成脚本：{topic}\n{brief}\n{research_notes}"


def make_client(tmp_path, secret_store=None, provider_tester=None, production_executor=None, folder_opener=None):
    app = create_app(tmp_path / "jingxu-test.db", secret_store=secret_store or FakeSecretStore(), provider_tester=provider_tester or FakeProviderTester(), production_executor=production_executor or NoopProductionExecutor(), folder_opener=folder_opener)
    return TestClient(app)


def test_health_reports_ready(tmp_path):
    with make_client(tmp_path) as client:
        response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ready", "service": "jingxu-api"}


def test_create_project_persists_and_list_returns_newest_first(tmp_path):
    with make_client(tmp_path) as client:
        first = client.post(
            "/api/projects",
            json={"title": "第一条选题", "channel": "李逍遥说说"},
        )
        second = client.post(
            "/api/projects",
            json={"title": "第二条选题", "channel": "李逍遥说说"},
        )
        listed = client.get("/api/projects?page=1&pageSize=20")

    assert first.status_code == 201
    assert second.status_code == 201
    assert second.json()["status"] == "DRAFT"
    assert [project["title"] for project in listed.json()["data"]] == [
        "第二条选题",
        "第一条选题",
    ]
    assert listed.json()["pagination"] == {
        "page": 1,
        "pageSize": 20,
        "totalItems": 2,
        "totalPages": 1,
    }


def test_create_project_rejects_blank_and_oversized_titles(tmp_path):
    with make_client(tmp_path) as client:
        blank = client.post(
            "/api/projects", json={"title": "   ", "channel": "默认栏目"}
        )
        oversized = client.post(
            "/api/projects", json={"title": "题" * 121, "channel": "默认栏目"}
        )

    assert blank.status_code == 422
    assert blank.json()["error"]["code"] == "VALIDATION_ERROR"
    assert oversized.status_code == 422


def test_search_uses_parameters_and_matches_title(tmp_path):
    with make_client(tmp_path) as client:
        client.post(
            "/api/projects", json={"title": "AI 摄影", "channel": "知识栏目"}
        )
        client.post(
            "/api/projects", json={"title": "门店运营", "channel": "经营栏目"}
        )
        response = client.get("/api/projects?query=摄影&page=1&pageSize=20")

    assert response.status_code == 200
    assert [project["title"] for project in response.json()["data"]] == ["AI 摄影"]


def test_update_project_renames_and_pins_it(tmp_path):
    with make_client(tmp_path) as client:
        created = client.post(
            "/api/projects", json={"title": "旧标题", "channel": "默认栏目"}
        ).json()
        updated = client.patch(
            f"/api/projects/{created['id']}",
            json={"title": "新标题", "isPinned": True},
        )
        listed = client.get("/api/projects").json()["data"]

    assert updated.status_code == 200
    assert updated.json()["title"] == "新标题"
    assert updated.json()["isPinned"] is True
    assert listed[0]["id"] == created["id"]


def test_trash_hides_project_and_restore_returns_it(tmp_path):
    with make_client(tmp_path) as client:
        created = client.post(
            "/api/projects", json={"title": "待恢复项目", "channel": "默认栏目"}
        ).json()
        trashed = client.delete(f"/api/projects/{created['id']}")
        active = client.get("/api/projects").json()["data"]
        trash = client.get("/api/trash/projects").json()["data"]
        restored = client.post(f"/api/trash/projects/{created['id']}/restore")

    assert trashed.status_code == 204
    assert active == []
    assert trash[0]["title"] == "待恢复项目"
    assert restored.status_code == 200
    assert restored.json()["deletedAt"] is None


def test_reorder_projects_uses_complete_active_id_list(tmp_path):
    with make_client(tmp_path) as client:
        first = client.post(
            "/api/projects", json={"title": "甲", "channel": "默认栏目"}
        ).json()
        second = client.post(
            "/api/projects", json={"title": "乙", "channel": "默认栏目"}
        ).json()
        reordered = client.put(
            "/api/projects/order", json={"projectIds": [first["id"], second["id"]]}
        )
        listed = client.get("/api/projects").json()["data"]

    assert reordered.status_code == 204
    assert [item["id"] for item in listed] == [first["id"], second["id"]]


def test_unknown_project_returns_consistent_not_found_error(tmp_path):
    with make_client(tmp_path) as client:
        response = client.patch("/api/projects/404", json={"title": "不存在"})

    assert response.status_code == 404
    assert response.json() == {
        "error": {"code": "PROJECT_NOT_FOUND", "message": "项目不存在"}
    }


def test_save_script_persists_draft_and_creates_versions(tmp_path):
    with make_client(tmp_path) as client:
        project = client.post(
            "/api/projects", json={"title": "AI 新选题", "channel": "默认栏目"}
        ).json()
        first = client.put(
            f"/api/projects/{project['id']}/script",
            json={
                "topic": "AI 会不会取代摄影师",
                "brief": "面向摄影门店老板",
                "researchNotes": "资料摘要",
                "content": "第一版脚本",
            },
        )
        second = client.put(
            f"/api/projects/{project['id']}/script",
            json={
                "topic": "AI 会不会取代摄影师",
                "brief": "面向摄影门店老板",
                "researchNotes": "资料摘要",
                "content": "第二版脚本",
            },
        )
        loaded = client.get(f"/api/projects/{project['id']}/script")

    assert first.status_code == 200
    assert second.status_code == 200
    assert loaded.json()["content"] == "第二版脚本"
    assert [version["content"] for version in loaded.json()["versions"]] == [
        "第二版脚本",
        "第一版脚本",
    ]


def test_script_rejects_oversized_input_and_unknown_project(tmp_path):
    with make_client(tmp_path) as client:
        project = client.post(
            "/api/projects", json={"title": "脚本验证", "channel": "默认栏目"}
        ).json()
        oversized = client.put(
            f"/api/projects/{project['id']}/script",
            json={"topic": "题" * 201, "brief": "", "researchNotes": "", "content": ""},
        )
        missing = client.get("/api/projects/999/script")

    assert oversized.status_code == 422
    assert missing.status_code == 404


def test_provider_catalog_reports_reference_services_as_unconfigured(tmp_path):
    with make_client(tmp_path) as client:
        response = client.get("/api/settings/providers")

    assert response.status_code == 200
    providers = response.json()["data"]
    assert {item["id"] for item in providers} == {
        "deepseek", "doubao_search", "tavily", "seedream", "apiyi", "shengsuanyun", "doubao_tts", "doubao_asr"
    }
    assert all(item["status"] == "MISSING" for item in providers)
    assert all("apiKey" not in item for item in providers)


def test_provider_secret_can_be_saved_and_removed_without_being_returned(tmp_path):
    store = FakeSecretStore()
    with make_client(tmp_path, store) as client:
        saved = client.put("/api/settings/providers/deepseek/secret", json={"apiKey": "sk-test-safe-value"})
        configured = client.get("/api/settings/providers").json()["data"]
        removed = client.delete("/api/settings/providers/deepseek/secret")
        after_removal = client.get("/api/settings/providers").json()["data"]

    assert saved.status_code == 204
    assert next(item for item in configured if item["id"] == "deepseek")["status"] == "READY"
    assert all("apiKey" not in item for item in configured)
    assert removed.status_code == 204
    assert next(item for item in after_removal if item["id"] == "deepseek")["status"] == "MISSING"


def test_provider_secret_rejects_unknown_provider_and_invalid_key(tmp_path):
    with make_client(tmp_path) as client:
        unknown = client.put("/api/settings/providers/unknown/secret", json={"apiKey": "valid-looking-key"})
        short = client.put("/api/settings/providers/deepseek/secret", json={"apiKey": "short"})

    assert unknown.status_code == 404
    assert short.status_code == 422


def test_provider_connection_uses_stored_secret_without_exposing_it(tmp_path):
    store = FakeSecretStore()
    tester = FakeProviderTester()
    store.set("deepseek", "sk-private-test-value")
    with make_client(tmp_path, store, tester) as client:
        response = client.post("/api/settings/providers/deepseek/test")

    assert response.status_code == 200
    assert response.json() == {"status": "VALID", "latencyMs": 42}
    assert tester.calls == [("deepseek", "sk-private-test-value")]
    assert "sk-private" not in response.text


def test_provider_connection_requires_configuration(tmp_path):
    with make_client(tmp_path) as client:
        response = client.post("/api/settings/providers/tavily/test")

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "PROVIDER_NOT_CONFIGURED"


def test_project_research_and_script_generation_use_configured_providers(tmp_path):
    store = FakeSecretStore()
    store.set("tavily", "tvly-private-test")
    store.set("deepseek", "sk-private-test")
    with make_client(tmp_path, store, FakeProviderTester()) as client:
        project = client.post("/api/projects", json={"title": "AI 摄影", "channel": "默认栏目"}).json()
        research = client.post(f"/api/projects/{project['id']}/research", json={"query": "AI 摄影趋势"})
        generated = client.post(f"/api/projects/{project['id']}/script/generate", json={"topic": "AI 摄影", "brief": "面向门店", "researchNotes": "有引用的资料"})

    assert research.status_code == 200
    assert research.json()["data"][0]["url"] == "https://example.com/source"
    assert generated.status_code == 200
    assert generated.json()["content"].startswith("生成脚本：AI 摄影")


def test_research_requires_existing_project_and_configured_provider(tmp_path):
    with make_client(tmp_path) as client:
        missing_project = client.post("/api/projects/999/research", json={"query": "正常查询"})
        project = client.post("/api/projects", json={"title": "未配置", "channel": "默认栏目"}).json()
        missing_key = client.post(f"/api/projects/{project['id']}/research", json={"query": "正常查询"})

    assert missing_project.status_code == 404
    assert missing_key.status_code == 409


def test_production_settings_have_reference_defaults_and_persist(tmp_path):
    with make_client(tmp_path) as client:
        project = client.post("/api/projects", json={"title": "生产配置", "channel": "默认栏目"}).json()
        defaults = client.get(f"/api/projects/{project['id']}/production-settings")
        updated = client.put(f"/api/projects/{project['id']}/production-settings", json={
            "stages": ["AUDIO", "SUBTITLES", "VIDEO"], "resolution": "1920x1080", "fps": 30,
            "videoCodec": "H264", "audioCodec": "AAC", "voiceVolume": 1.3, "bgmVolume": 0.09,
        })

    assert defaults.status_code == 200
    assert defaults.json()["stages"] == ["AUDIO", "SUBTITLES", "STORYBOARD", "COVER", "VIDEO"]
    assert updated.status_code == 200
    assert updated.json()["voiceVolume"] == 1.3


def test_create_get_and_cancel_production_job(tmp_path):
    with make_client(tmp_path) as client:
        project = client.post("/api/projects", json={"title": "任务队列", "channel": "默认栏目"}).json()
        created = client.post(f"/api/projects/{project['id']}/production-jobs")
        duplicate = client.post(f"/api/projects/{project['id']}/production-jobs")
        cancelled = client.post(f"/api/production-jobs/{created.json()['id']}/cancel")
        loaded = client.get(f"/api/projects/{project['id']}/production-jobs/latest")

    assert created.status_code == 201
    assert created.json()["status"] == "QUEUED"
    assert len(created.json()["stages"]) == 5
    assert duplicate.status_code == 409
    assert cancelled.json()["status"] == "CANCELLED"
    assert loaded.json()["id"] == created.json()["id"]


def test_production_preflight_fails_with_actionable_log_when_script_is_empty(tmp_path):
    with make_client(tmp_path, production_executor=PreflightProductionExecutor()) as client:
        project = client.post("/api/projects", json={"title": "待生产", "channel": "默认栏目"}).json()
        created = client.post(f"/api/projects/{project['id']}/production-jobs")
        loaded = client.get(f"/api/projects/{project['id']}/production-jobs/latest")

    assert created.status_code == 201
    assert loaded.json()["status"] == "FAILED"
    assert loaded.json()["stages"][0]["status"] == "FAILED"
    assert loaded.json()["logs"] == ["开始生产前检查", "前置检查失败：请先完成并保存脚本"]


def test_audio_stage_generates_file_and_completes_before_next_stage(tmp_path):
    secret_store = FakeSecretStore()
    secret_store.set("doubao_tts", "test-token")
    executor = PreflightProductionExecutor(tts_synthesizer=FakeTtsSynthesizer())
    with make_client(tmp_path, secret_store=secret_store, production_executor=executor) as client:
        project = client.post("/api/projects", json={"title": "配音任务", "channel": "默认栏目"}).json()
        client.put(f"/api/projects/{project['id']}/script", json={"content": "这是一段测试脚本"})
        client.put(f"/api/projects/{project['id']}/production-settings", json={"stages": ["AUDIO"], "ttsAppId": "test-app", "ttsVoiceType": "test-voice"})
        client.post(f"/api/projects/{project['id']}/production-jobs")
        loaded = client.get(f"/api/projects/{project['id']}/production-jobs/latest")

    assert loaded.json()["status"] == "COMPLETED"
    assert loaded.json()["stages"][0] == {"name": "AUDIO", "status": "COMPLETED", "progress": 100}
    audio_path = tmp_path / "projects" / str(project["id"]) / "audio" / "voice.mp3"
    assert audio_path.read_bytes() == b"fake mp3"


def test_subtitle_stage_recognizes_audio_and_writes_srt(tmp_path):
    secret_store = FakeSecretStore()
    secret_store.set("doubao_asr", "asr-token")
    executor = PreflightProductionExecutor(asr_recognizer=FakeAsrRecognizer())
    with make_client(tmp_path, secret_store=secret_store, production_executor=executor) as client:
        project = client.post("/api/projects", json={"title": "字幕任务", "channel": "默认栏目"}).json()
        client.put(f"/api/projects/{project['id']}/script", json={"content": "测试脚本"})
        audio_path = tmp_path / "projects" / str(project["id"]) / "audio" / "voice.mp3"
        audio_path.parent.mkdir(parents=True)
        audio_path.write_bytes(b"existing mp3")
        client.put(f"/api/projects/{project['id']}/production-settings", json={"stages": ["SUBTITLES"], "asrAppId": "asr-app"})
        client.post(f"/api/projects/{project['id']}/production-jobs")
        loaded = client.get(f"/api/projects/{project['id']}/production-jobs/latest")

    assert loaded.json()["status"] == "COMPLETED"
    assert loaded.json()["stages"][0] == {"name": "SUBTITLES", "status": "COMPLETED", "progress": 100}
    subtitle_path = tmp_path / "projects" / str(project["id"]) / "subtitles" / "captions.srt"
    assert subtitle_path.read_text() == "1\n00:00:00,450 --> 00:00:01,530\n第一句字幕。\n\n2\n00:00:01,700 --> 00:00:03,205\n第二句字幕。\n"


def test_storyboard_stage_splits_script_and_saves_images_and_manifest(tmp_path):
    secret_store = FakeSecretStore()
    secret_store.set("seedream", "ark-key")
    executor = PreflightProductionExecutor(image_generator=FakeImageGenerator())
    with make_client(tmp_path, secret_store=secret_store, production_executor=executor) as client:
        project = client.post("/api/projects", json={"title": "分镜任务", "channel": "默认栏目"}).json()
        client.put(f"/api/projects/{project['id']}/script", json={"content": "孩子跑进阳光下的花园。妈妈蹲下拥抱孩子！"})
        client.put(f"/api/projects/{project['id']}/production-settings", json={"stages": ["STORYBOARD"], "storyboardCount": 2})
        client.post(f"/api/projects/{project['id']}/production-jobs")
        loaded = client.get(f"/api/projects/{project['id']}/production-jobs/latest")

    assert loaded.json()["status"] == "COMPLETED"
    assert loaded.json()["stages"][0] == {"name": "STORYBOARD", "status": "COMPLETED", "progress": 100}
    storyboard_dir = tmp_path / "projects" / str(project["id"]) / "storyboard"
    assert (storyboard_dir / "scene-001.png").read_bytes().startswith(b"image:")
    assert (storyboard_dir / "scene-002.png").exists()
    manifest = json.loads((storyboard_dir / "manifest.json").read_text())
    assert [item["sourceText"] for item in manifest["scenes"]] == ["孩子跑进阳光下的花园。", "妈妈蹲下拥抱孩子！"]


def test_cover_stage_generates_branded_safe_svg(tmp_path):
    secret_store = FakeSecretStore()
    secret_store.set("seedream", "ark-key")
    executor = PreflightProductionExecutor(image_generator=FakeImageGenerator())
    with make_client(tmp_path, secret_store=secret_store, production_executor=executor) as client:
        project = client.post("/api/projects", json={"title": "成长 & 陪伴", "channel": "默认栏目"}).json()
        client.put(f"/api/projects/{project['id']}/script", json={"content": "记录孩子成长中值得珍藏的瞬间。"})
        client.put(f"/api/projects/{project['id']}/production-settings", json={"stages": ["COVER"]})
        client.post(f"/api/projects/{project['id']}/production-jobs")
        loaded = client.get(f"/api/projects/{project['id']}/production-jobs/latest")

    assert loaded.json()["status"] == "COMPLETED"
    cover_dir = tmp_path / "projects" / str(project["id"]) / "cover"
    assert (cover_dir / "background.png").exists()
    svg = (cover_dir / "cover.svg").read_text()
    assert "成长 &amp; 陪伴" in svg
    assert "镜序工坊" in svg
    assert "viewBox=\"0 0 1920 1080\"" in svg


def test_video_stage_composes_existing_assets_to_mp4(tmp_path):
    executor = PreflightProductionExecutor(video_composer=FakeVideoComposer())
    with make_client(tmp_path, production_executor=executor) as client:
        project = client.post("/api/projects", json={"title": "成片任务", "channel": "默认栏目"}).json()
        client.put(f"/api/projects/{project['id']}/script", json={"content": "测试成片脚本。"})
        root = tmp_path / "projects" / str(project["id"])
        (root / "storyboard").mkdir(parents=True)
        (root / "storyboard" / "scene-001.png").write_bytes(b"one")
        (root / "storyboard" / "scene-002.png").write_bytes(b"two")
        (root / "audio").mkdir()
        (root / "audio" / "voice.mp3").write_bytes(b"audio")
        (root / "subtitles").mkdir()
        (root / "subtitles" / "captions.srt").write_text("1\n00:00:00,000 --> 00:00:04,000\n字幕\n")
        client.put(f"/api/projects/{project['id']}/production-settings", json={"stages": ["VIDEO"]})
        client.post(f"/api/projects/{project['id']}/production-jobs")
        loaded = client.get(f"/api/projects/{project['id']}/production-jobs/latest")

    assert loaded.json()["status"] == "COMPLETED"
    assert loaded.json()["stages"][0] == {"name": "VIDEO", "status": "COMPLETED", "progress": 100}
    assert (root / "video" / "final.mp4").read_bytes() == b"fake mp4"


def test_project_artifacts_are_listed_and_served_without_path_traversal(tmp_path):
    with make_client(tmp_path) as client:
        project = client.post("/api/projects", json={"title": "结果中心", "channel": "默认栏目"}).json()
        root = tmp_path / "projects" / str(project["id"])
        (root / "video").mkdir(parents=True)
        (root / "video" / "final.mp4").write_bytes(b"video-data")
        (root / "subtitles").mkdir()
        (root / "subtitles" / "captions.srt").write_text("subtitle")
        listed = client.get(f"/api/projects/{project['id']}/artifacts")
        served = client.get(f"/api/projects/{project['id']}/artifacts/video/final.mp4")
        traversal = client.get(f"/api/projects/{project['id']}/artifacts/../jingxu-test.db")

    assert listed.status_code == 200
    assert [item["path"] for item in listed.json()["data"]] == ["subtitles/captions.srt", "video/final.mp4"]
    assert listed.json()["data"][1]["kind"] == "video"
    assert served.content == b"video-data"
    assert traversal.status_code == 404


def test_single_stage_job_override_does_not_change_saved_pipeline(tmp_path):
    with make_client(tmp_path) as client:
        project = client.post("/api/projects", json={"title": "重新生成", "channel": "默认栏目"}).json()
        created = client.post(f"/api/projects/{project['id']}/production-jobs", json={"stages": ["COVER"]})
        settings = client.get(f"/api/projects/{project['id']}/production-settings")

    assert [stage["name"] for stage in created.json()["stages"]] == ["COVER"]
    assert len(settings.json()["stages"]) == 5


def test_open_project_folder_creates_directory_and_uses_system_opener(tmp_path):
    opened = []
    with make_client(tmp_path, folder_opener=opened.append) as client:
        project = client.post("/api/projects", json={"title": "打开目录", "channel": "默认栏目"}).json()
        response = client.post(f"/api/projects/{project['id']}/artifacts/open-folder")

    expected = tmp_path / "projects" / str(project["id"])
    assert response.status_code == 204
    assert expected.is_dir()
    assert opened == [expected]
