# ── Stage 1: 构建前端 ──────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./

# 生产环境：API 同源，VITE_API_BASE 设为空字符串
ENV VITE_API_BASE=""
RUN npm run build

# ── Stage 2: Python 后端 ──────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# 安装后端依赖
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端代码
COPY backend/ ./

# 复制前端构建产物到后端 static 目录
COPY --from=frontend-builder /app/frontend/dist ./app/static

# Railway 会注入 PORT 环境变量
ENV PORT=8001
EXPOSE 8001

# 启动命令 — Railway 通过 $PORT 动态分配端口
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8001}
