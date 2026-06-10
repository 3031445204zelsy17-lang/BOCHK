"""智企通 GoGlobal Navigator — FastAPI 入口"""

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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
    # Railway 部署时允许所有来源
    cors_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册 API 路由
app.include_router(profile.router)
app.include_router(matching.router)
app.include_router(esg.router)


@app.on_event("startup")
async def startup():
    """启动时打印配置信息"""
    print(f"🚀 智企通 API 启动")
    print(f"   LLM 模式: {settings.LLM_MODE}")
    print(f"   CORS: {cors_origins}")


@app.get("/api/health")
async def health():
    """健康检查（API 路径）"""
    return {"status": "ok", "service": "智企通 API", "mode": settings.LLM_MODE}


@app.get("/")
async def root():
    """根路径健康检查"""
    return {"status": "ok", "service": "智企通 API"}


# ── 静态文件托管（生产环境：前端 build 产物） ──────────────
# Railway 构建时会把 frontend/dist 复制到 backend/static
_STATIC_DIR = Path(__file__).resolve().parent / "static"
if _STATIC_DIR.is_dir():
    # 挂载静态文件到 /assets 等路径
    app.mount("/assets", StaticFiles(directory=_STATIC_DIR / "assets"), name="static-assets")

    # SPA fallback — 所有未匹配的路由返回 index.html
    from starlette.responses import FileResponse

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        """未匹配的路由返回前端 index.html（SPA 路由支持）"""
        file_path = _STATIC_DIR / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(_STATIC_DIR / "index.html")
