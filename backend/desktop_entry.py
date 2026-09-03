import os
from pathlib import Path

import uvicorn
from fastapi.staticfiles import StaticFiles

from app.main import create_app


def build_desktop_app():
    data_dir = Path(os.environ["JINGXU_DATA_DIR"])
    web_dir = Path(os.environ["JINGXU_WEB_DIR"])
    application = create_app(data_dir / "data" / "app.db")
    application.mount("/", StaticFiles(directory=web_dir, html=True), name="desktop-web")
    return application


if __name__ == "__main__":
    uvicorn.run(build_desktop_app(), host="127.0.0.1", port=int(os.environ["JINGXU_PORT"]), log_level="warning")
