"""智企通 GoGlobal Navigator — FastAPI 入口"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import profile, matching, esg

app = FastAPI(
    title="智企通 GoGlobal Navigator API",
    description="AI 驱动的 SME 出海导航平台后端",
    version="0.1.0",
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(profile.router)
app.include_router(matching.router)
app.include_router(esg.router)


@app.on_event("startup")
async def startup():
    """启动时打印配置信息"""
    print(f"🚀 智企通 API 启动")
    print(f"   LLM 模式: {settings.LLM_MODE}")
    print(f"   CORS: {settings.CORS_ORIGINS}")


@app.get("/")
async def root():
    """健康检查"""
    return {"status": "ok", "service": "智企通 API"}
