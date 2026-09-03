from fastapi.testclient import TestClient

from app.main import create_app
from app.production import NoopProductionExecutor, PreflightProductionExecutor


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


def make_client(tmp_path, secret_store=None, provider_tester=None, production_executor=None):
    app = create_app(tmp_path / "jingxu-test.db", secret_store=secret_store or FakeSecretStore(), provider_tester=provider_tester or FakeProviderTester(), production_executor=production_executor or NoopProductionExecutor())
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
