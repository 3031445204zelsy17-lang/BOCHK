"""智企通 GoGlobal Navigator — FastAPI 入口"""

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse
from app.config import settings
from app.routers import profile, matching, esg

app = FastAPI(
    title="智企通 GoGlobal Navigator API",
    description="AI 驱动的 SME 出海导航平台后端",
    version="0.1.0",
)

# CORS 配置 — 生产环境放宽为 "*"，本地精确控制
cors_origins = settings.CORS_ORIGINS
if os.getenv("RAILWAY_ENVIRONMENT"):
    cors_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册 API 路由（/api/* 前缀）
app.include_router(profile.router)
app.include_router(matching.router)
app.include_router(esg.router)


@app.on_event("startup")
async def startup():
    """启动时打印配置信息"""
    print(f"🚀 智企通 API 启动")
    print(f"   LLM 模式: {settings.LLM_MODE}")
    print(f"   CORS: {cors_origins}")


# ── 健康检查（专用路径，不与前端冲突） ──────────────
@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "智企通 API", "mode": settings.LLM_MODE}


# ── 静态文件托管（生产环境：前端 build 产物） ──────────────
_STATIC_DIR = Path(__file__).resolve().parent / "static"

if _STATIC_DIR.is_dir():
    # 挂载 /assets 为静态文件目录
    _assets_dir = _STATIC_DIR / "assets"
    if _assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="static-assets")

    # SPA fallback — 根路径和所有未匹配路由返回 index.html
    @app.get("/")
    @app.get("/{full_path:path}")
    async def spa_serve(full_path: str = ""):
        """返回前端页面：精确文件返回 index.html，其余也 fallback"""
        if full_path:
            file_path = _STATIC_DIR / full_path
            if file_path.is_file():
                return FileResponse(file_path)
        return FileResponse(_STATIC_DIR / "index.html")
