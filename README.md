# Recall · AI 智能错题本

对应 PRD v1.0 与 UI 规格 v1.0 的 Next.js 全栈 MVP 实现。

## 技术栈

- Next.js 15 App Router + TypeScript
- Tailwind CSS + 自定义 shadcn 风格组件
- Supabase（可选，未配置时使用本地 JSON 文件演示库）
- DeepSeek API / OCR.space（可选，未配置时使用内置 Demo Provider）
- Recharts、jsPDF + html2canvas、lucide-react

## 开发规划映射

| 阶段 | 内容 | 主要交付 |
| --- | --- | --- |
| 阶段 1 | 工程初始化、认证、UI 框架 | `/login`、全局导航、侧边栏、设计 Token |
| 阶段 2 | OCR 识别录入 | `/new` 拍照/上传/粘贴、图片校验、OCR Provider |
| 阶段 3 | AI 结构化提取与归档 | 识别结果编辑、批量导入、重复提示、错题入库 |
| 阶段 4 | 错题列表、检索、看板 | 首页筛选/分页/导出、`/dashboard` 图表 |
| 阶段 5-6 | 变体复习、SM-2 计划、AI 对话、部署 | `/review`、`/plans`、`/chat`、`/help` |

## 本地运行

```bash
npm install
npm run dev
```

访问 `http://localhost:3000`。未配置 Supabase 时，使用“演示账号”即可进入，数据会写入 `data/recall-db.json`。

## 环境变量

复制 `.env.example` 为 `.env.local` 后按需填写。不填写时自动使用内置 Demo Provider，保证本地功能可演示。

## 测试文档

测试用例位于 `docs/测试用例/`，按开发阶段拆分，并包含一份《完整测试用例文档》。
