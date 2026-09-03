from fastapi.testclient import TestClient

from app.main import create_app


def make_client(tmp_path):
    app = create_app(tmp_path / "jingxu-test.db")
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
