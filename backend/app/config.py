"""智企通 API 配置 — 使用 pydantic-settings 从环境变量加载"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """全局配置 — Railway 用环境变量注入，本地从 .env 文件读取"""

    # LLM API 密钥
    GLM_API_KEY: str = ""
    KIMI_API_KEY: str = ""

    # LLM API 地址
    GLM_BASE_URL: str = "https://open.bigmodel.cn/api/paas/v4"
    KIMI_BASE_URL: str = "https://api.moonshot.cn/v1"

    # 运行模式：mock 返回预设数据，real 调用真实 API
    LLM_MODE: str = "mock"

    # CORS 允许的前端地址
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
    ]

    model_config = {
        # Railway 不用 .env 文件，直接读环境变量；本地开发时找 .env
        "env_file": str(Path(__file__).resolve().parent.parent.parent / ".env"),
        "env_file_encoding": "utf-8",
        # 环境变量优先级高于 .env 文件
        "env_file_encoding": "utf-8",
    }


# 全局单例
settings = Settings()
