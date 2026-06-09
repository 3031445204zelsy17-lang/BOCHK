# CLAUDE.md — 智企通 MVP

## 项目
BOCHK 2026 初赛 | 智企通 GoGlobal Navigator — AI 驱动 SME 出海导航平台
仓库：https://github.com/3031445204zelsy17-lang/BOCHK
截止：2026-06-15 计划书提交

## 团队
| 成员 | 角色 |
|------|------|
| SYF (Zelsy) | 技术开发（前后端 + AI） |
| 唐一杰 | 产品 + 数据收集 + 计划书 |

## MVP 范围
- Step 1：企业画像（表单 → LLM 提取 → 卡片展示）
- Step 4：服务匹配（画像 → BOCHK 产品推荐）
- Step 5：ESG 合规缺口识别（问卷 → 法规对照 → 红黄绿报告）

## 技术栈
| 层 | 技术 |
|----|------|
| 前端 | React 18 + Vite + Tailwind CSS + shadcn/ui |
| 后端 | FastAPI (Python 3.10+) |
| 运行时 LLM | GLM-5.1 / Kimi K2.6 |
| 预处理 LLM | Claude（开发环境） |
| 数据 | JSON 索引 + MD 文件（无数据库，无 FAISS） |
| 部署 | 本地运行（截图录屏用） |

## 目录结构
```
BOCHK/
├── frontend/           # React 前端
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/         # shadcn/ui
│   │   │   ├── steps/      # Step1 + Step4 + Step5
│   │   │   ├── shared/     # CredibilityLayer, ProgressDashboard, ConfidenceTag
│   │   │   └── layout/     # Header, Sidebar
│   │   ├── pages/          # Home + Wizard
│   │   └── lib/            # api.ts + types.ts
│   └── package.json
├── backend/            # FastAPI 后端
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── services/       # llm_client, profile, matching, esg
│   │   ├── routers/        # 3 个路由
│   │   ├── parsers/        # md_parser.py
│   │   └── data/
│   │       ├── bochk_products.json
│   │       ├── mock_enterprises.json
│   │       └── esg/        # JSON 索引 + MD 详情
│   │           ├── index/  # 按国家/类型
│   │           └── details/
│   └── requirements.txt
├── demo/               # 截图 + 录屏
├── docs/               # 设计文档（从资料包复制）
├── CLAUDE.md
└── progress.json
```

## UI 设计规范
- 风格：模仿 BOCHK 官网（https://www.bochk.com）
- 主色：品牌红 `#C8102E`，hover `#B01020`
- 辅色：浅蓝 `#0071C5`、金色 `#D4AF37`
- 文字：深灰 `#333333`，无衬线系统字体
- 组件：4px 圆角，极少阴影，扁平风格
- ESG 交通灯：绿 `#22C55E` / 黄 `#EAB308` / 红 `#EF4444`
- 完整 token 见 `docs/ui-design-tokens.md`

## 当前状态
- Phase 0 全部完成（P0-1 ~ P0-4）
- 下一步：P1-1（FastAPI 骨架）+ P1-2（React 前端骨架）并行
- API Key 策略：GLM key 延后到 P2-1 填入，代码预留 Mock/真实切换
- 文档权威：本文件为准，docs/ 下旧文件中 LLM 模型名等已统一修正
- ESG 法规数据：唐一杰已有进展，到 Phase 4 时读取

## 开发规范
- 提交信息：feat/fix/docs，中文描述
- 代码注释：中文为主
- API 格式：见 docs/智企通MVP实现方案.md 第八节
- LLM 使用：Step 1/4 用 GLM-5.1，Step 5 用 Kimi K2.6，预处理用 Claude

## 核心 Harness 设计
- 预处理式知识：Claude 预处理法规 → 结构化 MD，运行时 LLM 只做匹配
- 约束式 Prompt + Few-shot 示例
- 三层可信度展示：法规原文(白) / AI判断(蓝) / AI建议(绿)
- 评分权重：E 30% / S 35% / G 35%（参考 EcoVadis）
- 双标准：目的地法规（企业端）+ BOCHK taxonomy（银行端）
- 降级策略：Step 1+4+5 基础功能必保，其他可砍

## 设计文档
完整设计文档在 `~/Desktop/智企通MVP资料包/`：
- 智企通MVP实现方案.md (v5)
- 智企通MVP开发路线图.md
- 智企通AI控制层设计报告.md
- 智企通AI控制框架.md
- 开发前思路整理.md
- 智企通产品形态说明.md (v2)
- 智企通技术难点分析.md (v2)
- ESG法规数据收集模板.md
- SME对接需求清单.md
