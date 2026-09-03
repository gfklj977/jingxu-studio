from fastapi.testclient import TestClient

from desktop_entry import build_desktop_app


def test_desktop_app_serves_api_and_frontend(monkeypatch, tmp_path):
    data_dir = tmp_path / "profile"
    web_dir = tmp_path / "web"
    web_dir.mkdir()
    (web_dir / "index.html").write_text("<title>镜序工坊</title>", encoding="utf-8")
    monkeypatch.setenv("JINGXU_DATA_DIR", str(data_dir))
    monkeypatch.setenv("JINGXU_WEB_DIR", str(web_dir))

    with TestClient(build_desktop_app()) as client:
        assert client.get("/api/health").json()["service"] == "jingxu-api"
        assert "镜序工坊" in client.get("/").text
        assert (data_dir / "data" / "app.db").exists()
